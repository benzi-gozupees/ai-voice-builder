import { pgTable, text, serial, integer, boolean, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  industry: text("industry").notNull(),
  phone: text("phone").notNull(),
  location: text("location").notNull(),
  website: text("website").notNull(),
  scrapedContent: jsonb("scraped_content"),
  businessHours: jsonb("business_hours"),
  services: jsonb("services"),
  appointmentSettings: jsonb("appointment_settings"),
  calendarProvider: text("calendar_provider"),
  calendarConnected: boolean("calendar_connected").default(false),
  assistantCreated: boolean("assistant_created").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarCredentials = pgTable("calendar_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  provider: text("provider").notNull(), // 'google' or 'outlook'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date"),
  userEmail: text("user_email"), // Store the connected email for display
  createdAt: timestamp("created_at").defaultNow(),
});

export const assistantCalendars = pgTable("assistant_calendars", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  googleCalendarId: text("google_calendar_id").notNull(),
  calendarName: text("calendar_name").notNull(),
  userEmail: text("user_email").notNull(), // Which Google account it was created in
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  assistantId: text("assistant_id").notNull(),
  calendarEventId: text("calendar_event_id").notNull().unique(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  summary: text("summary").notNull(),
  description: text("description"),
  email: text("email"),
  phone: text("phone"),
  service: text("service"),
  patientType: text("patient_type"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

export const callLogs = pgTable("call_logs", {
  id: text("id").primaryKey(), // VAPI call ID
  tenantId: text("tenant_id").notNull(),
  assistantId: text("assistant_id").notNull(),
  assistantName: text("assistant_name").notNull(),
  phoneCustomer: text("phone_customer"),
  phoneAssistant: text("phone_assistant"),
  startedAt: timestamp("started_at").notNull(),
  duration: integer("duration").notNull(), // in seconds
  result: text("result"), // pass, fail, null
  endedReason: text("ended_reason").notNull(),
  audioUrl: text("audio_url"),
  transcript: jsonb("transcript"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

// Analytics tables - completely separate from existing functionality
export const analyticsDailySummary = pgTable("analytics_daily_summary", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  totalCalls: integer("total_calls").default(0),
  successfulCalls: integer("successful_calls").default(0),
  totalAppointments: integer("total_appointments").default(0),
  avgCallDuration: integer("avg_call_duration").default(0), // in seconds
  totalCallTime: integer("total_call_time").default(0), // in seconds
  sentimentPositive: integer("sentiment_positive").default(0),
  sentimentNeutral: integer("sentiment_neutral").default(0),
  sentimentNegative: integer("sentiment_negative").default(0),
  avgSentimentScore: integer("avg_sentiment_score").default(0), // 0-100 scale
  callOutcomes: jsonb("call_outcomes"), // {completed: 5, no_answer: 2, dropped: 1}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callSentimentAnalysis = pgTable("call_sentiment_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: text("call_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  sentimentScore: integer("sentiment_score").notNull(), // 0-100 scale
  sentimentLabel: text("sentiment_label").notNull(), // positive, neutral, negative
  keyTopics: jsonb("key_topics"), // array of extracted topics
  analyzedAt: timestamp("analyzed_at").defaultNow(),
});

export const assistantPerformanceDaily = pgTable("assistant_performance_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: text("assistant_id").notNull(),
  assistantName: text("assistant_name").notNull(),
  tenantId: text("tenant_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  callCount: integer("call_count").default(0),
  appointmentCount: integer("appointment_count").default(0),
  avgDuration: integer("avg_duration").default(0), // in seconds
  sentimentAvg: integer("sentiment_avg").default(0), // 0-100 scale
  successRate: integer("success_rate").default(0), // percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const industryPrompts = pgTable("industry_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  industry: text("industry").notNull().unique(),
  displayName: text("display_name").notNull(),
  promptTemplate: text("prompt_template"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarCredentialsSchema = createInsertSchema(calendarCredentials).omit({
  id: true,
  createdAt: true,
});

export const insertAssistantCalendarSchema = createInsertSchema(assistantCalendars).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  syncedAt: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  syncedAt: true,
});

export const insertAnalyticsDailySummarySchema = createInsertSchema(analyticsDailySummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallSentimentAnalysisSchema = createInsertSchema(callSentimentAnalysis).omit({
  id: true,
  analyzedAt: true,
});

export const insertAssistantPerformanceDailySchema = createInsertSchema(assistantPerformanceDaily).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndustryPromptsSchema = createInsertSchema(industryPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertCalendarCredentials = z.infer<typeof insertCalendarCredentialsSchema>;
export type CalendarCredentials = typeof calendarCredentials.$inferSelect;
export type InsertAssistantCalendar = z.infer<typeof insertAssistantCalendarSchema>;
export type AssistantCalendar = typeof assistantCalendars.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

// Analytics types
export type InsertAnalyticsDailySummary = z.infer<typeof insertAnalyticsDailySummarySchema>;
export type AnalyticsDailySummary = typeof analyticsDailySummary.$inferSelect;
export type InsertCallSentimentAnalysis = z.infer<typeof insertCallSentimentAnalysisSchema>;
export type CallSentimentAnalysis = typeof callSentimentAnalysis.$inferSelect;
export type InsertAssistantPerformanceDaily = z.infer<typeof insertAssistantPerformanceDailySchema>;
export type AssistantPerformanceDaily = typeof assistantPerformanceDaily.$inferSelect;
export type InsertIndustryPrompts = z.infer<typeof insertIndustryPromptsSchema>;
export type IndustryPrompts = typeof industryPrompts.$inferSelect;

// Zod schemas for validation
export const businessDetailsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  phone: z.string().min(1, "Phone number is required"),
  location: z.string().min(1, "Location is required"),
  website: z.string().url("Valid website URL is required"),
});

export const scrapedContentSchema = z.object({
  business_intro: z.string(),
  services: z.array(z.string()),
  policies: z.string(),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(0, "Price must be non-negative"),
});

export const businessHoursSchema = z.object({
  monday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
  tuesday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
  wednesday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
  thursday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
  friday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
  saturday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
  sunday: z.object({ open: z.boolean(), start: z.string(), end: z.string() }),
});

export const configurationSchema = z.object({
  businessHours: businessHoursSchema,
  appointmentLength: z.number().min(15),
  bufferTime: z.number().min(0),
  services: z.array(serviceSchema),
});

export const calendarConnectionSchema = z.object({
  provider: z.enum(["google", "outlook"]),
  connected: z.boolean(),
});

export const onboardingSubmissionSchema = z.object({
  businessDetails: businessDetailsSchema,
  scrapedContent: scrapedContentSchema,
  configuration: configurationSchema,
  calendar: calendarConnectionSchema,
});

export type BusinessDetails = z.infer<typeof businessDetailsSchema>;
export type ScrapedContent = z.infer<typeof scrapedContentSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type BusinessHours = z.infer<typeof businessHoursSchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type CalendarConnection = z.infer<typeof calendarConnectionSchema>;
export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>;
