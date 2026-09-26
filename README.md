EcoPulse AI

Don't just measure waste. Find it. Explain it. Fix it.

EcoPulse AI is a full-stack Resource Intelligence & Action Platform for facilities, offices, educational institutions, and small organizations.

Its core workflow is:

DATA → ANALYTICS → DETECTION → AI INVESTIGATION → ACTION → OUTCOME

Why EcoPulse AI?

Organizations collect electricity, water, fuel, and material consumption data, but raw numbers do not clearly answer:

What changed?

Where did it change?

Is the change abnormal?

What might be contributing to it?

What should be investigated?

What action should be taken?

Did the situation improve afterward?

EcoPulse AI connects all of these steps in one operational workflow.

Core Workflow

RESOURCE DATA
     ↓
ANALYTICS
     ↓
ANOMALY DETECTION
     ↓
EVIDENCE PACK
     ↓
AI INVESTIGATION
     ↓
ACTION
     ↓
COMPLETION
     ↓
OUTCOME VERIFICATION

The product is designed around depth over breadth: one complete operational loop rather than disconnected features.

Key Features

Resource Data Management

Track resource consumption across:

Electricity

Water

Fuel

Material

Consumption records include:

Resource

Location

Quantity

Unit

Cost

Recorded date

Notes

Production data can also be recorded to support production-normalized analysis.

Deterministic Analytics

EcoPulse calculates core metrics in backend application code.

Gemini is not used for basic arithmetic.

The analytics engine calculates:

Current-period consumption

Previous-period consumption

Historical average / baseline

Percentage change

Trend

Resource comparison

Location comparison

Production-normalized consumption

Consumption intensity

Example:

percentageChange =
((current - baseline) / baseline) × 100

Division-by-zero cases are handled explicitly.

Transparent Anomaly Detection

EcoPulse uses a clearly labeled:

Baseline Deviation Detection

It is not presented as a machine-learning model.

Current deviation thresholds:

>= 30%        HIGH
15% - < 30%   MEDIUM
< 15%         Normal range

Every anomaly contains:

Resource

Location

Current value

Baseline value

Change percentage

Severity

Detection date

Status

Evidence-First AI Investigation

The main AI capability in EcoPulse is AI Investigation.

EcoPulse does not send a generic question to Gemini.

Before the AI call, the backend builds an evidence pack from data already stored in the workspace.

The evidence can include:

Current resource consumption

Historical consumption

Calculated baseline

Previous reading

Production output

Consumption intensity

Cost history

Record counts

Peer-location comparisons

Historical trend

Anomaly severity

The flow is:

Workspace Data
     ↓
Deterministic Analytics
     ↓
Evidence Pack
     ↓
Gemini
     ↓
Structured Investigation

Gemini is used to interpret the evidence, not replace the application's calculations.

What the AI Produces

An investigation can return:

Summary

Why the pattern could be happening

Possible contributing factors

Investigation checklist

Recommended actions

Monitoring plan

The system explicitly separates:

OBSERVED FACTS
     ≠
POSSIBLE EXPLANATIONS

Uncertain causes are presented as possibilities to investigate, not as proven facts.

Example AI Investigation

Example workspace signal:

Location: Production Floor A
Resource: Electricity

Baseline:  980 kWh
Current:  1240 kWh

Deviation: +26.5%
Production change: ~+1%

EcoPulse can use this evidence to investigate why resource consumption increased much faster than production.

The AI investigation can then surface:

WHY THIS COULD BE HAPPENING
        ↓
Possible contributing factors
        ↓
Investigation checklist
        ↓
Recommended actions
        ↓
Monitoring plan

The goal is not to claim a cause without evidence. The goal is to give the operator a structured path for investigation.

Action Center

AI recommendations can become persistent operational work.

Action lifecycle

OPEN
  ↓
IN_PROGRESS
  ↓
COMPLETED

Each action can contain:

Title

Description

Priority

Location

Assigned user

Due date

Status

Linked AI insight

Actions are persisted in PostgreSQL.

That means an action remains available after:

Refresh
Logout / Login
New session

Outcome Verification

After an action is completed, the operator can record a new measurement.

Example:

BEFORE
1240 kWh

AFTER
1050 kWh

OBSERVED CHANGE
-15.3%

EcoPulse uses the wording:

