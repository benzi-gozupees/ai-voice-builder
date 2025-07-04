# SME AI Voice Assistant Platform

## Overview

This is a multi-tenant SaaS platform that enables small and medium-sized enterprises (SMEs) to create AI-powered voice assistants for appointment booking and customer service. The platform automates the entire onboarding process through website scraping, AI-powered content analysis, and seamless integration with calendar systems and VAPI (Voice AI Platform).

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: shadcn/ui with Radix UI primitives and Tailwind CSS
- **State Management**: TanStack React Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for multi-environment support

### Backend Architecture
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js with custom middleware
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints with standardized error handling
- **File Processing**: Multer for file uploads with size and type restrictions

### Database Design
- **Primary Database**: PostgreSQL 16 with UUID primary keys
- **Schema Management**: Drizzle migrations with type-safe schema definitions
- **Multi-tenancy**: Tenant-based data isolation with foreign key constraints
- **Connection Pooling**: Neon serverless with WebSocket support

## Key Components

### 1. Quick Setup System
- **Website Scraping**: Dual-stage scraping using Puppeteer (primary) and Apify (fallback)
- **AI Content Analysis**: GPT-4o for content chunking, classification, and mandatory field extraction
- **Knowledge Base**: Automated creation and storage of business information
- **Streamlined Form**: Single-page setup with direct assistant creation

### 2. AI Assistant Management
- **VAPI Integration**: Voice assistant creation with custom prompts and knowledge bases
- **Configuration Management**: Dynamic assistant settings with voice selection
- **Prompt Engineering**: Context-aware prompts based on business type and scraped content
- **Knowledge Base Upload**: Automated file processing and VAPI knowledge base integration

### 3. Calendar Integration
- **Provider Support**: Google Calendar with OAuth 2.0 flow
- **Token Management**: Secure storage and refresh of access tokens
- **Appointment Settings**: Configurable duration, buffer times, and booking windows

### 4. Widget System
- **Embeddable Script**: Secure tenant-specific widget embedding
- **CORS Configuration**: Cross-origin support for website integration
- **Dynamic Loading**: Runtime configuration fetching and VAPI SDK initialization

## Data Flow

### User Journey Flow
1. **Home Page** → Professional landing page with marketing content and feature showcase
2. **Authentication** → Login and signup pages with dark theme matching home page design
3. **Quick Setup Flow** → Business details collection, website analysis, and AI assistant creation
4. **Dashboard Access** → Assistant management, configuration, and analytics
5. **Widget Integration** → Embeddable code for customer websites

### Runtime Flow
1. **Widget Load** → Tenant configuration fetch and VAPI SDK initialization
2. **Voice Interaction** → VAPI handles speech processing and AI responses
3. **Calendar Operations** → Integration with connected calendar providers
4. **Knowledge Queries** → AI assistant accesses uploaded knowledge base

## External Dependencies

### AI Services
- **OpenAI GPT-4o**: Content analysis, prompt generation, and knowledge base processing
- **VAPI**: Voice AI platform for speech-to-text, AI reasoning, and text-to-speech

### Scraping Services
- **Puppeteer**: Primary web scraping with headless Chrome
- **Apify**: Fallback web scraping service with professional crawler

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **Replit**: Development and deployment environment

### Authentication & Integrations
- **Google OAuth 2.0**: Calendar integration and access token management

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20, PostgreSQL 16, and web modules
- **Hot Reload**: Vite dev server with Express.js backend
- **Port Configuration**: Frontend (Vite) + Backend (Express) on port 5000

### Production Deployment
- **Build Process**: Vite frontend build + esbuild backend compilation
- **Autoscale Target**: Replit's autoscale deployment with external port 80
- **Asset Serving**: Static file serving with CORS headers for widget embedding

### Database Management
- **Migrations**: Drizzle-kit for schema versioning and deployment
- **Connection Management**: Serverless connection pooling with WebSocket support
- **Backup Strategy**: Automated backups through Neon platform

## Changelog

