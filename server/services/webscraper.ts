import puppeteer, { Browser, Page } from 'puppeteer';
import { ApifyClient } from 'apify-client';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { Pool } from 'pg';
import { createKnowledgeBaseFile, uploadKnowledgeBaseToVapi, updateAssistantWithKnowledgeBase, updateAssistantWithMultipleKnowledgeBaseFiles } from './vapi.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

interface ScrapedPage {
  url: string;
  html: string;
  title?: string;
  text?: string;
}

interface ProcessedChunk {
  title: string;
  chunk: string;
  tags: string[];
  confidence: number;
}

interface MandatoryFields {
  services: string;
  opening_hours: string;
  contact_info: {
    phone: string;
    email: string;
    website: string;
  };
  address: string;
  additional_notes: string;
}

interface ScrapingResult {
  status: 'success' | 'error';
  mandatoryFields: MandatoryFields;
  pagesProcessed: number;
  error?: string;
}

export async function scrapeAndProcessWebsite(url: string, tenantId: string, businessName?: string, businessType?: string): Promise<ScrapingResult> {
  try {
    console.log(`Starting website scraping for ${url}, tenant: ${tenantId}`);
    
    // Step 1: Primary scraping with Puppeteer
    let scrapedPages = await primaryScrape(url);
    
    // Step 2: Fallback to Apify if needed
    if (scrapedPages.length < 5) {
      console.log(`Primary scrape returned ${scrapedPages.length} pages, using Apify fallback`);
      try {
        scrapedPages = await apifyFallback(url);
      } catch (apifyError) {
        console.log('Apify service unavailable:', (apifyError as Error).message || 'Unknown error');
        return {
          status: 'error',
          mandatoryFields: getEmptyMandatoryFields(),
          pagesProcessed: 0,
          error: 'Website scraping service temporarily unavailable. Please try again later or contact support.'
        };
      }
    }
    
    if (scrapedPages.length === 0) {
      return {
        status: 'error',
        mandatoryFields: getEmptyMandatoryFields(),
        pagesProcessed: 0,
        error: 'No pages could be scraped from the website'
      };
    }
    
    console.log(`Processing ${scrapedPages.length} scraped pages - using raw content approach`);
    
    // Step 3: Extract mandatory fields only (minimal AI processing)
    const mandatoryFields = await extractMandatoryFields(scrapedPages.map(p => p.text || '').join('\n\n'));
    
    // Step 4: Create raw content files and upload to VAPI
    const uploadedFiles = await createAndUploadRawContentFiles(scrapedPages, tenantId, businessName);
    
    // Step 5: Save metadata to database
    await saveRawContentMetadata(tenantId, uploadedFiles, mandatoryFields, scrapedPages, businessName, businessType);
    
    // Knowledge base files saved for manual assistant creation (no auto-sync to prevent cross-contamination)
    console.log(`Knowledge base files prepared for ${businessName}, will be used during assistant creation`);
    
    console.log(`Created ${uploadedFiles.length} knowledge base files for tenant ${tenantId}`);
    
    return {
      status: 'success',
      mandatoryFields,
      pagesProcessed: scrapedPages.length
    };
    
  } catch (error) {
    console.error('Error in scrapeAndProcessWebsite:', error);
    return {
      status: 'error',
      mandatoryFields: getEmptyMandatoryFields(),
      pagesProcessed: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function primaryScrape(startUrl: string): Promise<ScrapedPage[]> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const visited = new Set<string>();
    const toVisit = [startUrl];
    const scrapedPages: ScrapedPage[] = [];
    const maxPages = 20;
    
    const baseUrl = new URL(startUrl);
    const baseDomain = baseUrl.hostname;
    
    while (toVisit.length > 0 && scrapedPages.length < maxPages) {
      const currentUrl = toVisit.shift()!;
      
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);
      
      try {
        console.log(`Scraping: ${currentUrl}`);
        await page.goto(currentUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        const content = await page.content();
        const title = await page.title();
        
        // Extract text content with error handling
        let textContent = '';
        try {
          const $ = cheerio.load(content);
          
          // Remove script, style, and other non-content elements
          $('script, style, nav, footer, header, .menu, .navigation, .sidebar').remove();
          
          textContent = $('body').text().trim();
        } catch (parseError) {
          console.warn(`HTML parsing warning for ${currentUrl}:`, (parseError as Error)?.message || 'Unknown parsing error');
          // Fallback to regex-based text extraction
          textContent = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        scrapedPages.push({
          url: currentUrl,
          html: content,
          title,
          text: textContent
        });
        
        // Find internal links
        const links = await page.$$eval('a[href]', (anchors) =>
          anchors.map((a) => (a as HTMLAnchorElement).href)
        );
        
        // Priority patterns for important business pages
        const priorityPatterns = [
          /\/(home|index)$/i,
          /\/about/i,
          /\/contact/i,
          /\/services/i,
          /\/products/i,
          /\/solutions/i,
          /\/team/i,
          /\/company/i,
          /\/info/i
        ];
        
        // Pages to exclude (blogs, news, etc.)
        const excludePatterns = [
          /\/blog/i,
          /\/news/i,
          /\/press/i,
          /\/media/i,
          /\/events/i,
          /\/careers/i,
          /\/jobs/i,
          /\/privacy/i,
          /\/terms/i,
          /\/legal/i,
          /\/cookie/i,
          /\/search/i,
          /\/login/i,
          /\/register/i,
          /\/cart/i,
          /\/checkout/i
        ];
        
        const priorityLinks: string[] = [];
        const regularLinks: string[] = [];
        
        for (const link of links) {
          try {
            const linkUrl = new URL(link);
            if (linkUrl.hostname === baseDomain && 
                !visited.has(link) && 
                !toVisit.includes(link) &&
                !link.includes('#') &&
                !link.match(/\.(pdf|jpg|png|gif|zip|doc|docx)$/i) &&
                !excludePatterns.some(pattern => pattern.test(link))) {
              
              if (priorityPatterns.some(pattern => pattern.test(link))) {
                priorityLinks.push(link);
              } else {
                regularLinks.push(link);
              }
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
        
        // Add priority links first, then regular links
        toVisit.push(...priorityLinks, ...regularLinks);
        
        // Add delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (pageError) {
        console.error(`Error scraping page ${currentUrl}:`, pageError);
      }
    }
    
    return scrapedPages;
    
  } catch (error) {
    console.error('Error in primary scrape:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function apifyFallback(url: string): Promise<ScrapedPage[]> {
  try {
    console.log('Starting Apify fallback scraping');
    
    const input = {
      startUrls: [{ url }],
      crawlerType: 'cheerio',
      includeUrlGlobs: [`${new URL(url).origin}/**`],
      maxCrawlDepth: 3,
      maxCrawlPages: 50,
      removeCookieWarnings: true,
      clickElementsCssSelector: '[aria-label*="cookie" i] button, [class*="cookie" i] button, [id*="cookie" i] button'
    };

    const run = await apifyClient.actor('apify/website-content-crawler').call(input);
    
    // Wait for completion
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    const scrapedPages: ScrapedPage[] = items.map((item: any) => ({
      url: item.url,
      html: item.html || '',
      title: item.title || '',
      text: item.text || ''
    }));
    
    console.log(`Apify returned ${scrapedPages.length} pages`);
    return scrapedPages;
    
  } catch (error) {
    console.error('Error in Apify fallback:', error);
    return [];
  }
}

async function processWithOpenAI(pages: ScrapedPage[]): Promise<{
  chunks: ProcessedChunk[];
  mandatoryFields: MandatoryFields;
}> {
  // Combine all content first
  const allContent = pages.map(page => `URL: ${page.url}\nTitle: ${page.title}\nContent: ${page.text}`).join('\n\n---PAGE_BREAK---\n\n');
  
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a business content cleaning specialist. Your job is to clean and organize website content by removing error messages, 404 pages, navigation menus, cookie notices, and irrelevant content while preserving ALL meaningful business information. DO NOT summarize or condense the content - keep all important details intact. Always respond in valid JSON format."
        },
        {
          role: "user",
          content: `Clean and organize this business website content. Remove error messages, 404 pages, navigation elements, and irrelevant content, but preserve ALL meaningful business information without summarizing.

Organize the cleaned content into 2-5 logical sections:

1. **Company Information**: About the business, mission, history, values
2. **Services & Products**: Complete details of what they offer
3. **Contact & Location**: All contact information and locations
4. **Business Details**: Hours, policies, pricing, procedures
5. **Additional Information**: Any other relevant business content

IMPORTANT: 
- Keep ALL meaningful content - do not summarize or shorten
- Remove only error messages, 404 pages, navigation menus, cookie notices
- Preserve specific details, procedures, pricing, contact info
- Maintain original wording for important business information

For each section, provide in JSON format:
- title: Clear section name
- chunk: ALL cleaned content for that section with full details preserved
- tags: Relevant categories ["company", "services", "contact", "products", "location", "details"]
- confidence: How confident the cleaned content is accurate (0.0-1.0)

Return the result as JSON with this structure:
{
  "chunks": [
    {
      "title": "Company Information",
      "chunk": "All cleaned company content...",
      "tags": ["company"],
      "confidence": 0.9
    }
  ]
}

Website content to clean and organize:
${allContent.substring(0, 25000)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"chunks": []}');
    let chunks = result.chunks || [];
    
    // If OpenAI analysis returned no chunks, use fallback
    if (chunks.length === 0) {
      console.log('OpenAI analysis returned no chunks, using fallback raw data processing');
      chunks = createFallbackChunks(pages);
    }
    
    // Extract mandatory fields from all content
    const mandatoryFields = await extractMandatoryFields(allContent);
    
    return { chunks, mandatoryFields };
    
  } catch (error) {
    console.error('Error processing content with OpenAI:', error);
    // Fallback: Create chunks from raw scraped data
    const fallbackChunks = createFallbackChunks(pages);
    const mandatoryFields = await extractMandatoryFields(allContent);
    return { chunks: fallbackChunks, mandatoryFields };
  }
}

function createFallbackChunks(pages: ScrapedPage[]): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  
  // Create chunks from raw scraped data
  pages.forEach((page, index) => {
    if (page.text && page.text.trim().length > 100) {
      // Split content into manageable chunks (2000 chars max)
      const content = page.text.trim();
      const chunkSize = 2000;
      let startIndex = 0;
      
      while (startIndex < content.length) {
        const chunkContent = content.substring(startIndex, startIndex + chunkSize);
        
        if (chunkContent.trim().length > 50) { // Only include substantial content
          chunks.push({
            title: page.title || `Page Content ${index + 1}`,
            chunk: chunkContent.trim(),
            tags: ['scraped_content', 'fallback'],
            confidence: 0.7 // Lower confidence for fallback data
          });
        }
        
        startIndex += chunkSize;
      }
    }
  });
  
  // If no meaningful content, create a basic entry
  if (chunks.length === 0 && pages.length > 0) {
    chunks.push({
      title: 'Website Content',
      chunk: pages.map(p => `${p.title}: ${p.text?.substring(0, 500) || 'No content available'}`).join('\n\n'),
      tags: ['basic_info', 'fallback'],
      confidence: 0.5
    });
  }
  
  console.log(`Created ${chunks.length} fallback chunks from ${pages.length} scraped pages`);
  return chunks;
}

async function extractMandatoryFields(content: string): Promise<MandatoryFields> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Extract specific business information from website content. Respond with JSON in this format: { \"services\": string, \"opening_hours\": string, \"contact_info\": { \"phone\": string, \"email\": string, \"website\": string }, \"address\": string }"
        },
        {
          role: "user",
          content: `Extract the following mandatory business information from this website content:

1. Services/Products: List of main services or products offered
2. Opening Hours: Business operating hours/schedule
3. Contact Info: Phone number, email address, and website URL
4. Address: Physical business address

If any information is not found, use empty string. Be precise and factual.

Website content:
${content.substring(0, 8000)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      services: result.services || '',
      opening_hours: result.opening_hours || '',
      contact_info: {
        phone: result.contact_info?.phone || '',
        email: result.contact_info?.email || '',
        website: result.contact_info?.website || ''
      },
      address: result.address || '',
      additional_notes: result.additional_notes || ''
    };
    
  } catch (error) {
    console.error('Error extracting mandatory fields:', error);
    return getEmptyMandatoryFields();
  }
}

async function saveToDatabaseTables(
  tenantId: string, 
  chunks: ProcessedChunk[], 
  mandatoryFields: MandatoryFields, 
  pages: ScrapedPage[]
): Promise<void> {
  
  const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Save chunks to kb_entries
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const pageUrl = pages[Math.floor(i / (chunks.length / pages.length))]?.url || pages[0]?.url || '';
      
      await dbPool.query(
        `INSERT INTO kb_entries (tenant_id, chunk_id, page_url, title, content, tags, confidence, source) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          `chunk_${Date.now()}_${i}`,
          pageUrl,
          chunk.title,
          chunk.chunk,
          chunk.tags,
          chunk.confidence,
          'website_scraper'
        ]
      );
    }
    
    // Add mandatory fields as additional entries
    const mandatoryChunks = [
      { title: "Services", content: mandatoryFields.services, tags: ["services"], confidence: 0.95 },
      { title: "Opening Hours", content: mandatoryFields.opening_hours, tags: ["hours"], confidence: 0.95 },
      { title: "Contact Information", content: `Phone: ${mandatoryFields.contact_info.phone}, Email: ${mandatoryFields.contact_info.email}, Website: ${mandatoryFields.contact_info.website}`, tags: ["contact"], confidence: 0.95 },
      { title: "Address", content: mandatoryFields.address, tags: ["location"], confidence: 0.95 },
      { title: "Additional Information", content: mandatoryFields.additional_notes, tags: ["info"], confidence: 0.90 }
    ];

    for (let i = 0; i < mandatoryChunks.length; i++) {
      const chunk = mandatoryChunks[i];
      if (chunk.content && chunk.content.trim()) {
        await dbPool.query(
          `INSERT INTO kb_entries (tenant_id, chunk_id, page_url, title, content, tags, confidence, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            tenantId,
            `mandatory_${Date.now()}_${i}`,
            'website_analysis',
            chunk.title,
            chunk.content,
            chunk.tags,
            chunk.confidence,
            'website_scraper'
          ]
        );
      }
    }
    
    console.log(`Saved ${chunks.length + mandatoryChunks.filter(c => c.content && c.content.trim()).length} total knowledge base entries for tenant ${tenantId}`);
    
  } catch (error) {
    console.error('Error saving to database:', error);
    throw error;
  } finally {
    await dbPool.end();
  }
}

// Interface for uploaded file metadata
interface UploadedFile {
  file_sequence: number;
  vapi_file_id: string | null;
  file_name: string;
  content_size: number;
  pages_included: string[];
}

// Create and upload raw content files to VAPI (max 300KB each)
async function createAndUploadRawContentFiles(scrapedPages: ScrapedPage[], tenantId: string, businessName?: string): Promise<UploadedFile[]> {
  const uploadedFiles: UploadedFile[] = [];
  const maxFileSizeBytes = 300 * 1024; // 300KB in bytes
  
  // Get the next available file sequence for this tenant
  const sequencePool = new Pool({ connectionString: process.env.DATABASE_URL });
  let nextFileSequence = 1;
  
  try {
    const maxSequenceResult = await sequencePool.query(
      `SELECT COALESCE(MAX(file_sequence), 0) + 1 as next_sequence FROM kb_files WHERE tenant_id = $1`,
      [tenantId]
    );
    nextFileSequence = maxSequenceResult.rows[0].next_sequence;
  } finally {
    await sequencePool.end();
  }
  
  let currentFileContent = '';
  let currentFilePages: string[] = [];
  let fileSequence = nextFileSequence;
  
  for (const page of scrapedPages) {
    // Clean the page content
    const cleanContent = cleanPageContent(page.text || '', page.url);
    const pageContent = `\n\n=== ${page.title || 'Page'} ===\nSource: ${page.url}\n\n${cleanContent}\n\n`;
    
    // Check if adding this page would exceed the file size limit
    const potentialSize = Buffer.byteLength(currentFileContent + pageContent, 'utf8');
    
    if (potentialSize > maxFileSizeBytes && currentFileContent.length > 0) {
      // Save current file and start a new one
      const uploadedFile = await uploadContentFile(currentFileContent, fileSequence, tenantId, currentFilePages, businessName);
      uploadedFiles.push(uploadedFile);
      
      // Start new file
      currentFileContent = pageContent;
      currentFilePages = [page.url];
      fileSequence++;
    } else {
      // Add to current file
      currentFileContent += pageContent;
      currentFilePages.push(page.url);
    }
  }
  
  // Upload the last file if it has content
  if (currentFileContent.length > 0) {
    const uploadedFile = await uploadContentFile(currentFileContent, fileSequence, tenantId, currentFilePages, businessName);
    uploadedFiles.push(uploadedFile);
  }
  
  return uploadedFiles;
}

// Clean page content by removing navigation, ads, and other non-content elements
function cleanPageContent(content: string, pageUrl: string): string {
  // Remove common navigation and footer text patterns
  let cleaned = content
    .replace(/^.*?(Home|About|Services|Contact|Menu|Navigation).*$/gmi, '')
    .replace(/^.*?(Copyright|©|All rights reserved|Privacy Policy|Terms of Service).*$/gmi, '')
    .replace(/^.*?(Follow us|Social media|Facebook|Twitter|Instagram|LinkedIn).*$/gmi, '')
    .replace(/^.*?(Cookie|Cookies|This website uses cookies).*$/gmi, '')
    .replace(/^.*?(Error|404|Page not found|Something went wrong).*$/gmi, '')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Remove very short lines that are likely navigation or boilerplate
  const lines = cleaned.split('\n');
  const meaningfulLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 10 && // Keep lines with substantial content
           !trimmed.match(/^(Home|About|Services|Contact|Menu|Back|Next|Previous|More|Learn More|Read More|Click here)$/i);
  });
  
  return meaningfulLines.join('\n').trim();
}

// Upload a single content file to VAPI
async function uploadContentFile(content: string, sequence: number, tenantId: string, pages: string[], businessName?: string): Promise<UploadedFile> {
  const sanitizedBusinessName = businessName ? businessName.replace(/[^a-zA-Z0-9]/g, '_') : 'Business';
  const fileName = `${sanitizedBusinessName}_KB_Part_${sequence}.txt`;
  const contentSize = Buffer.byteLength(content, 'utf8');
  
  console.log(`Uploading knowledge base file ${fileName} (${Math.round(contentSize / 1024)}KB)`);
  
  try {
    const knowledgeBase = await uploadKnowledgeBaseToVapi(content, fileName);
    
    return {
      file_sequence: sequence,
      vapi_file_id: knowledgeBase?.id || null,
      file_name: fileName,
      content_size: contentSize,
      pages_included: pages
    };
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error);
    return {
      file_sequence: sequence,
      vapi_file_id: null,
      file_name: fileName,
      content_size: contentSize,
      pages_included: pages
    };
  }
}