Observed change after intervention

rather than automatically claiming that the intervention caused the entire change.

This keeps the product focused on measured evidence.

"What Changed?" Analysis

EcoPulse provides a comparison view for current and previous periods.

Example:

Electricity   +26.5%
Water          +4.9%
Fuel           -2.4%
Production     +1.0%

This helps the operator identify where attention should go first.

The comparison can then feed the investigation workflow so the user can move from:

WHAT CHANGED?
      ↓
WHERE?
      ↓
WHY MIGHT IT BE HAPPENING?
      ↓
WHAT SHOULD WE INVESTIGATE?

Efficiency Score

EcoPulse includes a transparent 0–100 efficiency score.

The score is calculated by the application and is not invented by Gemini.

The calculation considers factors such as:

Resource trends

Anomaly frequency

Production-normalized consumption

Completed actions

Recent observed improvements

The dashboard can show the score together with a breakdown so users can understand how it is derived.

Authentication & Authorization

EcoPulse supports:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

Security includes:

bcrypt password hashing

JWT authentication

Protected routes

Authenticated user identity from JWT

Organization-level access control

Request validation with Zod

UUID / identifier validation

Secure error responses

No plaintext password storage

The backend must never trust a client-supplied userId as the source of authenticated identity.

Organization Data Isolation

Every protected request is scoped to the authenticated user's organization.

Core records are connected through organization relationships:

Organization
 ├── Users
 ├── Locations
 ├── Resources
 ├── Consumption
 ├── Production
 ├── Anomalies
 ├── AI Insights
 ├── Actions
 └── Outcomes

Cross-organization access is rejected by the backend.

AI Security

Gemini is called strictly from the backend.

React Frontend
      │
      │ REST API
      ▼
Node.js / Express
      │
      │ Evidence Pack
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

Security requirements:

GEMINI_API_KEY stays server-side

No Gemini API key in frontend code

No real secrets committed to Git

Structured AI output

Zod validation of AI responses

Controlled AI failure handling

Safe environment-based configuration

Tech Stack

Frontend

React.js

Vite

React Router

Axios / Fetch

Tailwind CSS

Lucide React

Recharts

Backend

Node.js

Express.js

JWT

bcrypt

Zod

Helmet

CORS

REST APIs

Database

PostgreSQL

Foreign keys

Indexes

Persistent timestamps

Organization-scoped data

Generative AI

Google Gemini API

@google/genai

Backend-only AI integration

Structured JSON output

Zod schema validation

Deployment

Vercel

PostgreSQL / Supabase PostgreSQL

Project Structure

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
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── package.json
├── package-lock.json
├── vercel.json
├── .gitignore
└── README.md

Database Model

Core tables:

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

Relationships are organized around the authenticated organization.

API Overview

Authentication

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

Organizations

GET /api/organizations/current

Locations

GET    /api/locations
POST   /api/locations
PUT    /api/locations/:id
DELETE /api/locations/:id

Resources

GET    /api/resources
POST   /api/resources
PUT    /api/resources/:id
DELETE /api/resources/:id

Consumption

GET    /api/consumption
POST   /api/consumption
PUT    /api/consumption/:id
DELETE /api/consumption/:id

Production

GET  /api/production
POST /api/production

Analytics

GET /api/analytics/dashboard
GET /api/analytics/trends
GET /api/analytics/what-changed
GET /api/analytics/efficiency-score

Anomalies

GET  /api/anomalies
POST /api/anomalies/detect

AI

GET  /api/ai/status
POST /api/ai/investigate

Insights

GET /api/insights
GET /api/insights/:id

Actions

GET    /api/actions
POST   /api/actions
PUT    /api/actions/:id
PATCH  /api/actions/:id/status
DELETE /api/actions/:id

Outcomes

GET  /api/outcomes
POST /api/outcomes

API Response Format

Successful responses:

{
  "success": true,
  "data": {}
}

Error responses:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}

Local Setup

Requirements

Node.js

npm

PostgreSQL

Gemini API key for the live Gemini experience

1. Install dependencies

npm install
npm run install:all

2. Configure environment

Create:

backend/.env

Example:

DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_configured_gemini_model
JWT_SECRET=your_long_random_secret
PORT=4000
FRONTEND_URL=http://localhost:5173