Changelog:
- July 01, 2025. **VAPI Widget CSS Positioning Fix**:
  - Fixed critical CSS positioning conflict where VAPI's default absolute positioning interfered with widget placement
  - Added immediate CSS override targeting .vapi-btn class with position: fixed !important
  - Implemented delayed CSS override with higher specificity to ensure positioning rule takes precedence
  - Enhanced widget reliability across all external websites regardless of VAPI script loading timing
  - Widget now maintains proper fixed positioning even when VAPI's CSS loads after widget initialization
- July 01, 2025. **Google OAuth Incremental Authorization Implementation**:
  - Added include_granted_scopes: true parameter to Google OAuth URL generation
  - Implemented incremental authorization as required by Google's API policies for approval
  - Enhanced OAuth compliance while maintaining all existing calendar functionality
  - No impact on current features - calendar creation, booking, and availability checking work unchanged
  - Addresses mandatory requirement for Google OAuth app verification process
- June 30, 2025. **Widget Microphone Permission Fix Complete**:
  - Fixed critical microphone access issue preventing voice input on external websites
  - Added comprehensive Permissions Policy headers (microphone=*, camera=*, autoplay=*) to server responses
  - Enhanced widget error handling with user-friendly notifications for permission issues
  - Added HTTPS detection and warnings for sites not using secure connections
  - Updated embed code instructions with microphone permission requirements
  - Added detailed troubleshooting guidance for website owners about HTTPS and permissions policy
  - Implemented proactive permission status checking and helpful error messages
  - Widget now provides clear guidance to users when microphone access is denied or unavailable
  - Complete solution ensures voice functionality works properly on embedded external websites
- June 30, 2025. **Google User Data Privacy Policy Section Added**:
  - Added comprehensive "Use of Google User Data" section to Privacy Policy page
  - Included detailed explanation of Google Calendar data usage for appointment scheduling
  - Added clear statements about data limitations and compliance with Google's API policies
  - Integrated proper links to Google's API Services User Data Policy and Limited Use Requirements
  - Updated all subsequent section numbering to maintain proper document structure
- June 23, 2025. **Analytics Dashboard Implementation Complete**:
  - Created comprehensive analytics dashboard replacing Dashboard Overview tab
  - Implemented real-time metrics: total calls, appointments, conversion rates, sentiment analysis
  - Added interactive charts using Recharts: call volume trends, appointment booking, sentiment breakdown
  - Integrated sentiment analysis using OpenAI GPT-4o-mini for call transcript processing
  - Created analytics database tables with proper constraints and tenant isolation
  - Implemented background processing for sentiment analysis and daily aggregations
  - Added analytics API endpoints with 5-minute refresh intervals and graceful error handling
  - Enhanced existing VAPI call sync to include automatic sentiment processing
  - Built responsive UI components with VAPI-style design and animated counters
  - Added system health alerts and recent activity feeds with real-time updates
  - Complete tenant data isolation with no cross-contamination between users
  - Zero impact on existing functionality - all endpoints and features preserved
- December 21, 2024. **Legal Pages Implementation Complete**:
  - Created comprehensive privacy policy page with proper formatting and responsive design
  - Created comprehensive terms of service page with all required legal content
  - Added all required content including Google OAuth data handling, security measures, and contact information
  - Implemented clean UI with dark mode support and proper typography for both pages
  - Added both privacy policy and terms of service routes to router as public pages accessible without authentication
  - Updated footer links to point to internal legal pages instead of external links
  - Set effective date and last updated date to June 20, 2025 as per company requirements
  - Both pages include proper navigation back to home page and consistent branding
