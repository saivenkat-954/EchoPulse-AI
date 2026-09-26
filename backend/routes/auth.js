const crypto=require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  organizationName: z.string().trim().min(2).max(160).optional().default('Operations Workspace'),
  industry: z.string().trim().min(2).max(120).optional().default('Operations')
});
const loginSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(128) });

const publicUser = u => ({ id: u.id, name: u.name, email: u.email, organizationId: u.organizationId, role: u.role });

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const result = await db.withTransaction(async tx => {
      const existing = await tx.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
      if (existing.rowCount) {
        const e = new Error('An account with this email address already exists.');
        e.status = 409; e.publicCode = 'EMAIL_EXISTS'; e.publicMessage = e.message; throw e;
      }

      const now = new Date();
      const orgId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      await tx.query(
        `INSERT INTO organizations(id,name,industry,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$4)`,
        [orgId, body.organizationName, body.industry, now]
      );
      const passwordHash = await bcrypt.hash(body.password, 12);
      const userResult = await tx.query(
        `INSERT INTO users(id,name,email,"passwordHash","organizationId",role,"createdAt","updatedAt")
         VALUES($1,$2,$3,$4,$5,'OPERATIONS_MANAGER',$6,$6)
         RETURNING id,name,email,"organizationId",role`,
        [userId, body.name, email, passwordHash, orgId, now]
      );
      await tx.query(
        `INSERT INTO locations(id,"organizationId",name,description,"createdAt","updatedAt")
         VALUES($1,$2,'Main Facility','Primary operational building',$3,$3),
               ($4,$2,'Production Floor A','Primary production area',$3,$3)`,
        [crypto.randomUUID(), orgId, now, crypto.randomUUID()]
      );
      await tx.query(
        `INSERT INTO resources(id,"organizationId",name,type,unit,"createdAt","updatedAt") VALUES
          ($1,$2,'Electricity','ELECTRICITY','kWh',$3,$3),
          ($4,$2,'Water','WATER','L',$3,$3),
          ($5,$2,'Fuel','FUEL','L',$3,$3),
          ($6,$2,'Material','MATERIAL','kg',$3,$3)`,
        [crypto.randomUUID(), orgId, now, crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
      );
      return { user: userResult.rows[0], organization: { id: orgId, name: body.organizationName, industry: body.industry } };
    });

    const token = generateToken(publicUser(result.user));
    res.status(201).json({ success: true, data: { token, user: publicUser(result.user), organization: result.organization } });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await db.query(
      `SELECT u.id,u.name,u.email,u."passwordHash",u."organizationId",u.role,o.name AS "orgName",o.industry AS "orgIndustry"
       FROM users u JOIN organizations o ON o.id=u."organizationId" WHERE lower(u.email)=lower($1)`,
      [body.email]
    );
    if (!result.rowCount || !(await bcrypt.compare(body.password, result.rows[0].passwordHash))) {
      const e = new Error('Invalid email or password.'); e.status = 401; e.publicCode = 'INVALID_CREDENTIALS'; e.publicMessage = e.message; throw e;
    }
    const u = result.rows[0];
    const user = publicUser(u);
    res.json({ success: true, data: { token: generateToken(user), user, organization: { id: u.organizationId, name: u.orgName, industry: u.orgIndustry } } });
  } catch (err) { next(err); }
});

router.post('/logout', authenticateToken, (req, res) => res.json({ success: true, data: { message: 'Logged out' } }));

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT u.id,u.name,u.email,u."organizationId",u.role,o.name AS "orgName",o.industry AS "orgIndustry"
       FROM users u JOIN organizations o ON o.id=u."organizationId" WHERE u.id=$1 AND u."organizationId"=$2`,
      [req.user.userId, req.user.organizationId]
    );
    if (!r.rowCount) { const e = new Error('User not found.'); e.status = 401; e.publicCode='INVALID_SESSION'; e.publicMessage=e.message; throw e; }
    const u = r.rows[0];
    res.json({ success: true, data: { user: publicUser(u), organization: { id:u.organizationId, name:u.orgName, industry:u.orgIndustry } } });
  } catch (err) { next(err); }
});

module.exports = router;
