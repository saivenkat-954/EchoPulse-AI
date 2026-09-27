# EcoPulse AI

> **Don't just measure waste. Find it. Explain it. Fix it.**

Live Demo: https://echo-pulse-ai-54.vercel.app
GitHub: https://github.com/saivenkat-954/EchoPulse-AI

EcoPulse AI is a full-stack **Resource Intelligence & Action Platform** for facilities, offices, educational institutions, and small organizations.

It turns resource-consumption data into a closed operational loop:

**DATA → ANALYTICS → DETECTION → AI INVESTIGATION → ACTION → OUTCOME**

---

## The Problem

Organizations collect electricity, water, fuel, and material usage data, but raw numbers do not answer the questions operators need:

- What changed?
- Where did it change?
- Is the change abnormal?
- What might be contributing to it?
- What should be investigated?
- What action should be taken?
- Did the situation improve afterward?

EcoPulse AI connects measurement, investigation, execution, and verification in one workflow.

---

## The Solution

EcoPulse AI detects abnormal resource usage, builds an evidence pack from the organization's stored data, uses Gemini to interpret the evidence and suggest investigation steps, turns recommendations into trackable actions, and records the observed result after the action.

The product is designed around one principle:

> **Don't stop at detection. Close the loop.**

---

## Core Workflow

```text
┌──────────────────────┐
│  Resource Data       │
│  Electricity         │
│  Water               │
│  Fuel                │
│  Material            │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Deterministic        │
│ Analytics            │
│ Baseline / Trends    │
│ Intensity / Compare  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Anomaly Detection    │
│ Baseline Deviation   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Evidence Pack        │
│ Historical Data      │
│ Production           │
│ Cost / Peers         │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Gemini Investigation │
│ Explain the pattern  │
│ Possible factors     │
│ Checklist            │
│ Recommended actions  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Action Center        │
│ OPEN → IN PROGRESS   │
│      → COMPLETED     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Outcome Verification │
│ Before → After       │
│ Observed change      │
└──────────────────────┘
```

---

# Key Features

## Resource Management

Track operational resource consumption across:

- Electricity
- Water
- Fuel
- Material

Each consumption record can include:

- Resource
- Location
- Quantity
- Unit
- Cost
- Recorded date
- Notes

Production records can be associated with locations so resource usage can be normalized against output.

---

## Deterministic Analytics

EcoPulse calculates core metrics in application code.

Gemini is **not** used for basic arithmetic.

The analytics layer calculates:

- Current-period total
- Previous-period total
- Historical baseline
- Percentage change
- Consumption trends
- Location comparisons
- Resource comparisons
- Production-normalized consumption
- Consumption intensity

Example:

```text
percentageChange =
((current - baseline) / baseline) × 100
```

---

## Transparent Anomaly Detection

EcoPulse starts with a transparent **baseline-deviation detection** method.

```text
Absolute deviation >= 30%  → HIGH
15% to < 30%               → MEDIUM
< 15%                      → Normal range
```

The system does not represent this rule as machine learning. The purpose is to make the detected signal explainable and auditable.

---

# Evidence-First AI

The central AI feature is **AI Investigation**.

EcoPulse does not send an empty prompt such as:

> "Why did electricity increase?"

Instead, the backend first gathers evidence from the workspace.

### Evidence can include

- Current resource value
- Historical consumption
- Calculated baseline
- Previous reading
- Production output
- Consumption intensity
- Cost history
- Record count
- Peer-location comparisons
- Anomaly severity
- Historical trend

Then the backend sends that evidence to Gemini for interpretation.

### AI output

The investigation can return:

```text
Summary
Why the pattern looks this way
Possible contributing factors
Investigation checklist
Recommended actions
Monitoring plan
```

The AI is instructed to distinguish:

```text
OBSERVED FACT
        ≠
POSSIBLE EXPLANATION
```

Possible causes are therefore presented as hypotheses to investigate rather than unsupported facts.

---

# Example Investigation

A demonstration scenario uses:

```text
Location: Production Floor A
Resource: Electricity

Baseline:  980 kWh
Current:  1240 kWh

Deviation: +26.5%
Production change: ~+1%
```

The important signal is that resource consumption increased much more than output.

EcoPulse can then investigate:

```text
Why did consumption increase?

↓
Check historical trend
↓
Compare production intensity
↓
Compare peer locations
↓
Review recent readings
↓
Generate possible explanations
↓
Recommend investigation steps
```

---

# Action Center

AI recommendations become real operational work.

### Lifecycle

```text
OPEN
  ↓
IN_PROGRESS
  ↓
COMPLETED
```

Actions can contain:

- Title
- Description
- Priority
- Location
- Assigned user
- Due date
- Status
- Linked AI insight

The action is persisted in PostgreSQL, so the workflow is not just a visual state change.

---

# Outcome Verification

After an action is completed, the user can record the next measurement.

Example:

```text
BEFORE
1240 kWh

AFTER
1050 kWh

OBSERVED CHANGE
-15.3%
```

EcoPulse deliberately uses the wording:

> **Observed change after intervention**

It does not automatically claim that the intervention caused the entire change.

---

# AI Architecture

Gemini is a **backend-only capability**.

```text
React Frontend
      │
      │ HTTPS / REST
      ▼
Node.js + Express
      │
      ├──────────────► PostgreSQL
      │
      ▼
Evidence Builder
      │
      ▼
Gemini API
      │
      ▼
Structured JSON
      │
      ▼
Zod Validation
      │
      ▼
Persisted AI Insight
```

### Security principles

- Gemini API key is stored server-side.
- No Gemini secret is exposed through frontend code.
- JWT is used for authenticated requests.
- Passwords are hashed with bcrypt.
- Request bodies are validated with Zod.
- AI responses are validated with Zod.
- Protected endpoints enforce organization ownership.
- Production secrets are provided through environment variables.

---

# Tech Stack

## Frontend

- React
- Vite
- React Router
- Axios
- Lucide React
- Recharts
- Responsive CSS

## Backend

- Node.js
- Express.js
- JWT
- bcrypt
- Zod
- Helmet
- CORS
- REST APIs

## Database

- PostgreSQL
- `pg`
- Foreign keys
- Indexed tables
- Persistent timestamps
- Organization-scoped data

## AI

- Google Gemini API
- `@google/genai`
- Backend-only AI calls
- Structured JSON output
- Zod validation

## Deployment

- Vercel
- PostgreSQL / Supabase-compatible PostgreSQL

---

# Architecture

```text
                         ┌─────────────────────┐
                         │      Browser        │
                         │   React + Vite      │
                         └──────────┬──────────┘
                                    │
                                    │ REST / HTTPS
                                    ▼
                         ┌─────────────────────┐
                         │   Express API       │
                         │ JWT + Zod + Helmet  │
                         └───────┬───────┬─────┘
                                 │       │
                    ┌────────────┘       └──────────────┐
                    ▼                                   ▼
          ┌──────────────────┐                 ┌─────────────────┐
          │   PostgreSQL     │                 │   Gemini API    │
          │ Resource Data    │                 │ AI Investigation│
          │ Actions/Outcomes │                 └─────────────────┘
          └──────────────────┘
```

---

# Project Structure

```text
EcoPulse-AI/
│
├── api/
│   └── index.js
│
├── backend/
│   ├── db/
│   │   ├── index.js
│   │   ├── schema.sql
│   │   └── seed.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── organizations.js
│   │   ├── locations.js
│   │   ├── resources.js
│   │   ├── consumption.js
│   │   ├── production.js
│   │   ├── analytics.js
│   │   ├── anomalies.js
│   │   ├── ai.js
│   │   ├── insights.js
│   │   ├── actions.js
│   │   └── outcomes.js
│   │
│   ├── services/
│   │   ├── analyticsService.js
│   │   └── aiService.js
│   │
│   └── index.js
│
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── package.json
├── package-lock.json
├── vercel.json
├── .gitignore
└── README.md
```

---

# Database Model

```text
Organization
│
├── Users
├── Locations
├── Resources
├── Consumption Records
├── Production Records
├── Anomalies
├── AI Insights
├── Action Items
└── Outcomes
```

Core tables:

```text
users
organizations
locations
resources
consumption_records
production_records
anomalies
ai_insights
action_items
outcomes
```

---

# API Overview

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Workspace

```text
GET /api/organizations/current
```

## Locations

```text
GET    /api/locations
POST   /api/locations
PUT    /api/locations/:id
DELETE /api/locations/:id
```

## Resources

```text
GET    /api/resources
POST   /api/resources
PUT    /api/resources/:id
DELETE /api/resources/:id
```