// Save raw content metadata and business information to database
async function saveRawContentMetadata(
  tenantId: string, 
  uploadedFiles: UploadedFile[], 
  mandatoryFields: MandatoryFields, 
  scrapedPages: ScrapedPage[],
  businessName?: string,
  businessType?: string
): Promise<void> {
  const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Save file metadata
    for (const file of uploadedFiles) {
      await dbPool.query(
        `INSERT INTO kb_files (tenant_id, file_sequence, vapi_file_id, file_name, content_size, pages_included, business_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          tenantId,
          file.file_sequence,
          file.vapi_file_id,
          file.file_name,
          file.content_size,
          JSON.stringify(file.pages_included),
          businessName
        ]
      );
    }
    
    // Save or update kb_meta
    const totalContentSize = uploadedFiles.reduce((sum, file) => sum + file.content_size, 0);
    
    await dbPool.query(
      `INSERT INTO kb_meta (tenant_id, total_files, total_content_size, pages_scraped, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (tenant_id) DO UPDATE SET
       total_files = EXCLUDED.total_files,
       total_content_size = EXCLUDED.total_content_size,
       pages_scraped = EXCLUDED.pages_scraped,
       updated_at = CURRENT_TIMESTAMP`,
      [tenantId, uploadedFiles.length, totalContentSize, scrapedPages.length]
    );

    // Save business information for dashboard
    if (businessName) {
      const websiteUrl = scrapedPages.length > 0 ? new URL(scrapedPages[0].url).origin : '';
      
      // Parse services from mandatory fields
      let servicesArray: string[] = [];
      if (mandatoryFields.services) {
        servicesArray = mandatoryFields.services.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }

      // Only save business info if none exists for this tenant to avoid overwriting
      const existingBizQuery = `SELECT "businessName" FROM business_info WHERE "tenantId" = $1`;
      const existingBizResult = await dbPool.query(existingBizQuery, [tenantId]);
      
      if (existingBizResult.rows.length === 0) {
        await dbPool.query(
          `INSERT INTO business_info ("tenantId", "businessName", industry, website, location, 
           description, services, "contactEmail", "contactPhone", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            tenantId,
            businessName,
            businessType || 'Business',
            websiteUrl,
            mandatoryFields.address || '',
            mandatoryFields.additional_notes || `${businessName} - Business information extracted from website`,
            JSON.stringify(servicesArray),
            mandatoryFields.contact_info.email || '',
            mandatoryFields.contact_info.phone || ''
          ]
        );
        console.log(`Business information saved for ${businessName} (first business for tenant)`);
      } else {
        console.log(`Business information preserved for tenant ${tenantId}, keeping existing: ${existingBizResult.rows[0].businessName}`);
      }
    }
    
    console.log(`Saved metadata for ${uploadedFiles.length} files, total size: ${Math.round(totalContentSize / 1024)}KB`);
    console.log(`Business information saved for ${businessName}`);
    
  } catch (error) {
    console.error('Error saving raw content metadata:', error);
    throw error;
  } finally {
    await dbPool.end();
  }
}

function getEmptyMandatoryFields(): MandatoryFields {
  return {
    services: '',
    opening_hours: '',
    contact_info: {
      phone: '',
      email: '',
      website: ''
    },
    address: '',
    additional_notes: ''
  };
}