- June 20, 2025. **Call Logs Section Implementation Complete**:
  - Created call_logs database table with comprehensive call metadata fields
  - Implemented GET /api/call-logs endpoint for fetching tenant-specific call logs
  - Added POST /api/call-logs/sync endpoint for manual VAPI call synchronization
  - Built CallLogsSection component with VAPI-style table layout and clean UI
  - Added "Call Logs" tab to dashboard sidebar navigation with Phone icon
  - Implemented call details drawer with audio playback and transcript viewing
  - Added manual "Sync Now" functionality with loading states and success feedback
  - Created comprehensive call log cards with badges for call results and end reasons
  - Implemented call ID copying functionality and formatted duration display
  - Added proper tenant isolation and error handling throughout sync process
  - Fixed column name mismatch in database queries for assistants table compatibility
  - System now syncs call logs from VAPI API filtering by tenant's assistant IDs
- June 20, 2025. **Complete Appointment Sync Module Implementation**:
  - Created appointments database table with comprehensive metadata fields
  - Implemented POST /api/appointments/sync endpoint for manual Google Calendar synchronization
  - Added GET /api/appointments endpoint for fetching synced appointment data
  - Built comprehensive appointment cards UI with service details, contact info, and status indicators
  - Added "Appointments" tab to dashboard sidebar navigation with manual sync functionality
  - Implemented automatic background sync running every 30 minutes for all tenants
  - Fixed calendar creation logic to prevent duplicate assistant calendars
  - Enhanced appointment detection to include proper metadata filtering
  - Added comprehensive error handling and logging throughout sync process
  - System now maintains real-time sync between Google Calendar and dashboard appointments
- June 20, 2025. **Dedicated Assistant Calendar Implementation**:
  - Created new assistant_calendars database table for persistent calendar associations
  - Implemented automatic creation of dedicated "AI Assistant Bookings" calendar for each tenant
  - Updated all booking and availability endpoints to use assistant calendar instead of primary calendar
  - Added calendar creation during OAuth connection with verification and reuse logic
  - Enhanced UI to display dedicated calendar information in dashboard
  - Fixed calendar reuse logic to prevent multiple calendar creation on disconnect/reconnect cycles
  - System now properly detects and reuses existing calendars for same tenant/email combination
  - Implemented calendar verification against Google Calendar API before reuse
  - Calendar associations preserved during disconnection, no unnecessary calendar proliferation
  - Complete separation of AI bookings from personal/business calendar events
  - All existing functionality preserved while adding better organization and isolation
- June 20, 2025. **Calendar Event Metadata Enhancement**:
  - Added extendedProperties.private metadata to Google Calendar events created by AI assistant
  - Events now include booked_by: "assistant", tenant_id, and assistant_id for programmatic filtering
  - Implemented safety rules: metadata only added when both tenantId and assistantId are provided
  - Events created without complete metadata gracefully fall back to standard creation without errors
  - Enhanced logging for debugging and verification of metadata inclusion
  - Preserves all existing appointment booking functionality while adding traceability
- June 20, 2025. **Authentication Pages Logo Enhancement**:
  - Added GoZupees company logo to login and signup page headers
  - Updated branding from "VoiceBuilder AI" to "VoiceBuilder" with logo integration
  - Maintained consistent visual identity across all authentication flows
  - Confirmed assistant creation and quick-setup routes remain fully functional after database changes
- June 20, 2025. **Business Information Database Schema Update**:
  - Removed unique constraint on tenantId in business_info table to support multiple business records per tenant
  - Fixed Sandeep Bansal's business data by creating correct records for both FABL and New Money Insider assistants
  - Updated business_info table with accurate websites, contact information, and business descriptions
  - Enhanced data structure to properly support business information display grouped by assistant
  - Fixed duplicate display issue in Account Settings by improving SQL join conditions
- June 20, 2025. **Business Information Preservation Fix**:
  - Fixed critical issue where creating multiple assistants for same tenant was overwriting business_info records
  - Updated quick-setup assistant creation to preserve existing business information instead of updating it
  - Enhanced Account Settings to display business information grouped by assistant name
  - Implemented new backend endpoint /api/assistants-with-business to fetch assistants with their business details
  - Business information now shows per assistant with comprehensive details and contact information
  - Maintains data integrity across multiple assistant creation while preserving existing functionality