Never commit .env.

3. Seed demo data

npm run seed:force

4. Start the application

npm run dev

Frontend:

http://localhost:5173

Backend:

http://localhost:4000

Health check:

http://localhost:4000/api/health

Demo Credentials

Email:
demo@ecopulse.ai

Password:
EcoPulse@2026

Demo Organization

The seeded demo workspace is:

GreenCore Manufacturing

Locations:

Production Floor A

Production Floor B

Administration Block

Resources:

Electricity

Water

Fuel

Material

Demo Scenario

The main demo scenario is designed around a significant electricity deviation.

Location: Production Floor A
Resource: Electricity

Previous / Baseline: 980 kWh
Current:            1240 kWh
Change:             +26.5%

Production change:  approximately +1%

The operator can then:

1. Detect the deviation
2. Open the anomaly
3. Investigate with AI
4. Review evidence
5. Review possible factors
6. Review the investigation checklist
7. Create an action
8. Move action to In Progress
9. Complete the action
10. Record a new measurement
11. Review the observed change
12. Refresh and verify persistence

Demo Path

Login → Dashboard → Alerts → Investigate → AI Investigation → Create Action → Action Center → Complete → Outcomes → Record observed change

The goal of the demo is to show the complete journey from a raw measurement to an evidence-based operational response.

Production Deployment

EcoPulse can be deployed with a Vercel-based architecture.

                    Vercel
                      │
          ┌───────────┴───────────┐
          │                       │
     React + Vite               /api
      Frontend                 Backend
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                 PostgreSQL                Gemini API

Required production environment variables:

DATABASE_URL=
GEMINI_API_KEY=
GEMINI_MODEL=
JWT_SECRET=
FRONTEND_URL=

Do not expose private secrets through frontend VITE_* variables.

Live Project

Live Demo

https://echo-pulse-ai-54.vercel.app

GitHub Repository

https://github.com/saivenkat-954/EchoPulse-AI

Testing Checklist

Before submitting, verify:

[ ] Registration
[ ] Login
[ ] Logout
[ ] Protected routes
[ ] User identity
[ ] Organization isolation
[ ] Resource CRUD
[ ] Consumption CRUD
[ ] Search
[ ] Filter
[ ] Sort
[ ] Date range filtering
[ ] Analytics
[ ] Anomaly detection
[ ] AI status
[ ] AI investigation
[ ] AI response validation
[ ] Action creation
[ ] OPEN → IN_PROGRESS → COMPLETED
[ ] Outcome creation
[ ] Before / After calculation
[ ] Database persistence
[ ] Refresh persistence
[ ] Unauthorized access
[ ] Cross-organization access protection

Screens

Recommended screenshots for this README:

docs/
├── dashboard.png
├── alerts.png
├── ai-investigation.png
├── action-center.png
├── outcomes.png
└── architecture.png

Add them to the README after publishing the final screenshots.

Security Checklist

Before publishing the repository:

[ ] No .env committed
[ ] No Gemini API key committed
[ ] No database password committed
[ ] No JWT secret committed
[ ] node_modules excluded
[ ] build output excluded
[ ] deployment secrets stored in Vercel
[ ] GitHub repository is public

What Makes EcoPulse Different?

EcoPulse is not a generic AI chatbot.

It follows a measurable operational process:

DATA
 ↓
What changed?
 ↓
DETECTION
 ↓
Is it abnormal?
 ↓
EVIDENCE
 ↓
What does the stored data show?
 ↓
AI INVESTIGATION
 ↓
Why might this be happening?
 ↓
ACTION
 ↓
What should the team do?
 ↓
OUTCOME
 ↓
What changed afterward?

The AI is one component of a larger evidence-to-action system.

Roadmap

Future improvements can include:

More advanced anomaly detection

Forecasting

Equipment-level data integration

Automated scheduled reporting

CSV / API ingestion

Notification integrations

Audit logs

Advanced sustainability reporting

More granular resource normalization

Role-based permissions

Hackathon Submission Focus

EcoPulse AI is designed around the core engineering principles of the Build-to-Ship challenge:

Real full-stack implementation

Secure backend AI integration

Managed database persistence

Structured prompting

Zod validation

Secret protection

Live deployment

End-to-end operational workflow

The focus is:

Build deep. Ship live.
