import type { Express } from "express";
import { createServer, type Server } from "http";
import { businessDetailsSchema, onboardingSubmissionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { scrapeAndProcessWebsite } from "./services/webscraper";
import { createVapiAssistant } from "./services/vapi";
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { createKnowledgeBaseFile, uploadKnowledgeBaseToVapi, updateAssistantWithKnowledgeBase, updateAssistantWithMultipleKnowledgeBaseFiles } from './services/vapi';
import { analyticsService } from './services/analytics';
import { googleCalendarService } from './services/calendar';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Sentiment analysis function for call logs
async function processSentimentForCall(callId: string, tenantId: string, transcript: any): Promise<void> {
  try {
    if (!transcript || !openai) {
      return;
    }

    // Extract text from transcript
    let transcriptText = '';
    if (typeof transcript === 'string') {
      transcriptText = transcript;
    } else if (transcript && Array.isArray(transcript)) {
      transcriptText = transcript.map(t => t.text || t.content || '').join(' ');
    } else if (transcript && typeof transcript === 'object') {
      transcriptText = transcript.text || transcript.content || JSON.stringify(transcript);
    }

    if (!transcriptText || transcriptText.length < 10) {
      return;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment of this call transcript and extract key topics. Respond with valid JSON in this exact format:
{
  "sentiment_score": <number 0-100>,
  "sentiment_label": "<positive|neutral|negative>",
  "key_topics": ["topic1", "topic2", "topic3"]
}

Sentiment scoring:
- 70-100: positive (customer satisfied, issue resolved, positive interaction)
- 40-69: neutral (informational, mixed sentiment, routine interaction)
- 0-39: negative (customer frustrated, issue unresolved, poor experience)`
        },
        {
          role: 'user',
          content: `Analyze this call transcript: ${transcriptText.substring(0, 2000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const analysisText = response.choices[0]?.message?.content?.trim();
    if (!analysisText) return;

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse sentiment analysis response:', parseError);
      return;
    }

    // Validate and insert sentiment analysis
    const sentimentScore = Math.max(0, Math.min(100, analysis.sentiment_score || 50));
    let sentimentLabel = analysis.sentiment_label || 'neutral';
    if (!['positive', 'neutral', 'negative'].includes(sentimentLabel)) {
      sentimentLabel = sentimentScore >= 70 ? 'positive' : sentimentScore >= 40 ? 'neutral' : 'negative';
    }

    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await dbPool.query(`
        INSERT INTO call_sentiment_analysis (
          call_id, tenant_id, sentiment_score, sentiment_label, key_topics
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (call_id) DO NOTHING
      `, [
        callId,
        tenantId,
        sentimentScore,
        sentimentLabel,
        JSON.stringify(analysis.key_topics || [])
      ]);
    } finally {
      await dbPool.end();
    }

  } catch (error) {
    console.error(`Error analyzing sentiment for call ${callId}:`, error);
  }
}

// Helper function to create a calendar event
async function createCalendarEvent(accessToken: string, eventData: {
  fullName: string;
  email: string;
  startDateTime: string;
  timeZone: string;
  description: string;
  tenantId?: string;
  assistantId?: string;
  calendarId?: string;
}): Promise<string> {
  const google = await import('googleapis');
  
  // Create OAuth client with the access token
  const oauth2Client = new google.google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const calendar = google.google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Calculate end time (30 minutes after start)
  const startDate = new Date(eventData.startDateTime);
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 30);
  
  const event: any = {
    summary: `Appointment with ${eventData.fullName}`,
    description: eventData.description,
    start: {
      dateTime: eventData.startDateTime,
      timeZone: eventData.timeZone
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: eventData.timeZone
    },
    attendees: [
      { email: eventData.email }
    ],
    reminders: {
      useDefault: true
    }
  };

  // Add metadata if both tenantId and assistantId are provided
  if (eventData.tenantId && eventData.assistantId) {
    event.extendedProperties = {
      private: {
        booked_by: "assistant",
        tenant_id: eventData.tenantId,
        assistant_id: eventData.assistantId
      }
    };
    console.log('Added assistant metadata to calendar event:', {
      tenant_id: eventData.tenantId,
      assistant_id: eventData.assistantId
    });
  } else {
    console.log('No metadata added - missing tenantId or assistantId:', {
      tenantId: eventData.tenantId,
      assistantId: eventData.assistantId
    });
  }
  
  try {
    console.log('Creating calendar event:', JSON.stringify(event, null, 2));
    const calendarId = eventData.calendarId || 'primary';
    console.log('Using calendar ID:', calendarId);
    
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all' // Send email invitations
    });
    
    console.log('Event created with ID:', response.data.id);
    return response.data.id || '';
    
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new Error('Failed to create calendar event');
  }
}

// Helper function to find available calendar slots
async function findAvailableSlots(accessToken: string, startDate: Date, calendarId: string = 'primary'): Promise<string[]> {
  const google = await import('googleapis');
  
  // Create OAuth client with the access token
  const oauth2Client = new google.google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const calendar = google.google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Set up time range for availability check (check next 7 days)
  const timeMin = new Date(startDate);
  const timeMax = new Date(startDate);
  timeMax.setDate(timeMax.getDate() + 7);
  
  try {
    console.log('Checking availability for calendar:', calendarId);
    // Get busy times from the specified calendar
    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: 'Europe/London',
        items: [{ id: calendarId }]
      }
    });
    
    const busyTimes = freeBusyResponse.data.calendars?.[calendarId]?.busy || [];
    console.log('Busy times found for calendar', calendarId, ':', busyTimes);
    
    // Generate potential 30-minute slots (9 AM to 5 PM, weekdays only)
    const availableSlots: string[] = [];
    const currentDate = new Date(startDate);
    
    // Start checking from today or the specified date
    if (currentDate < new Date()) {
      currentDate.setTime(new Date().getTime());
    }
    
    // Look for slots over the next 7 days
    for (let dayOffset = 0; dayOffset < 7 && availableSlots.length < 3; dayOffset++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      // Skip weekends
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Check slots from 9 AM to 5 PM (30-minute intervals)
      for (let hour = 9; hour < 17 && availableSlots.length < 3; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (availableSlots.length >= 3) break;
          
          const slotStart = new Date(checkDate);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + 30);
          
          // Skip past times
          if (slotStart < new Date()) continue;
          
          // Check if this slot conflicts with any busy time
          const isSlotBusy = busyTimes.some(busyTime => {
            const busyStart = new Date(busyTime.start!);
            const busyEnd = new Date(busyTime.end!);
            
            // Check for any overlap
            return slotStart < busyEnd && slotEnd > busyStart;
          });
          
          if (!isSlotBusy) {
            // Format in Europe/London timezone with proper ISO format
            const londonTime = slotStart.toLocaleString('sv-SE', { 
              timeZone: 'Europe/London' 
            });
            const formattedSlot = `${londonTime.replace(' ', 'T')}+01:00`;
            availableSlots.push(formattedSlot);
          }
        }
      }
    }
    
    console.log('Generated available slots:', availableSlots);
    return availableSlots;
    
  } catch (error: any) {
    console.error('Error checking calendar availability:', error?.message || error);
    
    // Check if it's a Google API permission error
    if (error?.code === 403 && error?.message?.includes('Calendar API')) {
      console.error('Google Calendar API not enabled. Please enable it in Google Cloud Console.');
    }
    
    return [];
  }
}
import bcrypt from 'bcrypt';
import session from 'express-session';
import { z } from 'zod';

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userEmail: string;
    userName: string;
  }
}

// Authentication schemas
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});