- June 20, 2025. **Account Settings Implementation Complete**:
  - Added comprehensive Account Settings section with profile management functionality
  - Implemented profile information form for updating name and email with validation
  - Created enhanced business information display with clickable links and detailed layout
  - Added secure password change functionality with current password verification
  - Implemented backend API endpoints for profile updates and password changes with proper error handling
  - Enhanced business details section with gradient backgrounds, contact links, and setup completion date
  - Added empty state handling for users without business information
- June 20, 2025. **VoiceBuilder Branding Implementation**:
  - Updated browser title from "VoiceFlow Pro" to "VoiceBuilder - AI Assistant Onboarding"
  - Implemented new GoZupees logo as favicon and throughout the application
  - Updated home page navigation and footer with VoiceBuilder branding and logo
  - Replaced all "VoiceFlow Pro" references with "VoiceBuilder" across the platform
  - Added proper Vite asset imports for logo files and consistent brand presentation
  - Enhanced user experience with cohesive visual identity throughout the application
- June 20, 2025. **Appointment Booking Toggle State Persistence Fix**:
  - Added appointment_booking_enabled field to /api/assistants endpoint for proper state management
  - Implemented PostgreSQL boolean to JavaScript boolean conversion for toggle consistency
  - Enhanced database query with COALESCE for reliable default values
  - Fixed toggle state loading from database on page refresh instead of resetting to false
  - Ensured appointment booking status persists correctly across user sessions and page reloads
- June 20, 2025. **Calendar Disconnect Prompt Cleaning Enhancement**:
  - Enhanced calendar disconnect to properly remove all calendar integration instructions from system prompts
  - Added comprehensive prompt cleaning logic matching configure-assistant.tsx removal patterns
  - Implemented removal of "Tool Invocation Logic" sections and calendar-specific instruction blocks
  - Updated both VAPI assistant configuration and database system_prompt fields simultaneously
  - Ensured complete alignment between VAPI and database states during calendar disconnection
- June 20, 2025. **Database Synchronization Fix for Assistant Configuration**:
  - Fixed critical issue where prompt updates were saved to VAPI but not database, causing old prompts to reappear after login
  - Added appointment_booking_enabled boolean field to assistants table for persistent toggle state
  - Updated /api/assistant/:assistantId/update endpoint to save system_prompt and appointment_booking_enabled to database
  - Created new /api/assistant/:assistantId/toggle-booking endpoint for toggle state persistence
  - Modified frontend to use database fields instead of checking VAPI directly for appointment booking state
  - Updated assistant queries to include appointment_booking_enabled field
  - Frontend now properly initializes toggle state from database on component load
  - Both prompt updates and toggle changes now persist correctly across user sessions
- June 20, 2025. **Home Page Statistics Section Enhancement**:
  - Added animated statistics section between hero and features sections
  - Implemented CountUpNumber component with intersection observer triggers
  - Updated statistics to match business-focused metrics: 12M+ interactions, 4x faster replies, 40% more conversions, 99.99% uptime
  - Added "Real Results, No Extra Headcount" header with professional styling
  - Created smooth counting animations with easing functions for engaging user experience
- June 19, 2025. **Quick-Setup Assistant Creation Fix**:
  - Fixed critical bug where assistant creation failed after knowledge base upload
  - Added missing business_info record creation in assistant creation transaction
  - Enhanced error logging and debugging for assistant creation failures
  - Improved transaction rollback handling to prevent partial data corruption
  - Fixed TypeScript errors in error handling throughout the codebase
- June 19, 2025. **Authentication UI Cleanup**:
  - Removed Google and GitHub social login buttons from login and signup pages
  - Streamlined authentication forms to focus on email/password registration
  - Cleaned up visual design by removing social login dividers and buttons
  - Maintained consistent dark theme and user experience
