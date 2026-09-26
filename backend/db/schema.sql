CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'OPERATIONS_MANAGER',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ELECTRICITY','WATER','FUEL','MATERIAL')),
  unit TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "locationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  "resourceId" UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  "recordedAt" TIMESTAMPTZ NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "locationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  "outputQuantity" NUMERIC NOT NULL CHECK ("outputQuantity" >= 0),
  unit TEXT NOT NULL,
  "recordedAt" TIMESTAMPTZ NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "locationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  "resourceId" UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  "currentValue" NUMERIC NOT NULL,
  "baselineValue" NUMERIC NOT NULL,
  "changePercent" NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  "detectedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATED','RESOLVED','ARCHIVED')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "anomalyId" UUID NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  "possibleFactors" JSONB NOT NULL,
  "investigationChecklist" JSONB NOT NULL,
  "recommendedActions" JSONB NOT NULL,
  "monitoringPlan" TEXT NOT NULL,
  "rawResponse" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "insightId" UUID REFERENCES ai_insights(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('HIGH','MEDIUM','LOW')),
  "assignedTo" UUID REFERENCES users(id) ON DELETE SET NULL,
  "locationId" UUID REFERENCES locations(id) ON DELETE SET NULL,
  "dueDate" DATE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','ARCHIVED')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "actionId" UUID NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  "beforeValue" NUMERIC NOT NULL CHECK ("beforeValue" > 0),
  "afterValue" NUMERIC NOT NULL CHECK ("afterValue" >= 0),
  "percentageChange" NUMERIC NOT NULL,
  "resourceId" UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  "measuredAt" TIMESTAMPTZ NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users("organizationId");
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations("organizationId");
CREATE INDEX IF NOT EXISTS idx_resources_org ON resources("organizationId");
CREATE INDEX IF NOT EXISTS idx_consumption_org_date ON consumption_records("organizationId", "recordedAt");
CREATE INDEX IF NOT EXISTS idx_consumption_resource_location ON consumption_records("resourceId", "locationId", "recordedAt");
CREATE INDEX IF NOT EXISTS idx_production_org_date ON production_records("organizationId", "recordedAt");
CREATE INDEX IF NOT EXISTS idx_anomalies_org_status ON anomalies("organizationId", status);
CREATE INDEX IF NOT EXISTS idx_anomalies_org_detected ON anomalies("organizationId", "detectedAt");
CREATE INDEX IF NOT EXISTS idx_insights_org ON ai_insights("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_actions_org_status ON action_items("organizationId", status);
CREATE INDEX IF NOT EXISTS idx_outcomes_org_date ON outcomes("organizationId", "measuredAt");
