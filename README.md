# EcoPulse AI

**Don't just measure waste. Find it. Explain it. Fix it.**

EcoPulse is a full-stack resource intelligence and action platform for facilities and small organizations. Its core workflow is:

**DATA -> DETECTION -> AI INVESTIGATION -> ACTION -> OUTCOME**

## What is fixed in this release

- Evidence-first AI investigations tied to persisted workspace data
- Gemini backend-only integration with structured JSON + Zod validation
- AI investigation queue showing active anomalies even before an insight exists
- Automatic investigation when opening an anomaly target
- Explicit “Why the pattern looks this way” explanation
- Evidence facts, production comparison, consumption intensity, cost and peer-location context
- AI recommendation -> persisted action -> OPEN -> IN_PROGRESS -> COMPLETED
- Completed action -> observed outcome workflow
- Fixed PostgreSQL outcome insert parameter binding
- Linked action/resource validation for outcomes
- Demo data preloads a completed electricity action with 1240 kWh before value
- User/organization identity is loaded dynamically from the authenticated session

## Local setup

1. `npm install`
2. `npm run install:all`
3. Copy `backend/.env.example` to `backend/.env`
4. Configure `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `PORT=4000`
5. Run `npm run seed:force`
6. Run `npm run dev`

Frontend: http://localhost:5173
Backend health: http://localhost:4000/api/health

Demo login:

- Email: `demo@ecopulse.ai`
- Password: `EcoPulse@2026`

## AI behavior

EcoPulse calculates anomaly and trend metrics in code. It does not use Gemini for basic arithmetic. Before a Gemini call, the backend builds an evidence pack from stored consumption and production records. Gemini receives only that evidence and is instructed to distinguish observed facts from possible contributing factors.

Set `GEMINI_API_KEY` for the live Gemini experience. When the key is not configured, the application uses an explicitly labeled evidence-based deterministic fallback rather than pretending it is AI output.

## Demo path

**Alerts -> Investigate -> AI Investigation -> Create Action -> Action Center -> Complete -> Outcomes -> Record observed change**
