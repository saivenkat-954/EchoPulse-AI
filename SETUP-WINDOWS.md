# EcoPulse AI — Windows quick setup

1. Open PowerShell in this folder.
2. Verify `package.json` is visible with `dir`.
3. Install root tools:

```powershell
npm install
```

4. Install backend and frontend packages:

```powershell
npm run install:all
```

5. Create `backend\.env` from `backend\.env.example` and set PostgreSQL, JWT and optional Gemini settings.

6. Initialize/seed demo data:

```powershell
npm run seed
```

7. Start:

```powershell
npm run dev
```

8. Open the Vite URL shown in the terminal. Check backend health at `http://localhost:4000/api/health`.

Demo credentials:

```text
Email: demo@ecopulse.ai
Password: EcoPulse@2026
```

If you are intentionally resetting a local demo database, use:

```powershell
npm run seed:force
```

Do not run `seed:force` against a production database.