## Consumption

```text
GET    /api/consumption
POST   /api/consumption
PUT    /api/consumption/:id
DELETE /api/consumption/:id
```

## Production

```text
GET  /api/production
POST /api/production
```

## Analytics

```text
GET /api/analytics/dashboard
GET /api/analytics/trends
GET /api/analytics/what-changed
GET /api/analytics/efficiency-score
```

## Anomalies

```text
GET  /api/anomalies
POST /api/anomalies/detect
```

## AI

```text
GET  /api/ai/status
POST /api/ai/investigate
```

## Insights

```text
GET /api/insights
GET /api/insights/:id
```

## Actions

```text
GET    /api/actions
POST   /api/actions
PUT    /api/actions/:id
PATCH  /api/actions/:id/status
DELETE /api/actions/:id
```

## Outcomes

```text
GET  /api/outcomes
POST /api/outcomes
```

---

# Local Development

## Requirements

- Node.js
- npm
- PostgreSQL
- Gemini API key for live Gemini investigations

## Installation

```bash
npm install
npm run install:all
```

## Environment

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_configured_gemini_model
JWT_SECRET=your_long_random_secret
PORT=4000
FRONTEND_URL=http://localhost:5173
```

Never commit a real `.env` file.

## Seed Demo Data

```bash
npm run seed:force
```

## Start

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

---

# Demo Credentials

```text
Email:    demo@ecopulse.ai
Password: EcoPulse@2026
```

---

# Production Deployment

EcoPulse can be deployed as a Vercel application using the repository's frontend build and API entrypoint.

Production flow:

```text
Vercel
│
├── React/Vite frontend
│
└── /api
     │
     └── Express backend
          ├── PostgreSQL
          └── Gemini API
```

Configure the following in Vercel:

```env
DATABASE_URL=
GEMINI_API_KEY=
GEMINI_MODEL=
JWT_SECRET=
FRONTEND_URL=
```

Do not expose private credentials through `VITE_*` variables.

---

# Live Project

**Live application:**  
https://echo-pulse-ai-54.vercel.app

**GitHub repository:**  
https://github.com/saivenkat-954/EchoPulse-AI

---

# Testing Checklist

Before a release, verify:

```text
[ ] Registration
[ ] Login
[ ] Logout
[ ] Protected routes
[ ] Resource CRUD
[ ] Consumption CRUD
[ ] Search / filtering
[ ] Analytics
[ ] Anomaly detection
[ ] AI status
[ ] AI investigation
[ ] Structured AI response
[ ] Action creation
[ ] Action status changes
[ ] Outcome creation
[ ] Database persistence
[ ] Refresh persistence
[ ] Unauthorized access protection
[ ] Organization isolation
```

---

# Demo Flow

For a short product demonstration:

```text
Login
  ↓
Dashboard
  ↓
Show resource deviation
  ↓
Open Alert
  ↓
Investigate with AI
  ↓
Show workspace evidence
  ↓
Show AI explanation
  ↓
Show recommended action
  ↓
Create Action
  ↓
OPEN
  ↓
IN_PROGRESS
  ↓
COMPLETED
  ↓
Record Outcome
  ↓
Before → After
  ↓
Refresh
  ↓
Show persisted result
```

---

# Product Principles

### Evidence before explanation

AI receives structured workspace evidence before it explains a pattern.

### Deterministic metrics

Core calculations are performed by the application, not by a language model.

### Action over insight

An AI recommendation should be convertible into real operational work.

### Verification over claims

Outcomes report measured changes without automatically claiming causality.

### Security by design

Authentication, authorization, validation, and secret management are part of the product architecture.

---

# Roadmap

Potential future improvements:

- Role-based permissions beyond the current workspace model
- More advanced anomaly detection
- Forecasting and threshold alerts
- Equipment-level integrations
- CSV/API ingestion pipelines
- Automated scheduled reporting
- More granular production normalization
- Audit logs
- Notification integrations
- Advanced sustainability reporting

---

# Hackathon Focus

EcoPulse AI is built around a simple idea:

> **Turn a resource anomaly into an investigated, actionable, measurable outcome.**

The product prioritizes a deep end-to-end workflow over a large collection of disconnected features.

**DATA → DETECTION → AI INVESTIGATION → ACTION → OUTCOME**

---