- June 19, 2025. **Frontend Route Protection Implementation**:
  - Created ProtectedRoute component for securing tenant-specific pages
  - Implemented authentication-based redirects for unauthorized access attempts
  - Protected routes: /dashboard, /quick-setup, /configure-assistant/*, /quick-setup/success
  - Public routes remain accessible: /, /login, /signup
  - Added loading state during authentication verification
  - Automatic redirect to /login for unauthenticated users
  - Preserves existing functionality for authenticated users
- June 19, 2025. **Appointment Booking Toggle Implementation Complete**:
  - Added "Enable Appointment Booking" toggle switch in assistant configuration sidebar
  - Implemented VAPI API integration to dynamically add/remove calendar booking tools
  - Successfully configured Google_Calendar_Availability and Google_Calendar_Event function tools
  - Added comprehensive tool usage instructions to assistant system prompts
  - Configured webhook URLs to point to existing calendar integration endpoints
  - Implemented proper error handling and debug logging for VAPI API calls
  - Toggle only appears when Google Calendar is connected and shows correct on/off state
  - Variables (tenantId, assistantId) are passed through webhook request bodies to calendar endpoints
- June 19, 2025. **Calendar Booking and Availability Integration Complete**:
  - Implemented POST /api/calendar/availability endpoint for VAPI integration with real Google Calendar data
  - Added Google Calendar API integration using freebusy query for availability checking
  - Configured 30-minute slot generation for weekdays 9 AM to 5 PM in Europe/London timezone
  - Implemented POST /api/calendar/book endpoint for appointment creation via VAPI
  - Added complete calendar event creation with attendees, reminders, and email notifications
  - Both endpoints use tenant-based credential lookup and access token validation
  - Implemented comprehensive error handling for API permissions and missing credentials
  - Returns proper JSON responses for VAPI consumption: {"slots": [...]} and {"success": true, "eventId": "..."}
  - Successfully tested with real Google Calendar API integration
- June 18, 2025. **Google Calendar OAuth Integration Implementation**:
  - Created secure calendar_credentials database table with encrypted token storage
  - Implemented complete Google Calendar OAuth flow with token refresh capabilities
  - Added OAuth endpoints: GET /api/oauth/google/init and GET /api/oauth/google/callback
  - Built calendar integration UI with real-time connection status and disconnect functionality
  - Added calendar status API to track Google Calendar connections
  - Configured redirect URI for production domain: https://voice-builder.gozupees.com/api/oauth/google/callback
- June 18, 2025. **Voice Assistant Testing System Redesign**:
  - Replaced problematic widget system with clean "Talk To Assistant" button using VAPI web SDK
  - Eliminated widget conflicts that caused multiple instances and cross-assistant contamination
  - Added connection state management with visual feedback (Connecting/Active/Ready states)
  - Removed all conflicting widget loading code from configuration pages
  - Each assistant configuration page now uses correct assistant ID for voice testing
  - Maintained widget-production.js for external website embedding (separate from internal testing)
- June 18, 2025. **Complete Knowledge Base Cross-Contamination Fix**:
  - Fixed root cause: auto-sync logic was updating wrong assistants with new KB files
  - Removed problematic auto-sync that updated first assistant found for tenant
  - Fixed database unique constraints preventing proper file sequence management
  - Protected business_info from overwriting to maintain data integrity
  - Added business_name column to kb_files table with proper filtering
  - Restored correct knowledge base files for existing assistants in VAPI
  - Verified complete data isolation between different businesses per tenant
- June 18, 2025. **Complete ElevenLabs Voice Integration**:
  - Implemented comprehensive ElevenLabs voice system with 12 verified working voices
  - Added male voices: Adam, Josh, Arnold, Sam (all tested and confirmed working)
  - Added female voices: Bella, Rachel, Domi, Elli, Sarah, Charlie, Grace, Lily (all tested and confirmed working)
  - Replaced text input with dropdown for assistant voice/name selection
  - Updated VAPI service to use actual ElevenLabs voice IDs instead of preset names
  - Resolved ElevenLabs API key conflicts by removing duplicate credentials from environment
  - Simplified VAPI payload structure to prevent credential detection issues
  - Confirmed complete integration with existing FABL knowledge base files
  - Fixed tenant table corruption issue where assistant creation was overwriting user credentials
  - Ensured proper tenant data preservation during assistant creation process
- June 18, 2025. **Dashboard User Isolation Fix**:
  - Fixed dashboard showing same assistants for all users due to query caching
  - Added user-specific query keys to prevent cross-user data sharing
  - Each authenticated user now sees only their own assistants and business data
  - Enhanced authentication flow with proper session-based data isolation
- June 17, 2025. **Authentication System Implementation**:
  - Created login and signup pages with dark theme matching home page design
  - Implemented comprehensive form validation with password strength indicators
  - Added social login options (Google, GitHub) and remember me functionality
  - Designed responsive authentication flow with security messaging
  - Connected navigation links between home, login, and signup pages
  - Maintained consistent dark aesthetic and user experience across auth pages
- June 17, 2025. **Professional Home Page Design Implementation**:
  - Created high-end marketing landing page with clean aesthetics and animations
  - Implemented gradient backgrounds, smooth transitions, and interactive elements
  - Added comprehensive feature showcase, testimonials, and industry coverage
  - Integrated call-to-action buttons directing to quick-setup flow
  - Designed responsive layout with dark mode support and modern UI components
  - Maintained separation between marketing (home) and functional (quick-setup) flows
- June 17, 2025. **Complete Removal of Onboarding Questionnaire System**:
  - Removed onboarding questionnaire route and all related API endpoints
  - Deleted onboarding page and all associated component files
  - Updated router to use quick-setup as root path for streamlined user experience
  - Cleaned up shared API and schema files removing unused onboarding types
  - Removed unused constants and documentation references to multi-step onboarding
  - Simplified system to use only quick-setup approach which works perfectly
- June 17, 2025. **Major Codebase Cleanup and Optimization**:
  - Removed all test files and mock data generators for production readiness
  - Cleaned up legacy storage system and unused imports/functions
  - Removed backup routes file and unnecessary documentation artifacts
  - Fixed assistant naming consistency between creation and updates
  - Streamlined database operations and removed unused kb_meta legacy code
  - Optimized file structure by removing attached assets and test artifacts
  - Enhanced code maintainability while preserving all core functionality
- June 17, 2025. **Major Architecture Update**: Implemented raw content approach for knowledge base creation
  - Replaced AI chunking with direct raw content upload to VAPI (preserves 90%+ more information)
  - Created `kb_files` table for tracking multiple 300KB knowledge base files per tenant
  - Updated scraping process to split content into sequential files based on size limits
  - Modified VAPI integration to support multiple knowledge base files per assistant
  - Improved content cleaning to remove navigation/ads while preserving meaningful content
  - Enhanced assistant creation to handle arrays of knowledge base file IDs
- June 16, 2025. Initial setup
- December 16, 2024. Updated VAPI assistant creation to use GPT-4o Mini and specific ElevenLabs voice (4bwwbsa70lmv7rmg0acs)
- December 16, 2024. Implemented knowledge base file preservation during assistant updates
- December 16, 2024. Added file upload functionality with visual distinction in knowledge base entries

## Authentication System

The platform now includes a complete authentication system that integrates with the existing tenant-based architecture:

### Implementation Details
- **User Registration**: Stores username in tenants.name field, email in tenants.email, and hashed password using bcrypt
- **Session Management**: Express sessions with server-side storage for authenticated user state
- **API Protection**: Authentication middleware protects all quick-setup and dashboard endpoints
- **User Flow**: Signup → Quick Setup → Dashboard, Login → Dashboard
- **Data Isolation**: Each authenticated user's data is isolated by their tenant ID from the session

### Technical Architecture
- **Backend**: Express sessions with bcrypt password hashing and authentication middleware
- **Frontend**: Session-based authentication with automatic redirects and error handling
- **Database**: Extended tenants table with password field, maintaining existing multi-tenant structure
- **Security**: Secure session cookies with httpOnly and proper CORS handling

## User Preferences

Preferred communication style: Simple, everyday language.