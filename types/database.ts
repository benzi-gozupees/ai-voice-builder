// Database types and interfaces for the SME AI Voice Assistant platform

export interface Tenant {
  id: string;
  email: string;
  name: string;
  password?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  email: string;
  name: string;
  password: string;
  phone?: string;
}

export interface UpdateTenantInput {
  email?: string;
  name?: string;
  phone?: string;
  isActive?: boolean;
}

export interface BusinessInfo {
  id: string;
  tenantId: string;
  businessName: string;
  industry: string;
  website?: string;
  location?: string;
  description?: string;
  businessHours?: BusinessHours;
  services?: Service[];
  contactEmail?: string;
  contactPhone?: string;
  appointmentSettings?: AppointmentSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price?: number;
}

export interface AppointmentSettings {
  appointmentLength: number; // in minutes
  bufferTime: number; // in minutes
  maxAdvanceBooking: number; // in days
  minAdvanceBooking: number; // in hours
}

export interface CreateBusinessInfoInput {
  tenantId: string;
  businessName: string;
  industry: string;
  website?: string;
  location?: string;
  description?: string;
  businessHours?: BusinessHours;
  services?: Service[];
  contactEmail?: string;
  contactPhone?: string;
  appointmentSettings?: AppointmentSettings;
}

export interface CalendarToken {
  id: string;
  tenantId: string;
  provider: 'google' | 'outlook';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalendarTokenInput {
  tenantId: string;
  provider: 'google' | 'outlook';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface Assistant {
  id: string;
  tenantId: string;
  vapiAssistantId: string;
  name: string;
  voice?: string;
  instructions?: string;
  isActive: boolean;
  phoneNumber?: string;
  webhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssistantInput {
  tenantId: string;
  vapiAssistantId: string;
  name: string;
  voice?: string;
  instructions?: string;
  phoneNumber?: string;
  webhookUrl?: string;
}

export interface UpdateAssistantInput {
  name?: string;
  voice?: string;
  instructions?: string;
  isActive?: boolean;
  phoneNumber?: string;
  webhookUrl?: string;
}

export interface Tool {
  id: string;
  tenantId: string;
  toolType: ToolType;
  webhookUrl: string;
  isActive: boolean;
  config?: ToolConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type ToolType = 
  | 'calendar_booking'
  | 'availability_check'
  | 'appointment_cancel'
  | 'appointment_reschedule'
  | 'business_hours_check';

export interface ToolConfig {
  calendarId?: string;
  timeZone?: string;
  bufferTime?: number;
  maxBookingDays?: number;
  [key: string]: any;
}

export interface CreateToolInput {
  tenantId: string;
  toolType: ToolType;
  webhookUrl: string;
  config?: ToolConfig;
}

export interface KnowledgeBase {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  contentType: ContentType;
  source?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentType =
  | 'faq'
  | 'policy'
  | 'service_info'
  | 'business_info'
  | 'contact_info'
  | 'pricing'
  | 'general';

export interface CreateKnowledgeBaseInput {
  tenantId: string;
  title: string;
  content: string;
  contentType: ContentType;
  source?: string;
}

export interface UpdateKnowledgeBaseInput {
  title?: string;
  content?: string;
  contentType?: ContentType;
  source?: string;
  isActive?: boolean;
}

// Complete tenant data with all relationships
export interface TenantWithRelations extends Tenant {
  businessInfo?: BusinessInfo;
  assistant?: Assistant;
  calendarTokens: CalendarToken[];
  tools: Tool[];
  knowledgeBase: KnowledgeBase[];
}