// Analytics processing is now handled by the centralized AnalyticsService
// which queries existing call_logs and appointments tables without external API calls

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup session management
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

  // Signup route
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password } = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM tenants WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const result = await pool.query(
        `INSERT INTO tenants (id, email, name, password, "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, true, NOW(), NOW()) 
         RETURNING id, email, name`,
        [randomUUID(), email, name, hashedPassword]
      );
      
      const user = result.rows[0];
      
      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).userEmail = user.email;
      (req.session as any).userName = user.name;
      
      res.json({ 
        message: 'Account created successfully',
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user
      const result = await pool.query(
        'SELECT id, email, name, password, "isActive" FROM tenants WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const user = result.rows[0];
      
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).userEmail = user.email;
      (req.session as any).userName = user.name;
      
      res.json({ 
        message: 'Login successful',
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Get current user route
  app.get('/api/auth/user', (req: any, res) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.json({
      id: (req.session as any).userId,
      email: (req.session as any).userEmail,
      name: (req.session as any).userName
    });
  });

  // Update profile route
  app.patch('/api/auth/update-profile', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if email is already taken by another user
      const emailCheck = await pool.query(
        'SELECT id FROM tenants WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email address is already in use' });
      }

      // Update user profile
      const result = await pool.query(
        `UPDATE tenants 
         SET name = $1, email = $2, "updatedAt" = NOW() 
         WHERE id = $3 
         RETURNING id, email, name`,
        [name, email, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedUser = result.rows[0];

      // Update session
      (req.session as any).userEmail = updatedUser.email;
      (req.session as any).userName = updatedUser.name;

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Change password route
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }

      // Get current user
      const userResult = await pool.query(
        'SELECT password FROM tenants WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await pool.query(
        `UPDATE tenants 
         SET password = $1, "updatedAt" = NOW() 
         WHERE id = $2`,
        [hashedNewPassword, userId]
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get assistants for authenticated user
  app.get('/api/assistants', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const assistantPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const result = await assistantPool.query(
          `SELECT id, "tenantId" as tenant_id, "vapiAssistantId" as vapi_assistant_id, 
                  name, voice, "isActive" as is_active, business_name, industry, 
                  location, "createdAt" as created_at, kb_configured, prompt_updated,
                  system_prompt, first_message, instructions,
                  COALESCE(appointment_booking_enabled, false) as appointment_booking_enabled
           FROM assistants 
           WHERE "tenantId" = $1 
           ORDER BY "createdAt" DESC`,
          [userId]
        );
        
        // Convert PostgreSQL boolean strings to JavaScript booleans
        const assistants = result.rows.map(row => ({
          ...row,
          appointment_booking_enabled: row.appointment_booking_enabled === true || row.appointment_booking_enabled === 't',
          is_active: row.is_active === true || row.is_active === 't',
          kb_configured: row.kb_configured === true || row.kb_configured === 't',
          prompt_updated: row.prompt_updated === true || row.prompt_updated === 't'
        }));
        
        res.json(assistants);
      } finally {
        await assistantPool.end();
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
      res.status(500).json({ message: 'Failed to fetch assistants' });
    }
  });

  // Get assistants with business information for authenticated user
  app.get('/api/assistants-with-business', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const assistantPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const result = await assistantPool.query(
          `SELECT 
             a.id, 
             a."tenantId" as tenant_id, 
             a."vapiAssistantId" as vapi_assistant_id, 
             a.name, 
             a.voice, 
             a."isActive" as is_active, 
             a.business_name, 
             a.industry, 
             a.location, 
             a."createdAt" as created_at,
             a.kb_configured, 
             a.prompt_updated,
             a.system_prompt, 
             a.first_message, 
             a.instructions,
             COALESCE(a.appointment_booking_enabled, false) as appointment_booking_enabled,
             bi.id as business_info_id,
             bi."businessName" as business_info_name,
             bi.industry as business_info_industry,
             bi.website as business_info_website,
             bi.location as business_info_location,
             bi.description as business_info_description,
             bi."contactEmail" as business_info_contact_email,
             bi."contactPhone" as business_info_contact_phone,
             bi."businessHours" as business_info_hours,
             bi.services as business_info_services,
             bi."appointmentSettings" as business_info_appointment_settings,
             bi."createdAt" as business_info_created_at
           FROM assistants a
           LEFT JOIN business_info bi ON a."tenantId" = bi."tenantId" 
             AND LOWER(a.business_name) = LOWER(bi."businessName")
           WHERE a."tenantId" = $1 
           ORDER BY a."createdAt" DESC`,
          [userId]
        );
        
        // Group assistants and combine with business info
        const assistantsWithBusiness = result.rows.map(row => ({
          id: row.id,
          tenant_id: row.tenant_id,
          vapi_assistant_id: row.vapi_assistant_id,
          name: row.name,
          voice: row.voice,
          is_active: row.is_active === true || row.is_active === 't',
          business_name: row.business_name,
          industry: row.industry,
          location: row.location,
          created_at: row.created_at,
          kb_configured: row.kb_configured === true || row.kb_configured === 't',
          prompt_updated: row.prompt_updated === true || row.prompt_updated === 't',
          system_prompt: row.system_prompt,
          first_message: row.first_message,
          instructions: row.instructions,
          appointment_booking_enabled: row.appointment_booking_enabled === true || row.appointment_booking_enabled === 't',
          businessInfo: row.business_info_id ? {
            id: row.business_info_id,
            businessName: row.business_info_name,
            industry: row.business_info_industry,
            website: row.business_info_website,
            location: row.business_info_location,
            description: row.business_info_description,
            contactEmail: row.business_info_contact_email,
            contactPhone: row.business_info_contact_phone,
            businessHours: row.business_info_hours,
            services: row.business_info_services,
            appointmentSettings: row.business_info_appointment_settings,
            createdAt: row.business_info_created_at
          } : null
        }));
        
        res.json(assistantsWithBusiness);
      } finally {
        await assistantPool.end();
      }
    } catch (error) {
      console.error('Error fetching assistants with business info:', error);
      res.status(500).json({ message: 'Failed to fetch assistants with business information' });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 800 * 1024, // 800KB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept various file types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json'
      ];
      
      if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(txt|md|csv|json)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Please upload PDF, DOC, DOCX, TXT, MD, CSV, or JSON files.'));
      }
    }
  });



  // Get knowledge base data for a tenant filtered by business name
  app.get("/api/knowledge-base/:tenantId/:businessName", async (req, res) => {
    try {
      const { tenantId, businessName } = req.params;
      const decodedBusinessName = decodeURIComponent(businessName);
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      const pg = await import('pg');
      const dbPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

      try {
        // Get raw content files filtered by business name
        const filesResult = await dbPool.query(
          `SELECT file_sequence, vapi_file_id, file_name, content_size, pages_included, created_at
           FROM kb_files WHERE tenant_id = $1 AND business_name = $2 ORDER BY file_sequence ASC`,
          [tenantId, decodedBusinessName]
        );

        const rawContentFiles = filesResult.rows.map(row => ({
          ...row,
          file_type: 'raw_content',
          display_name: row.file_name,
          size_kb: Math.round(row.content_size / 1024),
          pages_count: (() => {
            try {
              const pages = typeof row.pages_included === 'string' ? JSON.parse(row.pages_included) : row.pages_included || [];
              return Array.isArray(pages) ? pages.length : 0;
            } catch (e) {
              return 0;
            }
          })()
        }));

        res.json(rawContentFiles);
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base data" });
    }
  });

  // Get knowledge base data for a tenant (legacy endpoint)
  app.get("/api/knowledge-base/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      const pg = await import('pg');
      const dbPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

      try {
        // Get raw content files from new kb_files table
        const filesResult = await dbPool.query(
          `SELECT file_sequence, vapi_file_id, file_name, content_size, pages_included, created_at
           FROM kb_files WHERE tenant_id = $1 ORDER BY file_sequence ASC`,
          [tenantId]
        );

        // Get any legacy entries from old kb_entries table
        const legacyEntriesResult = await dbPool.query(
          `SELECT chunk_id, page_url, title, content, tags, confidence, source, created_at 
           FROM kb_entries WHERE tenant_id = $1 ORDER BY created_at DESC`,
          [tenantId]
        );

        // Convert files to display format
        const rawContentFiles = filesResult.rows.map(file => {
          let pagesCount = 0;
          try {
            const pages = typeof file.pages_included === 'string' ? JSON.parse(file.pages_included) : file.pages_included || [];
            pagesCount = Array.isArray(pages) ? pages.length : 0;
          } catch (e) {
            console.warn('Failed to parse pages_included for file:', file.file_name);
          }
          
          return {
            chunk_id: file.vapi_file_id,
            page_url: null,
            title: file.file_name || `Knowledge Base File ${file.file_sequence}`,
            content: `Raw content file (${Math.round(file.content_size / 1024)}KB) covering ${pagesCount} pages`,
            tags: ['raw_content'],
            confidence: 1.0,
            source: 'website_scraper',
            created_at: file.created_at,
            file_type: 'raw_content',
            file_sequence: file.file_sequence,
            pages_count: pagesCount
          };
        });

        // Convert legacy entries to display format
        const legacyEntries = legacyEntriesResult.rows.map(entry => ({
          ...entry,
          file_type: 'legacy_chunk'
        }));

        const response = [...rawContentFiles, ...legacyEntries];

        res.json(response);
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base data" });
    }
  });

  // Quick Setup Scraping Route
  app.post("/api/quick-setup/scrape", requireAuth, async (req: any, res) => {
    try {
      const { website_url, business_name } = req.body;
      const tenant_id = (req.session as any).userId;
      
      if (!website_url || !business_name) {
        return res.status(400).json({ 
          message: "website_url and business_name are required" 
        });
      }

      console.log(`Starting website scraping for ${business_name} at ${website_url}`);
      
      // Use authenticated user's tenant ID
      const validTenantId = tenant_id;
      
      // Scrape and process website content  
      const scrapingResult = await scrapeAndProcessWebsite(website_url, validTenantId, business_name, 'Business');
      
      if (scrapingResult.status !== 'success') {
        return res.status(500).json({ 
          message: "Failed to process website content",
          error: scrapingResult.error 
        });
      }

      // Get knowledge base files from database (raw content approach)
      const kbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const kbResult = await kbPool.query(
          `SELECT file_sequence, vapi_file_id, file_name, content_size, pages_included
           FROM kb_files 
           WHERE tenant_id = $1 AND vapi_file_id IS NOT NULL
           ORDER BY file_sequence ASC`,
          [validTenantId]
        );

        if (kbResult.rows.length === 0) {
          return res.status(400).json({ message: "No knowledge base files created from website" });
        }

        console.log(`Found ${kbResult.rows.length} knowledge base files for tenant ${validTenantId}`);

        // Get file IDs for response
        const fileIds = kbResult.rows.map(row => row.vapi_file_id);
        const totalSize = kbResult.rows.reduce((sum, row) => sum + row.content_size, 0);
        const totalPages = kbResult.rows.reduce((sum, row) => {
          try {
            const pages = typeof row.pages_included === 'string' ? JSON.parse(row.pages_included) : row.pages_included || [];
            return sum + (Array.isArray(pages) ? pages.length : 0);
          } catch (e) {
            console.warn('Failed to parse pages_included for row:', row.file_sequence);
            return sum;
          }
        }, 0);

        res.json({
          success: true,
          fileIds: fileIds,
          filesCount: kbResult.rows.length,
          totalSize: Math.round(totalSize / 1024), // Size in KB
          pagesProcessed: totalPages,
          tenantId: validTenantId,
          message: `Website content processed and uploaded to VAPI successfully (${kbResult.rows.length} files)`
        });

      } finally {
        await kbPool.end();
      }

    } catch (error) {
      console.error("Error in quick setup scraping:", error);
      res.status(500).json({ message: "Failed to process website content" });
    }
  });

  // Quick Setup Assistant Creation Route
  app.post("/api/quick-setup/create-assistant", requireAuth, async (req: any, res) => {
    try {
      const { 
        business_name, 
        business_type, 
        primary_location, 
        agent_name, 
        agent_role,
        knowledgeBaseFileId
      } = req.body;
      const tenant_id = (req.session as any).userId;

      if (!business_name || !business_type || !primary_location || !agent_name || !agent_role) {
        return res.status(400).json({ 
          message: "All fields are required: business_name, business_type, primary_location, agent_name, agent_role" 
        });
      }

      // Use authenticated user's tenant ID
      const validTenantId = tenant_id;

      // Get knowledge base file IDs from new raw content system
      let knowledge_base_file_ids: string[] = [];
      
      if (!knowledgeBaseFileId) {
        // Get all knowledge base files for this tenant
        const fileIdPool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        try {
          const fileIdResult = await fileIdPool.query(
            `SELECT vapi_file_id FROM kb_files WHERE tenant_id = $1 AND business_name = $2 AND vapi_file_id IS NOT NULL ORDER BY file_sequence`,
            [validTenantId, business_name]
          );
          
          if (fileIdResult.rows.length > 0) {
            knowledge_base_file_ids = fileIdResult.rows.map(row => row.vapi_file_id);
            console.log(`Retrieved ${knowledge_base_file_ids.length} VAPI file IDs from database for tenant ${validTenantId}`);
          }
        } finally {
          await fileIdPool.end();
        }
      } else {
        // Handle legacy single file ID or new array format
        knowledge_base_file_ids = Array.isArray(knowledgeBaseFileId) ? knowledgeBaseFileId : [knowledgeBaseFileId];
        console.log(`Using provided knowledge base file IDs: ${knowledge_base_file_ids.join(', ')}`);
      }

      // Create VAPI assistant with knowledge base file
      const assistantData = {
        business_name,
        business_type,
        primary_location,
        agent_name,
        agent_role
      };

      // Pass the first file ID for backwards compatibility, then update with all files after creation
      const primaryFileId = knowledge_base_file_ids.length > 0 ? knowledge_base_file_ids[0] : undefined;
      const vapiResponse = await createVapiAssistant(assistantData, undefined, primaryFileId, business_type);
      
      if (!vapiResponse.success || !vapiResponse.assistant) {
        return res.status(500).json({ 
          message: "Failed to create VAPI assistant",
          error: vapiResponse.error 
        });
      }

      // If we have multiple knowledge base files, update the assistant with all of them
      if (knowledge_base_file_ids.length > 1) {
        console.log(`Updating assistant with ${knowledge_base_file_ids.length} knowledge base files...`);
        const updateSuccess = await updateAssistantWithMultipleKnowledgeBaseFiles(vapiResponse.assistant.id, knowledge_base_file_ids);
        if (!updateSuccess) {
          console.warn('Failed to update assistant with multiple knowledge base files, but continuing...');
        }
      }

      // Extract the system prompt that was sent to VAPI
      const systemPrompt = vapiResponse.assistant.model?.messages?.[0]?.content || 
                          vapiResponse.assistant.instructions || 
                          `You are ${agent_name}, the virtual receptionist for ${business_name}, a ${business_type} located in ${primary_location}`;
      
      const firstMessage = vapiResponse.assistant.firstMessage || 
                          `Hello! I'm ${agent_name} from ${business_name}. How can I help you today?`;

      // Store assistant in database with tenant creation in single transaction
      const assistantRecord = {
        id: randomUUID(),
        tenant_id: validTenantId,
        vapi_assistant_id: vapiResponse.assistant.id,
        name: agent_name,
        voice: agent_name, // Store the voice name (Chloe, Mark, Meghan, William)
        is_active: true,
        business_name,
        industry: business_type,
        location: primary_location,
        created_at: new Date(),
        updated_at: new Date()
      };

      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await dbPool.connect();
      
      try {
        // Use a transaction to ensure assistant is created properly
        await client.query('BEGIN');
        console.log('Database transaction started');
        
        // Verify tenant exists (should already exist from signup)
        const tenantExists = await client.query(
          'SELECT id FROM tenants WHERE id = $1',
          [validTenantId]
        );
        
        if (tenantExists.rows.length === 0) {
          throw new Error('Tenant not found. Please sign up first.');
        }
        
        console.log(`Verified tenant exists: ${validTenantId}`);
        
        // Create the assistant with complete business information and prompt
        await client.query(
          `INSERT INTO assistants (id, "tenantId", "vapiAssistantId", name, voice, "isActive", instructions, 
                                  business_name, industry, location, first_message, system_prompt, 
                                  last_synced_at, prompt_updated, kb_configured, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            assistantRecord.id,
            assistantRecord.tenant_id,
            assistantRecord.vapi_assistant_id,
            assistantRecord.name,
            assistantRecord.voice,
            assistantRecord.is_active,
            `AI Assistant for ${business_name}`,
            business_name,
            business_type,
            primary_location,
            firstMessage,
            systemPrompt,
            new Date(),
            true, // prompt_updated
            knowledge_base_file_ids.length > 0, // kb_configured
            assistantRecord.created_at,
            assistantRecord.updated_at
          ]
        );
        
        console.log(`Assistant record created: ${assistantRecord.id}`);
        
        // Check if business_info already exists for this tenant
        const existingBusinessInfo = await client.query(
          'SELECT id, "businessName" FROM business_info WHERE "tenantId" = $1',
          [validTenantId]
        );
        
        if (existingBusinessInfo.rows.length === 0) {
          // Create new business_info record only if none exists
          const businessInfoId = randomUUID();
          await client.query(
            `INSERT INTO business_info (id, "tenantId", "businessName", industry, location, description, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              businessInfoId,
              validTenantId,
              business_name,
              business_type,
              primary_location,
              `${business_type} business located in ${primary_location}`,
              new Date(),
              new Date()
            ]
          );
          console.log(`Business info record created: ${businessInfoId}`);
        } else {
          // Preserve existing business_info record - do not overwrite
          console.log(`Business info preserved for tenant: ${validTenantId}, keeping existing business: ${existingBusinessInfo.rows[0].businessName}`);
        }
        
        await client.query('COMMIT');
        console.log(`Assistant created successfully: ${assistantRecord.id}`);

        res.json({
          success: true,
          assistant: assistantRecord,
          message: "Assistant created successfully"
        });

      } catch (dbError: any) {
        await client.query('ROLLBACK');
        console.error("Database transaction failed:", dbError);
        console.error("DB Error message:", dbError.message);
        console.error("DB Error stack:", dbError.stack);
        throw dbError;
      } finally {
        client.release();
        await dbPool.end();
      }

    } catch (error: any) {
      console.error("Error creating assistant:", error);
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
      res.status(500).json({ 
        message: "Failed to create assistant",
        error: error.message,
        stack: error.stack 
      });
    }
  });

  // Get assistants for a tenant (dashboard endpoint)
  app.get("/api/assistants/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const result = await dbPool.query(
          `SELECT a.id, a."vapiAssistantId" as vapi_assistant_id, a.name, a.voice, a."isActive" as is_active,
                  a."createdAt" as created_at, a."tenantId" as tenant_id,
                  a.business_name, a.industry, a.location, a.first_message, a.system_prompt, a.last_synced_at,
                  COALESCE(a.appointment_booking_enabled, false) as appointment_booking_enabled,
                  COALESCE(kb_count.count, 0) > 0 as kb_configured,
                  false as calendar_connected,
                  true as prompt_updated
           FROM assistants a
           LEFT JOIN (
             SELECT tenant_id, COUNT(*) as count 
             FROM kb_entries 
             GROUP BY tenant_id
           ) kb_count ON kb_count.tenant_id = a."tenantId"
           WHERE a."tenantId" = $1
           ORDER BY a."createdAt" DESC`,
          [tenantId]
        );

        // Extract business info from assistant record for dashboard display
        const assistants = result.rows.map(row => ({
          ...row,
          // Convert PostgreSQL boolean strings to JavaScript booleans
          appointment_booking_enabled: row.appointment_booking_enabled === true || row.appointment_booking_enabled === 't',
          kb_configured: row.kb_configured === true || row.kb_configured === 't',
          calendar_connected: row.calendar_connected === true || row.calendar_connected === 't',
          prompt_updated: row.prompt_updated === true || row.prompt_updated === 't',
          is_active: row.is_active === true || row.is_active === 't',
          business_name: row.name?.split(' - ')[0] || 'Unknown Business',
          industry: 'Service Business',
          location: 'UK'
        }));

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json(assistants);
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      console.error("Error fetching assistants:", error);
      res.status(500).json({ message: "Failed to fetch assistants" });
    }
  });

  // Get single assistant for a tenant 
  app.get("/api/assistant/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const result = await dbPool.query(
          `SELECT a.id, a."vapiAssistantId" as vapi_assistant_id, a.name, a.voice, a."isActive" as is_active,
                  a."createdAt" as created_at, a."tenantId" as tenant_id,
                  a.business_name, a.industry, a.location, a.first_message, a.system_prompt, a.last_synced_at
           FROM assistants a
           WHERE a."tenantId" = $1 
           ORDER BY a."createdAt" DESC
           LIMIT 1`,
          [tenantId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "No assistant found for this tenant" });
        }

        const assistant = result.rows[0];

        res.json(assistant);
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      console.error("Error fetching assistant:", error);
      res.status(500).json({ message: "Failed to fetch assistant" });
    }
  });

  // Get business info for a tenant (dashboard endpoint)
  app.get("/api/business/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        // Extract business info from tenant and assistant data
        const result = await dbPool.query(
          `SELECT t.name as business_name, a.name as assistant_name,
                  COALESCE(kb_count.count, 0) as knowledge_entries
           FROM tenants t
           LEFT JOIN assistants a ON a."tenantId" = t.id
           LEFT JOIN (
             SELECT tenant_id, COUNT(*) as count 
             FROM kb_entries 
             GROUP BY tenant_id
           ) kb_count ON kb_count.tenant_id = t.id
           WHERE t.id = $1
           LIMIT 1`,
          [tenantId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Business not found" });
        }

        const businessInfo = {
          businessName: result.rows[0].business_name,
          industry: 'Service Business',
          location: 'UK',
          knowledgeEntriesCount: result.rows[0].knowledge_entries || 0
        };

        res.json(businessInfo);
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      console.error("Error fetching business info:", error);
      res.status(500).json({ message: "Failed to fetch business info" });
    }
  });





  // Sync knowledge base to VAPI
  app.post("/api/knowledge-base/:tenantId/sync-to-vapi", async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      // Get assistant for this tenant
      const assistantPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const assistantResult = await assistantPool.query(
          `SELECT "vapiAssistantId" as vapi_assistant_id, name as business_name FROM assistants WHERE "tenantId" = $1`,
          [tenantId]
        );

        if (assistantResult.rows.length === 0) {
          return res.status(404).json({ message: "No assistant found for this tenant" });
        }

        const { vapi_assistant_id, business_name } = assistantResult.rows[0];

        // Get knowledge base entries
        const kbResult = await assistantPool.query(
          `SELECT id, title, content, source, created_at, tags, confidence, page_url
           FROM kb_entries 
           WHERE tenant_id = $1 
           ORDER BY created_at DESC`,
          [tenantId]
        );

        if (kbResult.rows.length === 0) {
          return res.status(400).json({ message: "No knowledge base entries found" });
        }

        // Create and upload knowledge base file
        const fileContent = await createKnowledgeBaseFile(kbResult.rows, business_name);
        const timestamp = Date.now();
        const fileName = `${business_name.replace(/[^a-zA-Z0-9]/g, '_')}_knowledge_base_${timestamp}.txt`;
        const knowledgeBase = await uploadKnowledgeBaseToVapi(fileContent, fileName);
        
        if (!knowledgeBase) {
          return res.status(500).json({ error: "Failed to upload knowledge base to VAPI" });
        }

        // Update assistant with new knowledge base file
        const updateSuccess = await updateAssistantWithKnowledgeBase(vapi_assistant_id, knowledgeBase.id);
        
        if (!updateSuccess) {
          return res.status(500).json({ error: "Failed to update assistant with knowledge base" });
        }

        res.json({
          success: true,
          message: "Knowledge base synced to VAPI successfully",
          knowledgeBaseId: knowledgeBase.id,
          fileName: fileName,
          fileSizeKB: Math.round(fileContent.length / 1024),
          entriesCount: kbResult.rows.length
        });

      } finally {
        await assistantPool.end();
      }
    } catch (error) {
      console.error("Error syncing knowledge base to VAPI:", error);
      res.status(500).json({ message: "Failed to sync knowledge base to VAPI" });
    }
  });

  // Industries endpoint for frontend dropdown
  app.get('/api/industries', async (req, res) => {
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    try {
      const result = await dbPool.query(
        'SELECT industry, display_name FROM industry_prompts ORDER BY display_name'
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching industries:', error);
      res.status(500).json({ error: 'Failed to fetch industries' });
    } finally {
      await dbPool.end();
    }
  });

  // Public widget configuration endpoint
  app.post('/api/public-widget-config', async (req, res) => {
    // Cache control headers (CORS handled by global middleware)
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    
    try {
      const { tenantId, assistantId } = req.body;
      console.log('Widget config request:', { tenantId, assistantId, origin: req.headers.origin });
      
      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenantId' });
      }
      
      // assistantId is optional for backward compatibility

      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        let result;
        
        if (assistantId) {
          // Fetch specific assistant by VAPI assistant ID
          result = await dbPool.query(
            `SELECT a."vapiAssistantId" as vapi_assistant_id, a.name, a."isActive" as is_active
             FROM assistants a
             WHERE a."tenantId" = $1 AND a."vapiAssistantId" = $2 AND a."isActive" = true`,
            [tenantId, assistantId]
          );
        } else {
          // Fallback to most recent assistant
          result = await dbPool.query(
            `SELECT a."vapiAssistantId" as vapi_assistant_id, a.name, a."isActive" as is_active
             FROM assistants a
             WHERE a."tenantId" = $1 AND a."isActive" = true
             ORDER BY a."createdAt" DESC
             LIMIT 1`,
            [tenantId]
          );
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Assistant not found or inactive' });
        }

        const assistant = result.rows[0];

        return res.json({
          assistantId: assistant.vapi_assistant_id,
          apiKey: process.env.VAPI_PUBLIC_KEY || process.env.VAPI_API_KEY,
          config: {
            assistantName: assistant.name
          }
        });
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      console.error('Error fetching widget config:', error);
      res.status(500).json({ error: 'Failed to fetch widget configuration' });
    }
  });

  // File upload endpoint for knowledge base
  app.post('/api/knowledge-base/upload-file', upload.single('file'), async (req, res) => {
    try {
      const { tenantId, businessName, vapiAssistantId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!tenantId || !businessName || !vapiAssistantId) {
        return res.status(400).json({ error: 'Missing required parameters: tenantId, businessName, vapiAssistantId' });
      }

      console.log(`Uploading file: ${file.originalname} (${file.size} bytes) for tenant ${tenantId}`);

      // Create file content as buffer/string for VAPI upload
      const fileContent = file.buffer.toString('utf-8');
      const timestamp = Date.now();
      const fileName = `${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}_${timestamp}`;

      // Upload file directly to VAPI as-is (no processing)
      const knowledgeBase = await uploadKnowledgeBaseToVapi(fileContent, fileName);
      
      if (!knowledgeBase) {
        return res.status(500).json({ error: 'Failed to upload file to VAPI' });
      }

      console.log(`File uploaded successfully to VAPI: ${knowledgeBase.id}`);

      // Save file metadata to database and update specific assistant
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        // Get the next file sequence number for this business
        const sequenceResult = await dbPool.query(
          `SELECT COALESCE(MAX(file_sequence), 0) + 1 as next_sequence 
           FROM kb_files WHERE tenant_id = $1 AND business_name = $2`,
          [tenantId, businessName]
        );
        
        const nextSequence = sequenceResult.rows[0]?.next_sequence || 1;

        // Save file metadata to kb_files table with business name
        await dbPool.query(
          `INSERT INTO kb_files (tenant_id, business_name, file_sequence, vapi_file_id, file_name, content_size, pages_included)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, businessName, nextSequence, knowledgeBase.id, fileName, file.size, JSON.stringify(['manual_upload'])]
        );

        console.log(`File metadata saved to database for business: ${businessName}`);
        
        // Get all knowledge base files for this business to update assistant with complete file list
        const allFilesResult = await dbPool.query(
          `SELECT vapi_file_id FROM kb_files 
           WHERE tenant_id = $1 AND business_name = $2 AND vapi_file_id IS NOT NULL
           ORDER BY file_sequence ASC`,
          [tenantId, businessName]
        );
        
        const allFileIds = allFilesResult.rows.map(row => row.vapi_file_id);
        
        // Update the specific assistant with all knowledge base files
        const updateSuccess = await updateAssistantWithMultipleKnowledgeBaseFiles(vapiAssistantId, allFileIds);
        
        if (updateSuccess) {
          console.log(`Assistant ${vapiAssistantId} updated with ${allFileIds.length} knowledge base files`);
        } else {
          console.warn(`Failed to update assistant ${vapiAssistantId} with knowledge base files`);
        }

        res.json({
          success: true,
          fileId: knowledgeBase.id,
          fileName: file.originalname,
          message: 'File uploaded and added to knowledge base successfully'
        });

      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ 
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Update specific assistant configuration and sync to VAPI
  // GET single assistant by VAPI ID
  app.get('/api/assistants/:assistantId', requireAuth, async (req: any, res) => {
    try {
      const { assistantId } = req.params;
      const userId = (req.session as any).userId;
      
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        const result = await dbPool.query(
          `SELECT id, "tenantId" as tenant_id, "vapiAssistantId" as vapi_assistant_id, 
                  name, voice, "isActive" as is_active, business_name, industry, 
                  location, "createdAt" as created_at, kb_configured, prompt_updated,
                  system_prompt, first_message, instructions,
                  COALESCE(appointment_booking_enabled, false) as appointment_booking_enabled
           FROM assistants 
           WHERE "vapiAssistantId" = $1 AND "tenantId" = $2`,
          [assistantId, userId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Assistant not found' });
        }
        
        res.json(result.rows[0]);
      } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Database error' });
      } finally {
        dbPool.end();
      }
    } catch (error) {
      console.error('Error fetching assistant:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/assistant/:assistantId/update', async (req, res) => {
    try {
      const { assistantId } = req.params;
      const { name, voice, first_message, system_prompt, appointment_booking_enabled } = req.body;

      if (!name || !system_prompt) {
        return res.status(400).json({ error: 'Name and system prompt are required' });
      }

      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        // Get current assistant with business information using vapi assistant ID
        const assistantResult = await dbPool.query(
          `SELECT "vapiAssistantId" as vapi_assistant_id, business_name, name as agent_name, "tenantId" as tenant_id 
           FROM assistants WHERE "vapiAssistantId" = $1`,
          [assistantId]
        );

        if (assistantResult.rows.length === 0) {
          return res.status(404).json({ error: 'Assistant not found' });
        }

        const vapiAssistantId = assistantResult.rows[0].vapi_assistant_id;
        const businessName = assistantResult.rows[0].business_name;
        const agentName = assistantResult.rows[0].agent_name;
        const tenantId = assistantResult.rows[0].tenant_id;

        // First, fetch current assistant configuration from VAPI to preserve knowledge base
        console.log(`Fetching current assistant configuration from VAPI: ${vapiAssistantId}`);
        
        const currentAssistantResponse = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        let existingKnowledgeBase = null;
        if (currentAssistantResponse.ok) {
          const currentAssistant = await currentAssistantResponse.json();
          existingKnowledgeBase = currentAssistant.model?.knowledgeBase || null;
          console.log('Existing knowledge base:', existingKnowledgeBase);
        } else {
          console.warn('Failed to fetch current assistant configuration, proceeding without preserving knowledge base');
        }

        // Update VAPI assistant with preserved knowledge base
        // Use consistent naming format: "Business Name - Agent Name"
        const consistentName = `${businessName} - ${agentName}`;
        const vapiUpdatePayload: any = {
          name: consistentName,
          firstMessage: first_message,
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: system_prompt
              }
            ]
          }
        };

        // Preserve existing knowledge base if it exists
        if (existingKnowledgeBase) {
          vapiUpdatePayload.model.knowledgeBase = existingKnowledgeBase;
          console.log('Preserving existing knowledge base with files:', existingKnowledgeBase.fileIds?.length || 0);
        }

        if (voice) {
          vapiUpdatePayload.voice = {
            provider: "11labs",
            voiceId: voice
          };
        }

        console.log(`Updating VAPI assistant ${vapiAssistantId} with preserved knowledge base`);

        const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(vapiUpdatePayload)
        });

        if (!vapiResponse.ok) {
          const errorText = await vapiResponse.text();
          console.error('VAPI update failed:', errorText);
          return res.status(500).json({ error: 'Failed to update VAPI assistant', details: errorText });
        }

        console.log('VAPI assistant updated successfully with preserved knowledge base');

        // Update database with new configuration (don't update first_message unless specifically provided)
        if (first_message !== undefined && first_message !== null) {
          await dbPool.query(
            `UPDATE assistants 
             SET name = $1, voice = $2, first_message = $3, "systemPrompt" = $4, 
                 "appointmentBookingEnabled" = $5,
                 last_synced_at = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "vapiAssistantId" = $6`,
            [name, voice || 'sarah', first_message, system_prompt, appointment_booking_enabled || false, vapiAssistantId]
          );
        } else {
          // Only update fields that are specifically provided, preserve first_message
          await dbPool.query(
            `UPDATE assistants 
             SET name = $1, voice = $2, "systemPrompt" = $3, 
                 "appointmentBookingEnabled" = $4,
                 last_synced_at = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "vapiAssistantId" = $5`,
            [name, voice || 'sarah', system_prompt, appointment_booking_enabled || false, vapiAssistantId]
          );
        }

        console.log('Database updated successfully');

        res.json({
          success: true,
          message: 'Assistant updated and synced to VAPI successfully'
        });

      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Error updating assistant:', error);
      res.status(500).json({ 
        error: 'Failed to update assistant',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Update appointment booking toggle state
  app.post('/api/assistant/:assistantId/toggle-booking', async (req, res) => {
    try {
      const { assistantId } = req.params;
      const { enabled, updated_prompt } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled field must be a boolean' });
      }

      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        // Update both the appointment_booking_enabled field and the system_prompt if provided
        let result;
        if (updated_prompt) {
          result = await dbPool.query(
            `UPDATE assistants 
             SET appointment_booking_enabled = $1, system_prompt = $2, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "vapiAssistantId" = $3
             RETURNING "vapiAssistantId", appointment_booking_enabled, system_prompt`,
            [enabled, updated_prompt, assistantId]
          );
        } else {
          result = await dbPool.query(
            `UPDATE assistants 
             SET appointment_booking_enabled = $1, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "vapiAssistantId" = $2
             RETURNING "vapiAssistantId", appointment_booking_enabled`,
            [enabled, assistantId]
          );
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Assistant not found' });
        }

        console.log(`Appointment booking ${enabled ? 'enabled' : 'disabled'} for assistant ${assistantId}`);
        if (updated_prompt) {
          console.log('System prompt updated in database during toggle');
        }

        res.json({
          success: true,
          appointment_booking_enabled: enabled,
          message: `Appointment booking ${enabled ? 'enabled' : 'disabled'} successfully`
        });

      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Error updating appointment booking toggle:', error);
      res.status(500).json({ 
        error: 'Failed to update appointment booking toggle',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Test endpoint to verify server accessibility
  app.get('/api/test', (req, res) => {
    console.log('=== TEST ENDPOINT HIT ===');
    console.log('Host:', req.headers.host);
    console.log('Time:', new Date().toISOString());
    res.json({ 
      message: 'Server is accessible',
      host: req.headers.host,
      timestamp: new Date().toISOString()
    });
  });

  // Test calendar availability endpoint with mock data
  app.post('/api/calendar/availability/test', (req, res) => {
    console.log('=== CALENDAR AVAILABILITY TEST ===');
    console.log('Request body:', req.body);
    
    // Return mock available slots for testing VAPI integration
    const mockSlots = [
      "2025-06-20T09:00:00+01:00",
      "2025-06-20T11:30:00+01:00", 
      "2025-06-20T14:00:00+01:00"
    ];
    
    res.json({ slots: mockSlots });
  });

  // Google Calendar OAuth endpoints
  app.get('/api/oauth/google/init', requireAuth, async (req, res) => {
    try {
      const tenantId = (req.session as any).userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const authUrl = googleCalendarService.getAuthUrl(tenantId);
      console.log('=== OAUTH INIT ===');
      console.log('Generated OAuth URL:', authUrl);
      console.log('Expected redirect URI:', `https://${process.env.REPLIT_DEV_DOMAIN}/api/oauth/google/callback`);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google OAuth init error:', error);
      res.status(500).json({ error: 'Failed to initialize Google OAuth' });
    }
  });

  app.get('/api/oauth/google/callback', async (req, res) => {
    console.log('=== GOOGLE OAUTH CALLBACK ENDPOINT HIT ===');
    console.log('Current time:', new Date().toISOString());
    console.log('Request URL:', req.url);
    console.log('Request query params:', req.query);
    console.log('Request headers host:', req.headers.host);
    console.log('Request method:', req.method);
    
    try {
      console.log('Google OAuth callback received:', req.query);
      const { code, state: tenantId, error } = req.query;

      // Handle OAuth errors (user denied access, etc.)
      if (error) {
        console.error('OAuth error:', error);
        return res.redirect('/dashboard?tab=calendar&error=oauth-denied');
      }

      if (!code || !tenantId) {
        console.error('Missing parameters - code:', !!code, 'tenantId:', !!tenantId);
        return res.status(400).json({ error: 'Missing authorization code or tenant ID' });
      }

      console.log('Exchanging code for tokens...');
      // Exchange code for tokens
      const tokenData = await googleCalendarService.exchangeCodeForTokens(code as string, tenantId as string);
      
      console.log('Storing credentials...');
      // Store credentials securely
      await googleCalendarService.storeCredentials(tenantId as string, tokenData);

      // Create or verify assistant calendar exists
      if (tokenData.userEmail) {
        console.log('Creating/verifying assistant calendar...');
        try {
          const calendarId = await googleCalendarService.getAssistantCalendarId(tenantId as string, tokenData.userEmail);
          console.log('Assistant calendar ready:', calendarId);
        } catch (error) {
          console.error('Error setting up assistant calendar:', error);
          // Don't fail the OAuth flow if calendar creation fails
        }
      }

      // Initialize appointment_booking_enabled field for all assistants if not exists
      const assistantPool = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        await assistantPool.query(
          `UPDATE assistants 
           SET appointment_booking_enabled = COALESCE(appointment_booking_enabled, false)
           WHERE "tenantId" = $1 AND appointment_booking_enabled IS NULL`,
          [tenantId]
        );
      } finally {
        await assistantPool.end();
      }

      console.log('Google Calendar connected successfully');
      // Redirect back to dashboard calendar page with success
      res.redirect('/dashboard?tab=calendar&success=google-connected');
    } catch (error: any) {
      console.error('=== GOOGLE OAUTH CALLBACK ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.constructor?.name);
      console.error('Error message:', error?.message || 'No message available');
      console.error('Full error object:', error);
      console.error('Error stack:', error?.stack || 'No stack trace available');
      res.redirect('/dashboard?tab=calendar&error=connection-failed');
    }
  });

  // Helper function to add 30 minutes to a datetime string
  function add30Minutes(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    date.setMinutes(date.getMinutes() + 30);
    return date.toISOString();
  }

  // Calendar booking webhook for VAPI
  app.post('/api/calendar/book', async (req, res) => {
    console.log('=== CALENDAR BOOKING WEBHOOK ===');
    console.log('Request body:', req.body);
    
    try {
      const { 
        tenantId: rawTenantId, 
        assistantId, 
        fullName, 
        email, 
        startDateTime, 
        timeZone, 
        description 
      } = req.body;
      
      // Validate required fields
      if (!rawTenantId || !fullName || !email || !startDateTime) {
        console.error('Missing required fields for booking');
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: tenantId, fullName, email, startDateTime' 
        });
      }
      
      // Clean the tenant ID
      const tenantId = rawTenantId.trim();
      console.log('Processing booking for tenant:', tenantId);
      console.log('Assistant ID for metadata:', assistantId);
      
      // Check if tenant has Google Calendar connected
      const credentials = await googleCalendarService.getCredentials(tenantId);
      if (!credentials || !credentials.isConnected) {
        console.log('No Google Calendar credentials found for tenant:', tenantId);
        return res.status(400).json({ 
          success: false, 
          error: 'Google Calendar not connected for this user' 
        });
      }
      
      // Get valid access token
      const accessToken = await googleCalendarService.getValidAccessToken(tenantId);
      if (!accessToken) {
        console.log('Unable to get valid access token for tenant:', tenantId);
        return res.status(500).json({ 
          success: false, 
          error: 'Unable to access calendar' 
        });
      }

      // Get or create assistant calendar using the proper reuse logic
      let calendarId = 'primary'; // fallback to primary calendar
      
      if (credentials.userEmail) {
        try {
          console.log('Getting/creating assistant calendar for booking...');
          calendarId = await googleCalendarService.getAssistantCalendarId(tenantId, credentials.userEmail);
          console.log('Using assistant calendar:', calendarId);
        } catch (error) {
          console.error('Failed to get/create assistant calendar, using primary:', error);
        }
      }
      
      // Create calendar event
      const eventId = await createCalendarEvent(accessToken, {
        fullName,
        email,
        startDateTime,
        timeZone: timeZone || 'Europe/London',
        description: description || `Appointment with ${fullName}`,
        tenantId: tenantId,
        assistantId: assistantId,
        calendarId: calendarId
      });
      
      console.log('Calendar event created successfully:', eventId);
      res.json({ success: true, eventId });
      
    } catch (error) {
      console.error('Calendar booking error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create calendar appointment' 
      });
    }
  });

  // Calendar availability webhook for VAPI
  app.post('/api/calendar/availability', async (req, res) => {
    console.log('=== CALENDAR AVAILABILITY WEBHOOK ===');
    console.log('Request body:', req.body);
    
    try {
      const { tenantId: rawTenantId, assistantId, preferredDate } = req.body;
      
      if (!rawTenantId) {
        console.error('Missing tenantId in availability request');
        return res.status(400).json({ error: 'Missing tenantId' });
      }
      
      // Clean the tenant ID (remove any whitespace/tabs)
      const tenantId = rawTenantId.trim();
      console.log('Cleaned tenantId:', tenantId);
      
      // Check if tenant has Google Calendar connected
      console.log('Looking up credentials for tenant:', tenantId);
      const credentials = await googleCalendarService.getCredentials(tenantId);
      console.log('Credentials result:', credentials);
      
      if (!credentials || !credentials.isConnected) {
        console.log('No Google Calendar credentials found for tenant:', tenantId);
        return res.json({ slots: [] });
      }
      
      console.log('Found valid credentials for tenant:', tenantId);
      
      // Get valid access token
      const accessToken = await googleCalendarService.getValidAccessToken(tenantId);
      if (!accessToken) {
        console.log('Unable to get valid access token for tenant:', tenantId);
        return res.json({ slots: [] });
      }
      
      // Get or create assistant calendar using the proper reuse logic
      let calendarId = 'primary'; // fallback to primary calendar
      
      if (credentials.userEmail) {
        try {
          console.log('Getting/creating assistant calendar for availability...');
          calendarId = await googleCalendarService.getAssistantCalendarId(tenantId, credentials.userEmail);
          console.log('Using assistant calendar for availability:', calendarId);
        } catch (error) {
          console.error('Failed to get/create assistant calendar, using primary:', error);
        }
      }

      // Get availability for the requested date (or today if not specified)
      const checkDate = preferredDate ? new Date(preferredDate) : new Date();
      console.log('Checking availability for date:', checkDate.toISOString());
      
      // Find next 3 available 30-minute slots starting from the requested date
      const availableSlots = await findAvailableSlots(accessToken, checkDate, calendarId);
      
      console.log('Found available slots:', availableSlots);
      res.json({ slots: availableSlots });
      
    } catch (error) {
      console.error('Calendar availability error:', error);
      res.json({ slots: [] }); // Return empty slots on error to avoid breaking VAPI flow
    }
  });

  // Get calendar connection status
  app.get('/api/calendar/status', requireAuth, async (req, res) => {
    try {
      const tenantId = (req.session as any).userId;
      
      const googleStatus = await googleCalendarService.getCredentials(tenantId);
      const assistantCalendarInfo = await googleCalendarService.getAssistantCalendarInfo(tenantId);
      
      res.json({
        google: {
          ...googleStatus || { isConnected: false },
          assistantCalendar: assistantCalendarInfo
        },
        outlook: { isConnected: false } // Placeholder for future Outlook integration
      });
    } catch (error) {
      console.error('Calendar status error:', error);
      res.status(500).json({ error: 'Failed to fetch calendar status' });
    }
  });

  // Disconnect calendar
  app.post('/api/calendar/disconnect/:provider', requireAuth, async (req, res) => {
    try {
      const tenantId = (req.session as any).userId;
      const { provider } = req.params;
      
      if (provider === 'google') {
        // First, disable appointment booking for all assistants that have it enabled
        const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
          const assistantsResult = await dbPool.query(
            `SELECT "vapiAssistantId", appointment_booking_enabled FROM assistants WHERE "tenantId" = $1`,
            [tenantId]
          );
          
          // For each assistant with booking enabled, disable it using exact same logic as toggle endpoint
          for (const assistant of assistantsResult.rows) {
            if (assistant.appointment_booking_enabled === true || assistant.appointment_booking_enabled === 't') {
              const assistantId = assistant.vapiAssistantId;
              console.log(`Disabling appointment booking for assistant ${assistantId}`);
              
              try {
                // Get current assistant config from VAPI
                const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
                  headers: {
                    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (vapiResponse.ok) {
                  const currentConfig = await vapiResponse.json();
                  let updatedInstructions = currentConfig.model?.messages?.[0]?.content || '';
                  let updatedToolIds = [...(currentConfig.model?.toolIds || [])];
                  
                  // Remove calendar tool IDs
                  const calendarToolIds = [
                    'b0620a2a-b996-4120-a797-cec3035a6119', // Google_Calendar_Availability
                    'd1107698-f804-4d9a-89a2-e3b35d009e6e'  // Google_Calendar_Event
                  ];
                  
                  updatedToolIds = updatedToolIds.filter(id => !calendarToolIds.includes(id));
                  
                  // Remove comprehensive calendar instructions from prompt
                  // This matches the logic used in configure-assistant.tsx for removing tool sections
                  const toolLogicStart = updatedInstructions.indexOf('Tool Invocation Logic');
                  if (toolLogicStart !== -1) {
                    const toolLogicEnd = updatedInstructions.indexOf('Repeats the date/time and service before confirming booking');
                    if (toolLogicEnd !== -1) {
                      // Remove from start of "Tool Invocation Logic" to end of booking section
                      const endPos = toolLogicEnd + 'Repeats the date/time and service before confirming booking'.length;
                      updatedInstructions = updatedInstructions.substring(0, toolLogicStart) + 
                                           updatedInstructions.substring(endPos);
                    }
                  }
                  
                  // Also remove any remaining calendar tool sections
                  const calendarInstructions = /## Calendar Booking Tools[\s\S]*?(?=\n## |\n\n## |$)/g;
                  updatedInstructions = updatedInstructions.replace(calendarInstructions, '');
                  
                  // Remove specific tool instructions
                  const toolInstructions = /\*\*Google_Calendar_Availability.*?\n/g;
                  updatedInstructions = updatedInstructions.replace(toolInstructions, '');
                  
                  const eventInstructions = /\*\*Google_Calendar_Event.*?\n/g;
                  updatedInstructions = updatedInstructions.replace(eventInstructions, '');
                  
                  // Clean up any extra whitespace/newlines
                  updatedInstructions = updatedInstructions.replace(/\n\n\n+/g, '\n\n').trim();
                  
                  // Update VAPI assistant
                  const updatePayload = {
                    name: currentConfig.name,
                    voice: currentConfig.voice,
                    model: {
                      ...currentConfig.model,
                      messages: [{ role: 'system', content: updatedInstructions }],
                      toolIds: updatedToolIds
                    }
                  };
                  
                  const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatePayload)
                  });
                  
                  if (updateResponse.ok) {
                    console.log(`VAPI assistant ${assistantId} updated successfully`);
                    
                    // Update database with cleaned prompt
                    await dbPool.query(
                      `UPDATE assistants 
                       SET appointment_booking_enabled = $1, system_prompt = $2, "updatedAt" = CURRENT_TIMESTAMP
                       WHERE "vapiAssistantId" = $3`,
                      [false, updatedInstructions, assistantId]
                    );
                  } else {
                    console.error(`Failed to update VAPI assistant ${assistantId}`);
                    // Still update database even if VAPI fails
                    await dbPool.query(
                      `UPDATE assistants 
                       SET appointment_booking_enabled = $1, "updatedAt" = CURRENT_TIMESTAMP
                       WHERE "vapiAssistantId" = $2`,
                      [false, assistantId]
                    );
                  }
                } else {
                  console.error(`Failed to fetch VAPI config for assistant ${assistantId}`);
                  // Just update database if VAPI fetch fails
                  await dbPool.query(
                    `UPDATE assistants 
                     SET appointment_booking_enabled = $1, "updatedAt" = CURRENT_TIMESTAMP
                     WHERE "vapiAssistantId" = $2`,
                    [false, assistantId]
                  );
                }
                
                console.log(`Appointment booking disabled for assistant ${assistantId}`);
              } catch (error) {
                console.error(`Error disabling booking for assistant ${assistantId}:`, error);
              }
            }
          }
        } finally {
          await dbPool.end();
        }
        
        // Then disconnect the calendar
        await googleCalendarService.disconnect(tenantId);
        res.json({ success: true, message: 'Google Calendar disconnected' });
      } else {
        res.status(400).json({ error: 'Unsupported calendar provider' });
      }
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect calendar' });
    }
  });

  // Appointments sync endpoint
  app.post('/api/appointments/sync', requireAuth, async (req, res) => {
    try {
      const tenantId = (req.session as any).userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get calendar access token
      const accessToken = await googleCalendarService.getValidAccessToken(tenantId);
      if (!accessToken) {
        return res.status(400).json({ error: 'Google Calendar not connected' });
      }

      // Get user email for calendar lookup
      const credentials = await googleCalendarService.getCredentials(tenantId);
      if (!credentials?.userEmail) {
        return res.status(400).json({ error: 'User email not found in calendar credentials' });
      }

      // Get assistant calendar ID
      const assistantCalendarId = await googleCalendarService.getAssistantCalendarId(tenantId, credentials.userEmail);
      if (!assistantCalendarId) {
        return res.status(400).json({ error: 'Assistant calendar not found' });
      }

      const google = await import('googleapis');
      const oauth2Client = new google.google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.google.calendar({ version: 'v3', auth: oauth2Client });

      // Query events from the assistant calendar
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1); // Get events from past month
      
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // Get events up to 3 months ahead

      const eventsResponse = await calendar.events.list({
        calendarId: assistantCalendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 1000
      });

      const events = eventsResponse.data.items || [];
      
      console.log(`Found ${events.length} total events in calendar ${assistantCalendarId}`);
      
      // Log first few events for debugging
      if (events.length > 0) {
        console.log('Sample events:', events.slice(0, 3).map(event => ({
          id: event.id,
          summary: event.summary,
          start: event.start?.dateTime,
          hasExtended: !!event.extendedProperties,
          extendedProps: event.extendedProperties
        })));
      }
      
      // For testing, let's sync ALL events in the assistant calendar initially
      const assistantEvents = events.filter(event => {
        // Include all events in the assistant calendar for now
        return event.id && event.start?.dateTime && event.end?.dateTime && event.summary;
      });
      
      console.log(`Found ${assistantEvents.length} valid events to potentially sync`);

      let syncedCount = 0;
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

      try {
        for (const event of assistantEvents) {
          if (!event.id || !event.start?.dateTime || !event.end?.dateTime || !event.summary) {
            continue;
          }

          const metadata = event.extendedProperties?.private || {};
          
          // Extract metadata from event
          const email = event.attendees?.[0]?.email || metadata.email || '';
          const phone = metadata.phone || '';
          const service = metadata.service || '';
          const patientType = metadata.patient_type || '';
          const assistantId = metadata.assistant_id || '';

          // Check if appointment already exists
          const existingResult = await dbPool.query(
            'SELECT id FROM appointments WHERE calendar_event_id = $1',
            [event.id]
          );

          if (existingResult.rows.length === 0) {
            // Insert new appointment
            await dbPool.query(`
              INSERT INTO appointments (
                tenant_id, assistant_id, calendar_event_id, start_time, end_time,
                summary, description, email, phone, service, patient_type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              tenantId,
              assistantId,
              event.id,
              new Date(event.start.dateTime),
              new Date(event.end.dateTime),
              event.summary,
              event.description || '',
              email,
              phone,
              service,
              patientType
            ]);
            syncedCount++;
          } else {
            // Update existing appointment
            await dbPool.query(`
              UPDATE appointments SET
                start_time = $1, end_time = $2, summary = $3, description = $4,
                email = $5, phone = $6, service = $7, patient_type = $8, synced_at = NOW()
              WHERE calendar_event_id = $9
            `, [
              new Date(event.start.dateTime),
              new Date(event.end.dateTime),
              event.summary,
              event.description || '',
              email,
              phone,
              service,
              patientType,
              event.id
            ]);
          }
        }

        res.json({ 
          success: true, 
          syncedCount,
          totalEvents: assistantEvents.length,
          message: `${syncedCount} appointments synced successfully`
        });

      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Appointment sync error:', error);
      res.status(500).json({ 
        error: 'Failed to sync appointments',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get appointments for tenant
  app.get('/api/appointments', requireAuth, async (req, res) => {
    try {
      const tenantId = (req.session as any).userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

      try {
        const result = await dbPool.query(`
          SELECT 
            id, assistant_id, calendar_event_id, start_time, end_time,
            summary, description, email, phone, service, patient_type, synced_at
          FROM appointments 
          WHERE tenant_id = $1 
          ORDER BY start_time DESC
        `, [tenantId]);

        res.json(result.rows);

      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ 
        error: 'Failed to fetch appointments',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Temporary endpoint to create test appointments for testing sync functionality
  app.post('/api/appointments/create-test', requireAuth, async (req, res) => {
    try {
      const tenantId = (req.session as any).userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user email for calendar lookup
      const credentials = await googleCalendarService.getCredentials(tenantId);
      if (!credentials?.userEmail) {
        return res.status(400).json({ error: 'User email not found in calendar credentials' });
      }

      // Get assistant calendar ID
      const assistantCalendarId = await googleCalendarService.getAssistantCalendarId(tenantId, credentials.userEmail);
      if (!assistantCalendarId) {
        return res.status(400).json({ error: 'Assistant calendar not found' });
      }

      // Get access token
      const accessToken = await googleCalendarService.getValidAccessToken(tenantId);
      if (!accessToken) {
        return res.status(400).json({ error: 'Google Calendar not connected' });
      }

      const google = await import('googleapis');
      const oauth2Client = new google.google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.google.calendar({ version: 'v3', auth: oauth2Client });

      // Create test appointments for next week
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      const testAppointments = [
        {
          summary: 'Appointment with John Smith',
          description: 'Dental cleaning appointment booked by AI assistant',
          start: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 9, 0),
          email: 'john.smith@example.com',
          phone: '+44 7700 900123',
          service: 'Dental Cleaning',
          patientType: 'Regular Patient'
        },
        {
          summary: 'Appointment with Sarah Johnson',
          description: 'Consultation appointment booked by AI assistant',
          start: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 14, 30),
          email: 'sarah.johnson@example.com',
          phone: '+44 7700 900456',
          service: 'Consultation',
          patientType: 'New Patient'
        },
        {
          summary: 'Appointment with Mike Wilson',
          description: 'Follow-up appointment booked by AI assistant',
          start: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 1, 10, 0),
          email: 'mike.wilson@example.com',
          phone: '+44 7700 900789',
          service: 'Follow-up Check',
          patientType: 'Existing Patient'
        }
      ];

      const createdEvents = [];

      for (const appointment of testAppointments) {
        const endTime = new Date(appointment.start);
        endTime.setMinutes(endTime.getMinutes() + 30);

        const event = {
          summary: appointment.summary,
          description: appointment.description,
          start: {
            dateTime: appointment.start.toISOString(),
            timeZone: 'Europe/London'
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'Europe/London'
          },
          attendees: [
            { email: appointment.email }
          ],
          extendedProperties: {
            private: {
              booked_by: 'assistant',
              tenant_id: tenantId,
              assistant_id: 'test-assistant-id',
              email: appointment.email,
              phone: appointment.phone,
              service: appointment.service,
              patient_type: appointment.patientType
            }
          }
        };

        try {
          const response = await calendar.events.insert({
            calendarId: assistantCalendarId,
            requestBody: event
          });

          createdEvents.push({
            id: response.data.id,
            summary: appointment.summary,
            start: appointment.start.toISOString()
          });

          console.log('Created test appointment:', response.data.id, appointment.summary);
        } catch (error) {
          console.error('Error creating test appointment:', error);
        }
      }

      res.json({
        success: true,
        message: `${createdEvents.length} test appointments created`,
        appointments: createdEvents,
        calendarId: assistantCalendarId
      });

    } catch (error) {
      console.error('Error creating test appointments:', error);
      res.status(500).json({
        error: 'Failed to create test appointments',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Call Logs API endpoints

  // Get call logs for current tenant
  app.get('/api/call-logs', requireAuth, async (req: any, res) => {
    try {
      const tenantId = (req.session as any).userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

      try {
        const result = await dbPool.query(`
          SELECT * FROM call_logs 
          WHERE tenant_id = $1 
          ORDER BY started_at DESC
        `, [tenantId]);
        res.json(result.rows);
      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Error fetching call logs:', error);
      res.status(500).json({ 
        error: 'Failed to fetch call logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sync call logs from VAPI
  app.post('/api/call-logs/sync', requireAuth, async (req: any, res) => {
    try {
      const tenantId = (req.session as any).userId;
      console.log('=== CALL LOGS SYNC START ===');
      console.log('Tenant ID:', tenantId);
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get all assistants for this tenant to filter VAPI logs
      const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
      let assistantIds: string[] = [];

      try {
        console.log('Fetching assistants for tenant:', tenantId);
        const assistantsResult = await dbPool.query(`
          SELECT "vapiAssistantId", name FROM assistants 
          WHERE "tenantId" = $1 AND "isActive" = true
        `, [tenantId]);

        console.log('Found assistants:', assistantsResult.rows);
        assistantIds = assistantsResult.rows.map(row => row.vapiAssistantId);
        
        if (assistantIds.length === 0) {
          console.log('No active assistants found for tenant');
          return res.json({ message: 'No active assistants found', syncedCount: 0 });
        }

        // Fetch call logs from VAPI
        console.log('Fetching calls from VAPI API...');
        const vapiResponse = await fetch('https://api.vapi.ai/call', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!vapiResponse.ok) {
          console.error('VAPI API error:', vapiResponse.status, vapiResponse.statusText);
          throw new Error(`VAPI API error: ${vapiResponse.status} ${vapiResponse.statusText}`);
        }

        const vapiData = await vapiResponse.json();
        const calls = Array.isArray(vapiData) ? vapiData : vapiData.calls || [];
        console.log(`Received ${calls.length} total calls from VAPI`);

        // Filter calls for this tenant's assistants
        const tenantCalls = calls.filter((call: any) => 
          call.assistantId && assistantIds.includes(call.assistantId)
        );
        console.log(`Found ${tenantCalls.length} calls for tenant assistants:`, assistantIds);

        let syncedCount = 0;

        // Get latest synced timestamp to avoid duplicates
        console.log('Checking for existing call logs...');
        const latestSyncResult = await dbPool.query(`
          SELECT MAX(synced_at) as latest_sync FROM call_logs WHERE tenant_id = $1
        `, [tenantId]);

        const latestSync = latestSyncResult.rows[0]?.latest_sync;
        console.log('Latest sync timestamp:', latestSync);

        for (const call of tenantCalls) {
          if (!call.id || !call.startedAt) continue;

          // Skip if already synced (based on call start time vs our latest sync)
          if (latestSync && new Date(call.startedAt) <= new Date(latestSync)) {
            continue;
          }

          // Check if call already exists
          const existingCallResult = await dbPool.query(`
            SELECT id FROM call_logs WHERE id = $1
          `, [call.id]);

          if (existingCallResult.rows.length > 0) {
            continue; // Skip existing calls
          }

          // Get assistant name from our database
          const assistantResult = assistantsResult.rows.find(
            row => row.vapiAssistantId === call.assistantId
          );
          const assistantName = assistantResult?.name || 'Unknown Assistant';

          // Extract call data
          const callData = {
            id: call.id,
            tenantId: tenantId,
            assistantId: call.assistantId,
            assistantName: assistantName,
            phoneCustomer: call.customer?.number || call.phoneNumberId || 'web',
            phoneAssistant: call.phoneNumber?.number || null,
            startedAt: new Date(call.startedAt),
            duration: call.endedAt ? 
              Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000) : 0,
            result: call.analysis?.successEvaluation || null,
            endedReason: call.endedReason || 'unknown',
            audioUrl: call.artifact?.recordingUrl || call.recordingUrl || null,
            transcript: call.artifact?.transcript || call.transcript || null
          };

          // Insert call log
          console.log('Inserting call log:', callData.id);
          try {
            await dbPool.query(`
              INSERT INTO call_logs (
                id, tenant_id, assistant_id, assistant_name, phone_customer, 
                phone_assistant, started_at, duration, result, ended_reason, 
                audio_url, transcript
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
              callData.id,
              callData.tenantId,
              callData.assistantId,
              callData.assistantName,
              callData.phoneCustomer,
              callData.phoneAssistant,
              callData.startedAt,
              callData.duration,
              callData.result,
              callData.endedReason,
              callData.audioUrl,
              JSON.stringify(callData.transcript)
            ]);

            syncedCount++;
            console.log('Successfully inserted call log:', callData.id);
            
            // Process sentiment analysis for this call
            if (callData.transcript) {
              try {
                await processSentimentForCall(callData.id, tenantId, callData.transcript);
              } catch (sentimentError) {
                console.error('Error processing sentiment for call:', callData.id, sentimentError);
              }
            }
          } catch (insertError) {
            console.error('Error inserting call log:', insertError);
            // Continue with other calls even if one fails
          }
        }

        // Analytics processing handled by background scheduler

        res.json({ 
          message: `Synced ${syncedCount} new call logs`,
          syncedCount: syncedCount,
          totalCallsFound: tenantCalls.length
        });

      } finally {
        await dbPool.end();
      }

    } catch (error) {
      console.error('Error syncing call logs:', error);
      res.status(500).json({ 
        error: 'Failed to sync call logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Knowledge Base Proxy Route for AWS microservice
  app.post('/api/knowledge/scrape', requireAuth, async (req: any, res) => {
    try {
      const { url } = req.body;
      const userId = (req.session as any).userId;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      
      // Proxy request to AWS microservice
      const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
      const response = await fetch(`${knowledgeBaseUrl}/knowledge/scrape/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.VITE_API_KEY || '',
          'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Scraping failed' }));
        return res.status(response.status).json(errorData);
      }
      
      const data = await response.json();
      res.json(data);
      
    } catch (error) {
      console.error('Knowledge base proxy error:', error);
      res.status(500).json({ 
        message: 'Failed to process scraping request',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get knowledge base entries from AWS microservice
  app.get('/api/knowledge/entries', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // Fetch from AWS microservice
      const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
      const response = await fetch(`${knowledgeBaseUrl}/knowledge/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.VITE_API_KEY || '',
          'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch entries' }));
        return res.status(response.status).json(errorData);
      }
      
      const entries = await response.json();
      res.json(entries);
      
    } catch (error) {
      console.error('Error fetching knowledge base entries:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge base entries' });
    }
  });

  // Delete knowledge base entry from AWS microservice
  app.delete('/api/knowledge/entries/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id } = req.params;
      
      // Delete from AWS microservice
      const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
      const response = await fetch(`${knowledgeBaseUrl}/knowledge/${id}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.VITE_API_KEY || '',
          'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete entry' }));
        return res.status(response.status).json(errorData);
      }
      
      const result = await response.json();
      res.json(result);
      
    } catch (error) {
      console.error('Error deleting knowledge base entry:', error);
      res.status(500).json({ message: 'Failed to delete knowledge base entry' });
    }
  });

  // Configure multer for file uploads
  const storage = multer.memoryStorage();
  const fileUpload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/json',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      console.log('File upload attempt:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
        error.name = 'MulterError';
        cb(error as any, false);
      }
    }
  });

  // Upload file to knowledge base - process locally and create entry via manual creation
  app.post('/api/knowledge/upload', requireAuth, (req: any, res: any, next: any) => {
    fileUpload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.name === 'MulterError') {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
          }
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message });
      }
      
      try {
        const userId = (req.session as any).userId;
        const { category } = req.body;
        
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }
        
        if (!category) {
          return res.status(400).json({ message: 'Category is required' });
        }
        
        const allowedCategories = [
          'Business Overview',
          'Services & Products',
          'Contact Information',
          'Pricing',
          'FAQ',
          'Policies',
          'Company Overview'
        ];
        
        if (!allowedCategories.includes(category)) {
          return res.status(400).json({ 
            message: `Invalid category. Allowed categories: ${allowedCategories.join(', ')}` 
          });
        }
      
        // Use a different approach - create a Blob and use native FormData
        const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
        
        console.log('Forwarding to AWS microservice (native FormData):', {
          url: `${knowledgeBaseUrl}/knowledge/upload/${userId}`,
          filename: req.file.originalname,
          size: req.file.buffer.length,
          category: category,
          mimetype: req.file.mimetype
        });

        // Use built-in Node.js FormData (Node 18+)
        const formData = new FormData();
        
        // Create a File-like object from buffer
        const fileBlob = new File([req.file.buffer], req.file.originalname, { 
          type: req.file.mimetype 
        });
        
        formData.append('file', fileBlob);
        formData.append('category', category);
        
        const response = await fetch(`${knowledgeBaseUrl}/knowledge/upload/${userId}`, {
          method: 'POST',
          headers: {
            'token': process.env.VITE_API_KEY || '',
            'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
            // Don't set Content-Type, let fetch handle it
          },
          body: formData
        });
        
        console.log('AWS microservice response:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create entry' }));
          console.error('AWS microservice error:', errorData);
          return res.status(response.status).json(errorData);
        }
        
        const result = await response.json();
        res.json(result);
        
      } catch (error) {
        console.error('Error uploading file to knowledge base:', error);
        res.status(500).json({ message: 'Failed to upload file to knowledge base' });
      }
    });
  });

  // Scrape website and create knowledge base entry in AWS microservice
  app.post('/api/knowledge/scrape', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const { url } = req.body;
      
      console.log('URL scraping request:', { url, userId });
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      
      // Scrape via AWS microservice
      const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
      const response = await fetch(`${knowledgeBaseUrl}/knowledge/scrape/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.VITE_API_KEY || '',
          'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
        },
        body: JSON.stringify({ url })
      });
      
      console.log('AWS microservice scraping response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to scrape website' }));
        console.error('AWS microservice scraping error:', errorData);
        return res.status(response.status).json(errorData);
      }
      
      const result = await response.json();
      console.log('Website scraped successfully:', result.id);
      res.json(result);
      
    } catch (error) {
      console.error('Error scraping website:', error);
      res.status(500).json({ message: 'Failed to scrape website' });
    }
  });

  // Create knowledge base entry in AWS microservice
  app.post('/api/knowledge/entries', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const { title, content, category, source } = req.body;
      
      if (!title || !content || !category) {
        return res.status(400).json({ message: 'Title, content, and category are required' });
      }
      
      console.log('Manual entry request:', { 
        title, 
        content: content?.substring(0, 100) + '...', 
        category, 
        source 
      });
      
      // Create in AWS microservice
      const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
      const response = await fetch(`${knowledgeBaseUrl}/knowledge/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.VITE_API_KEY || '',
          'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
        },
        body: JSON.stringify({
          title,
          content,
          category,
          source: source || undefined
        })
      });
      
      console.log('AWS microservice manual entry response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create entry' }));
        console.error('AWS microservice manual entry error:', errorData);
        return res.status(response.status).json(errorData);
      }
      
      const result = await response.json();
      console.log('Manual entry created successfully:', result.id);
      res.json(result);
      
    } catch (error) {
      console.error('Error creating knowledge base entry:', error);
      res.status(500).json({ message: 'Failed to create knowledge base entry' });
    }
  });

  // Update knowledge base entry in AWS microservice
  app.put('/api/knowledge/entries/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const { id } = req.params;
      const updates = req.body;
      
      // Update in AWS microservice
      const knowledgeBaseUrl = process.env.VITE_KNOWLEDGE_BASE_URL || 'http://51.20.103.23:3000';
      const response = await fetch(`${knowledgeBaseUrl}/knowledge/${id}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.VITE_API_KEY || '',
          'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update entry' }));
        return res.status(response.status).json(errorData);
      }
      
      const result = await response.json();
      res.json(result);
      
    } catch (error) {
      console.error('Error updating knowledge base entry:', error);
      res.status(500).json({ message: 'Failed to update knowledge base entry' });
    }
  });

  // Add analytics routes
  await addAnalyticsRoutes(app);

  return httpServer;
}

