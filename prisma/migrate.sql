-- Initial migration for SME AI Voice Assistant platform
-- This creates all the necessary tables for multi-tenant architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SME tenant accounts table
CREATE TABLE "tenants" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "phone" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Business information from onboarding
CREATE TABLE "business_info" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID UNIQUE NOT NULL,
    "businessName" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(100) NOT NULL,
    "website" VARCHAR(500),
    "location" VARCHAR(255),
    "description" TEXT,
    "businessHours" JSONB,
    "services" JSONB,
    "contactEmail" VARCHAR(255),
    "contactPhone" VARCHAR(50),
    "appointmentSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- OAuth calendar tokens
CREATE TABLE "calendar_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
    UNIQUE("tenantId", "provider")
);

-- VAPI assistants
CREATE TABLE "assistants" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID UNIQUE NOT NULL,
    "vapiAssistantId" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "voice" VARCHAR(100),
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" VARCHAR(50),
    "webhookUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Dynamic tools and webhooks
CREATE TABLE "tools" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "toolType" VARCHAR(100) NOT NULL,
    "webhookUrl" VARCHAR(500) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Knowledge base content
CREATE TABLE "knowledge_base" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "source" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "idx_tenants_email" ON "tenants"("email");
CREATE INDEX "idx_business_info_tenant_id" ON "business_info"("tenantId");
CREATE INDEX "idx_calendar_tokens_tenant_id" ON "calendar_tokens"("tenantId");
CREATE INDEX "idx_calendar_tokens_provider" ON "calendar_tokens"("provider");
CREATE INDEX "idx_assistants_tenant_id" ON "assistants"("tenantId");
CREATE INDEX "idx_assistants_vapi_id" ON "assistants"("vapiAssistantId");
CREATE INDEX "idx_tools_tenant_id" ON "tools"("tenantId");
CREATE INDEX "idx_tools_type" ON "tools"("toolType");
CREATE INDEX "idx_knowledge_base_tenant_id" ON "knowledge_base"("tenantId");
CREATE INDEX "idx_knowledge_base_content_type" ON "knowledge_base"("contentType");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON "tenants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_info_updated_at BEFORE UPDATE ON "business_info" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_tokens_updated_at BEFORE UPDATE ON "calendar_tokens" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON "assistants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON "tools" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON "knowledge_base" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();