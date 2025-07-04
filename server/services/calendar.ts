import { google } from 'googleapis';
import { db } from '../db';
import { calendarCredentials, assistantCalendars } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Encryption utility for storing tokens securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  // Simple encryption for demo - in production use proper encryption
  return Buffer.from(text).toString('base64');
}

function decrypt(encryptedText: string): string {
  // Simple decryption for demo - in production use proper decryption
  return Buffer.from(encryptedText, 'base64').toString('utf8');
}

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    // Determine redirect URI based on deployment environment
    // For production deployment, use production domain; for development, use dev domain
    const isProduction = process.env.REPLIT_DEPLOYMENT === 'true' || process.env.NODE_ENV === 'production';
    const redirectUri = isProduction 
      ? 'https://voice-builder.gozupees.com/api/oauth/google/callback'
      : `https://${process.env.REPLIT_DEV_DOMAIN}/api/oauth/google/callback`;
    
    console.log('OAuth client configured with redirect URI:', redirectUri);
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  // Generate authorization URL
  getAuthUrl(tenantId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: tenantId, // Pass tenant ID in state parameter
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true // Enable incremental authorization
    });

    // Manually add include_granted_scopes if not present (some OAuth2 client versions don't support it)
    if (!authUrl.includes('include_granted_scopes')) {
      const separator = authUrl.includes('?') ? '&' : '?';
      return `${authUrl}${separator}include_granted_scopes=true`;
    }

    return authUrl;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, tenantId: string): Promise<{ accessToken: string; refreshToken?: string; expiryDate?: Date; userEmail?: string }> {
    console.log('Exchanging authorization code for tokens...');
    
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      console.log('Received tokens from Google:', { 
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
      
      this.oauth2Client.setCredentials(tokens);

      // Get user email for display purposes
      console.log('Fetching user info...');
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const userEmail = userInfo.data.email || undefined;
      console.log('User email obtained:', userEmail);

      return {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        userEmail
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Store calendar credentials securely
  async storeCredentials(tenantId: string, tokenData: { accessToken: string; refreshToken?: string; expiryDate?: Date; userEmail?: string }): Promise<void> {
    // Delete existing credentials for this tenant and provider
    await db.delete(calendarCredentials)
      .where(and(
        eq(calendarCredentials.tenantId, tenantId),
        eq(calendarCredentials.provider, 'google')
      ));

    // Insert new credentials
    await db.insert(calendarCredentials).values({
      tenantId,
      provider: 'google',
      accessToken: encrypt(tokenData.accessToken),
      refreshToken: tokenData.refreshToken ? encrypt(tokenData.refreshToken) : undefined,
      expiryDate: tokenData.expiryDate,
      userEmail: tokenData.userEmail
    });
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(tenantId: string): Promise<string | null> {
    const [credentials] = await db.select()
      .from(calendarCredentials)
      .where(and(
        eq(calendarCredentials.tenantId, tenantId),
        eq(calendarCredentials.provider, 'google')
      ));

    if (!credentials) {
      return null;
    }

    const accessToken = decrypt(credentials.accessToken);
    const refreshToken = credentials.refreshToken ? decrypt(credentials.refreshToken) : undefined;

    // Check if token is expired
    if (credentials.expiryDate && credentials.expiryDate <= new Date()) {
      if (!refreshToken) {
        // Token expired and no refresh token available
        return null;
      }

      // Refresh the token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials: newTokens } = await this.oauth2Client.refreshAccessToken();
      
      // Update stored credentials
      await db.update(calendarCredentials)
        .set({
          accessToken: encrypt(newTokens.access_token!),
          expiryDate: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
        })
        .where(and(
          eq(calendarCredentials.tenantId, tenantId),
          eq(calendarCredentials.provider, 'google')
        ));

      return newTokens.access_token!;
    }

    return accessToken;
  }

  // Check if calendar is connected
  async isConnected(tenantId: string): Promise<boolean> {
    const token = await this.getValidAccessToken(tenantId);
    return token !== null;
  }

  // Get calendar credentials for display
  async getCredentials(tenantId: string): Promise<{ userEmail?: string; isConnected: boolean } | null> {
    const [credentials] = await db.select()
      .from(calendarCredentials)
      .where(and(
        eq(calendarCredentials.tenantId, tenantId),
        eq(calendarCredentials.provider, 'google')
      ));

    if (!credentials) {
      return { isConnected: false };
    }

    const isConnected = await this.isConnected(tenantId);
    
    return {
      userEmail: credentials.userEmail || undefined,
      isConnected
    };
  }

  // Create dedicated assistant calendar
  async createAssistantCalendar(tenantId: string, userEmail: string): Promise<string> {
    const accessToken = await this.getValidAccessToken(tenantId);
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const calendarName = 'AI Assistant Bookings';
    
    try {
      // Create new calendar
      const response = await calendar.calendars.insert({
        requestBody: {
          summary: calendarName,
          description: 'Calendar for AI assistant appointment bookings',
          timeZone: 'Europe/London'
        }
      });

      const calendarId = response.data.id!;
      console.log('Created assistant calendar:', calendarId);

      // Store calendar info in database
      await db.insert(assistantCalendars).values({
        tenantId,
        googleCalendarId: calendarId,
        calendarName,
        userEmail,
        isActive: true
      });

      return calendarId;
    } catch (error) {
      console.error('Error creating assistant calendar:', error);
      throw new Error('Failed to create assistant calendar');
    }
  }

  // Get or create assistant calendar
  async getAssistantCalendarId(tenantId: string, userEmail: string): Promise<string> {
    // First, check if we have an active calendar for this tenant
    const activeCalendar = await db.select()
      .from(assistantCalendars)
      .where(and(
        eq(assistantCalendars.tenantId, tenantId),
        eq(assistantCalendars.isActive, true)
      ))
      .limit(1);

    if (activeCalendar.length > 0) {
      // Verify the active calendar still exists in Google
      try {
        const accessToken = await this.getValidAccessToken(tenantId);
        if (!accessToken) throw new Error('No access token');

        this.oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        
        await calendar.calendars.get({ calendarId: activeCalendar[0].googleCalendarId });
        
        console.log('Reusing existing active assistant calendar:', activeCalendar[0].googleCalendarId);
        return activeCalendar[0].googleCalendarId;
      } catch (error) {
        console.log('Active calendar not found in Google, marking inactive:', activeCalendar[0].googleCalendarId);
        await db.update(assistantCalendars)
          .set({ isActive: false })
          .where(eq(assistantCalendars.id, activeCalendar[0].id));
      }
    }

    // Check if we already have ANY assistant calendar for this tenant and email (active or inactive)
    const existingCalendars = await db.select()
      .from(assistantCalendars)
      .where(and(
        eq(assistantCalendars.tenantId, tenantId),
        eq(assistantCalendars.userEmail, userEmail)
      ))
      .orderBy(assistantCalendars.createdAt);

    // Try to reuse existing calendars, starting with the most recent
    for (const existingCalendar of existingCalendars.reverse()) {
      try {
        const accessToken = await this.getValidAccessToken(tenantId);
        if (!accessToken) throw new Error('No access token');

        this.oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        
        // Verify calendar still exists in Google Calendar
        await calendar.calendars.get({ calendarId: existingCalendar.googleCalendarId });
        
        // Calendar exists! Mark it as active and mark others as inactive
        await db.update(assistantCalendars)
          .set({ isActive: false })
          .where(eq(assistantCalendars.tenantId, tenantId));
        
        await db.update(assistantCalendars)
          .set({ isActive: true })
          .where(eq(assistantCalendars.id, existingCalendar.id));
        
        console.log('Reusing existing assistant calendar:', existingCalendar.googleCalendarId);
        return existingCalendar.googleCalendarId;
      } catch (error) {
        console.log('Calendar not found in Google, trying next:', existingCalendar.googleCalendarId);
        // Mark this calendar as inactive since it doesn't exist in Google anymore
        await db.update(assistantCalendars)
          .set({ isActive: false })
          .where(eq(assistantCalendars.id, existingCalendar.id));
      }
    }

    // No existing calendars found or none are accessible, create new one
    console.log('No reusable calendars found, creating new assistant calendar');
    return await this.createAssistantCalendar(tenantId, userEmail);
  }

  // Get assistant calendar info for display
  async getAssistantCalendarInfo(tenantId: string): Promise<{ calendarName?: string; calendarId?: string; userEmail?: string } | null> {
    const [calendar] = await db.select()
      .from(assistantCalendars)
      .where(and(
        eq(assistantCalendars.tenantId, tenantId),
        eq(assistantCalendars.isActive, true)
      ));

    if (!calendar) {
      return null;
    }

    return {
      calendarName: calendar.calendarName,
      calendarId: calendar.googleCalendarId,
      userEmail: calendar.userEmail
    };
  }

  // Disconnect calendar
  async disconnect(tenantId: string): Promise<void> {
    // Keep assistant calendars active so they can be reused on reconnection
    // Only delete OAuth credentials - calendar associations are preserved
    await db.delete(calendarCredentials)
      .where(and(
        eq(calendarCredentials.tenantId, tenantId),
        eq(calendarCredentials.provider, 'google')
      ));
  }
}

export const googleCalendarService = new GoogleCalendarService();