// Background sync utility function for all tenants
export async function syncAppointmentsForAllTenants(): Promise<void> {
  console.log('Starting background sync for all tenants...');
  
  const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get all tenants with active calendar credentials
    const tenantsResult = await dbPool.query(`
      SELECT DISTINCT tenant_id 
      FROM calendar_credentials 
      WHERE provider = 'google'
    `);
    
    for (const tenant of tenantsResult.rows) {
      const tenantId = tenant.tenant_id;
      
      try {
        console.log(`Syncing appointments for tenant: ${tenantId}`);
        
        // Get calendar access token
        const accessToken = await googleCalendarService.getValidAccessToken(tenantId);
        if (!accessToken) {
          console.log(`No valid access token for tenant ${tenantId}, skipping...`);
          continue;
        }

        // Get user email for calendar lookup
        const credentials = await googleCalendarService.getCredentials(tenantId);
        if (!credentials?.userEmail) {
          console.log(`No user email found for tenant ${tenantId}, skipping...`);
          continue;
        }

        // Get assistant calendar ID
        const assistantCalendarId = await googleCalendarService.getAssistantCalendarId(tenantId, credentials.userEmail);
        if (!assistantCalendarId) {
          console.log(`No assistant calendar found for tenant ${tenantId}, skipping...`);
          continue;
        }

        const google = await import('googleapis');
        const oauth2Client = new google.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = google.google.calendar({ version: 'v3', auth: oauth2Client });

        // Query events from the assistant calendar
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1); // Get events from past month
        
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 3); // Get events up to 3 months ahead

        const eventsResponse = await calendar.events.list({
          calendarId: assistantCalendarId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 1000
        });

        const events = eventsResponse.data.items || [];
        
        console.log(`Found ${events.length} total events in calendar ${assistantCalendarId} for tenant ${tenantId}`);
        
        // Filter events that were booked by assistant - be more flexible with detection
        const assistantEvents = events.filter(event => {
          const isAssistantEvent = 
            event.extendedProperties?.private?.booked_by === 'assistant' ||
            event.summary?.includes('AI Assistant') ||
            event.summary?.includes('Assistant') ||
            event.description?.includes('booked by assistant') ||
            event.description?.includes('AI assistant');
          
          return isAssistantEvent;
        });

        let syncedCount = 0;

        for (const event of assistantEvents) {
          if (!event.id || !event.start?.dateTime || !event.end?.dateTime || !event.summary) {
            continue;
          }

          const metadata = event.extendedProperties?.private || {};
          
          // Extract metadata from event
          const email = event.attendees?.[0]?.email || metadata.email || '';
          const phone = metadata.phone || '';
          const service = metadata.service || '';
          const patientType = metadata.patient_type || '';
          const assistantId = metadata.assistant_id || '';

          // Check if appointment already exists
          const existingResult = await dbPool.query(
            'SELECT id FROM appointments WHERE calendar_event_id = $1',
            [event.id]
          );

          if (existingResult.rows.length === 0) {
            // Insert new appointment
            await dbPool.query(`
              INSERT INTO appointments (
                tenant_id, assistant_id, calendar_event_id, start_time, end_time,
                summary, description, email, phone, service, patient_type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              tenantId,
              assistantId,
              event.id,
              new Date(event.start.dateTime),
              new Date(event.end.dateTime),
              event.summary,
              event.description || '',
              email,
              phone,
              service,
              patientType
            ]);
            syncedCount++;
          } else {
            // Update existing appointment
            await dbPool.query(`
              UPDATE appointments SET
                start_time = $1, end_time = $2, summary = $3, description = $4,
                email = $5, phone = $6, service = $7, patient_type = $8, synced_at = NOW()
              WHERE calendar_event_id = $9
            `, [
              new Date(event.start.dateTime),
              new Date(event.end.dateTime),
              event.summary,
              event.description || '',
              email,
              phone,
              service,
              patientType,
              event.id
            ]);
          }
        }

        console.log(`Synced ${syncedCount} appointments for tenant ${tenantId}`);
        
      } catch (error) {
        console.error(`Error syncing appointments for tenant ${tenantId}:`, error);
      }
    }
    
    console.log('Background sync completed for all tenants');
    
  } catch (error) {
    console.error('Error in background sync:', error);
  } finally {
    await dbPool.end();
  }
}

// Analytics API endpoints - completely separate from existing functionality
async function addAnalyticsRoutes(app: Express) {
  // Analytics Overview - High-level metrics cards with filtering
  app.get('/api/analytics/overview', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.session.userId;
    const { from, to, assistantId } = req.query;
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      // Use date range from query params or default to last 30 days
      const endDate = to ? String(to) : new Date().toISOString().split('T')[0];
      const startDate = from ? String(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Analytics query using aggregated daily summary data
      const analyticsQuery = `
        SELECT 
          COALESCE(SUM(total_calls), 0) as total_calls,
          COALESCE(SUM(successful_calls), 0) as successful_calls,
          COALESCE(SUM(total_appointments), 0) as total_appointments,
          COALESCE(AVG(avg_call_duration), 0) as avg_call_duration,
          COALESCE(SUM(total_call_time), 0) as total_call_time,
          COALESCE(AVG(avg_sentiment_score), 0) as avg_sentiment_score
        FROM analytics_daily_summary 
        WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
      `;
      const queryParams = [tenantId, startDate, endDate];

      const metricsResult = await dbPool.query(analyticsQuery, queryParams);

      // Calculate metrics from the filtered data
      const metrics = metricsResult.rows[0];
      const conversionRate = metrics.total_calls > 0 
        ? Math.round((metrics.total_appointments / metrics.total_calls) * 100)
        : 0;

      const overview = {
        totalCalls: parseInt(metrics.total_calls) || 0,
        totalAppointments: parseInt(metrics.total_appointments) || 0,
        avgCallDuration: Math.round(parseFloat(metrics.avg_call_duration)) || 0,
        conversionRate: conversionRate,
        avgSentimentScore: Math.round(parseFloat(metrics.avg_sentiment_score)) || 0,
        totalCallTime: Math.round(parseFloat(metrics.total_call_time)) || 0
      };

      res.json(overview);
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      // Return empty state instead of failing
      res.json({
        totalCalls: 0,
        totalAppointments: 0,
        avgCallDuration: 0,
        conversionRate: 0,
        avgSentimentScore: 0,
        totalCallTime: 0
      });
    } finally {
      await dbPool.end();
    }
  });

  // Analytics Trends - Chart data with filtering support
  app.get('/api/analytics/trends', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.session.userId;
    const { from, to } = req.query;
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      // Use date range from query params or default to last 30 days
      const endDate = to ? String(to) : new Date().toISOString().split('T')[0];
      const startDate = from ? String(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trendsQuery = `
        SELECT 
          date, total_calls, successful_calls, total_appointments, call_outcomes
        FROM analytics_daily_summary 
        WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
        ORDER BY date ASC
      `;
      const queryParams = [tenantId, startDate, endDate];

      const trendsData = await dbPool.query(trendsQuery, queryParams);

      const trends = {
        daily: trendsData.rows.map(row => ({
          date: row.date,
          calls: row.total_calls || 0,
          appointments: row.total_appointments || 0,
          successfulCalls: row.successful_calls || 0,
          outcomes: row.call_outcomes || {}
        }))
      };

      res.json(trends);
    } catch (error) {
      console.error('Error fetching analytics trends:', error);
      res.json({ daily: [] });
    } finally {
      await dbPool.end();
    }
  });

  // Sentiment Analysis - Breakdown by positive/neutral/negative with filtering
  app.get('/api/analytics/sentiment', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.session.userId;
    const { from, to, assistantId } = req.query;
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      // Use date range from query params or default to last 30 days
      const endDate = to ? String(to) : new Date().toISOString().split('T')[0];
      const startDate = from ? String(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const sentimentQuery = `
        SELECT 
          SUM(sentiment_positive) as positive,
          SUM(sentiment_neutral) as neutral,
          SUM(sentiment_negative) as negative
        FROM analytics_daily_summary 
        WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
      `;
      const queryParams = [tenantId, startDate, endDate];

      const sentimentData = await dbPool.query(sentimentQuery, queryParams);

      const sentiment = sentimentData.rows[0];
      const total = (sentiment.positive || 0) + (sentiment.neutral || 0) + (sentiment.negative || 0);

      const sentimentBreakdown = {
        positive: parseInt(sentiment.positive) || 0,
        neutral: parseInt(sentiment.neutral) || 0,
        negative: parseInt(sentiment.negative) || 0,
        total: total,
        percentages: total > 0 ? {
          positive: Math.round((sentiment.positive / total) * 100),
          neutral: Math.round((sentiment.neutral / total) * 100),
          negative: Math.round((sentiment.negative / total) * 100)
        } : { positive: 0, neutral: 0, negative: 0 }
      };

      res.json(sentimentBreakdown);
    } catch (error) {
      console.error('Error fetching sentiment analysis:', error);
      res.json({
        positive: 0, neutral: 0, negative: 0, total: 0,
        percentages: { positive: 0, neutral: 0, negative: 0 }
      });
    } finally {
      await dbPool.end();
    }
  });

  // Assistant Comparison - Performance metrics per assistant
  app.get('/api/analytics/assistants/comparison', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.session.userId;
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const assistantData = await dbPool.query(`
        SELECT 
          assistant_id, assistant_name,
          SUM(call_count) as total_calls,
          SUM(appointment_count) as total_appointments,
          AVG(avg_duration) as avg_duration,
          AVG(sentiment_avg) as avg_sentiment,
          AVG(success_rate) as avg_success_rate
        FROM assistant_performance_daily 
        WHERE tenant_id = $1 AND date >= $2
        GROUP BY assistant_id, assistant_name
        ORDER BY total_calls DESC
      `, [tenantId, thirtyDaysAgo]);

      const assistants = assistantData.rows.map(row => ({
        assistantId: row.assistant_id,
        assistantName: row.assistant_name,
        totalCalls: parseInt(row.total_calls) || 0,
        totalAppointments: parseInt(row.total_appointments) || 0,
        avgDuration: Math.round(parseFloat(row.avg_duration)) || 0,
        avgSentiment: Math.round(parseFloat(row.avg_sentiment)) || 0,
        successRate: Math.round(parseFloat(row.avg_success_rate)) || 0,
        conversionRate: row.total_calls > 0 
          ? Math.round((row.total_appointments / row.total_calls) * 100)
          : 0
      }));

      res.json({ assistants });
    } catch (error) {
      console.error('Error fetching assistant comparison:', error);
      res.json({ assistants: [] });
    } finally {
      await dbPool.end();
    }
  });

  // Recent Activity - Recent calls and appointments
  app.get('/api/analytics/recent-activity', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.session.userId;
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      // Get recent calls with sentiment
      const recentCalls = await dbPool.query(`
        SELECT 
          cl.id, cl.assistant_name, cl.started_at, cl.duration, cl.result, cl.ended_reason,
          csa.sentiment_label, csa.sentiment_score
        FROM call_logs cl
        LEFT JOIN call_sentiment_analysis csa ON cl.id = csa.call_id
        WHERE cl.tenant_id = $1
        ORDER BY cl.started_at DESC
        LIMIT 10
      `, [tenantId]);

      // Get recent appointments
      const recentAppointments = await dbPool.query(`
        SELECT 
          summary, start_time, service, email, phone, synced_at
        FROM appointments
        WHERE tenant_id = $1
        ORDER BY start_time DESC
        LIMIT 10
      `, [tenantId]);

      const activity = {
        recentCalls: recentCalls.rows.map(row => ({
          id: row.id,
          assistantName: row.assistant_name,
          startedAt: row.started_at,
          duration: row.duration,
          result: row.result,
          endedReason: row.ended_reason,
          sentimentLabel: row.sentiment_label || 'neutral',
          sentimentScore: row.sentiment_score || 50
        })),
        recentAppointments: recentAppointments.rows.map(row => ({
          summary: row.summary,
          startTime: row.start_time,
          service: row.service,
          email: row.email,
          phone: row.phone,
          syncedAt: row.synced_at
        }))
      };

      res.json(activity);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.json({ recentCalls: [], recentAppointments: [] });
    } finally {
      await dbPool.end();
    }
  });

  // Health Alerts - System warnings and issues
  app.get('/api/analytics/alerts', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.session.userId;
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const alerts = [];
      const today = new Date().toISOString().split('T')[0];

      // Check for failed calls
      const failedCalls = await dbPool.query(`
        SELECT COUNT(*) as failed_count
        FROM call_logs 
        WHERE tenant_id = $1 AND result = 'fail' AND DATE(started_at) = $2
      `, [tenantId, today]);

      if (parseInt(failedCalls.rows[0].failed_count) > 0) {
        alerts.push({
          type: 'warning',
          title: 'Failed Calls Today',
          message: `${failedCalls.rows[0].failed_count} calls failed today`,
          timestamp: new Date().toISOString()
        });
      }

      // Check for long calls with negative sentiment
      const negativeLongCalls = await dbPool.query(`
        SELECT COUNT(*) as count
        FROM call_logs cl
        JOIN call_sentiment_analysis csa ON cl.id = csa.call_id
        WHERE cl.tenant_id = $1 AND cl.duration > 600 AND csa.sentiment_label = 'negative'
        AND DATE(cl.started_at) = $2
      `, [tenantId, today]);

      if (parseInt(negativeLongCalls.rows[0].count) > 0) {
        alerts.push({
          type: 'critical',
          title: 'Long Negative Calls',
          message: `${negativeLongCalls.rows[0].count} calls over 10 minutes with negative sentiment`,
          timestamp: new Date().toISOString()
        });
      }

      // Check calendar connection
      const calendarStatus = await dbPool.query(`
        SELECT COUNT(*) as connected_count
        FROM calendar_credentials 
        WHERE tenant_id = $1 AND provider = 'google'
      `, [tenantId]);

      if (parseInt(calendarStatus.rows[0].connected_count) === 0) {
        alerts.push({
          type: 'info',
          title: 'Calendar Not Connected',
          message: 'Connect your Google Calendar to enable appointment booking',
          timestamp: new Date().toISOString()
        });
      }

      res.json({ alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.json({ alerts: [] });
    } finally {
      await dbPool.end();
    }
  });
}