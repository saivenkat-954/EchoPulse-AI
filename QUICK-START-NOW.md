# Quick Start — submit-ready path

```powershell
npm install
npm run install:all
Copy-Item backend\.env.example backend\.env
notepad backend\.env
npm run seed:force
npm run dev
```

Use `http://localhost:5173` and log in with:

`demo@ecopulse.ai` / `EcoPulse@2026`

For the AI demo: **Alerts -> Investigate -> Investigate with AI**.

For the action demo: **Create action -> Action Center -> Start action -> Mark complete -> Record outcome**.

For a live Gemini result, make sure `GEMINI_API_KEY` is configured in `backend/.env` before starting the backend.
