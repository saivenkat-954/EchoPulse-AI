const crypto = require('crypto');
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { calculatePercentageChange } = require('../services/analyticsService');

const router = express.Router();
router.use(authenticateToken);

const id = z.string().uuid();
const schema = z.object({
  actionId: id,
  beforeValue: z.coerce.number().finite().positive(),
  afterValue: z.coerce.number().finite().nonnegative(),
  resourceId: id,
  measuredAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes: z.string().trim().max(1000).optional().default('')
});

router.get('/', async (req, res, next) => {
  try {
    const r = await db.query(`
      SELECT o.*, a.title AS action, a."assignedTo", l.name AS location,
             r.name AS resource, r.unit AS "resourceUnit", r.type AS "resourceType"
      FROM outcomes o
      JOIN action_items a ON a.id=o."actionId" AND a."organizationId"=o."organizationId"
      LEFT JOIN locations l ON l.id=a."locationId"
      JOIN resources r ON r.id=o."resourceId" AND r."organizationId"=o."organizationId"
      WHERE o."organizationId"=$1
      ORDER BY o."measuredAt" DESC
    `, [req.user.organizationId]);
    res.json({ success: true, data: r.rows });
  } catch (e) { next(e); }
});

router.get('/timeline', async (req, res, next) => {
  try {
    const r = await db.query(`
      SELECT o.id,o."beforeValue",o."afterValue",o."percentageChange",o."measuredAt",o.notes,
             a.title AS action,l.name AS location,r.name AS resource,r.unit AS "resourceUnit"
      FROM outcomes o
      JOIN action_items a ON a.id=o."actionId" AND a."organizationId"=o."organizationId"
      LEFT JOIN locations l ON l.id=a."locationId"
      JOIN resources r ON r.id=o."resourceId" AND r."organizationId"=o."organizationId"
      WHERE o."organizationId"=$1
      ORDER BY o."measuredAt" DESC
    `, [req.user.organizationId]);
    res.json({ success: true, data: r.rows });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = schema.parse(req.body);
    const org = req.user.organizationId;

    const action = await db.query(
      'SELECT id,status,"locationId","insightId" FROM action_items WHERE id=$1 AND "organizationId"=$2',
      [b.actionId, org]
    );
    const resource = await db.query(
      'SELECT id,unit,type FROM resources WHERE id=$1 AND "organizationId"=$2',
      [b.resourceId, org]
    );

    if (!action.rowCount || !resource.rowCount) {
      return res.status(400).json({ success:false, error:{code:'INVALID_REFERENCE',message:'Action or resource does not belong to this organization.'} });
    }
    if (action.rows[0].status !== 'COMPLETED') {
      return res.status(409).json({ success:false, error:{code:'ACTION_NOT_COMPLETED',message:'Complete the action before recording an outcome.'} });
    }

    // When an action came from an AI investigation, prefer the investigation's
    // resource. This prevents accidentally recording an unrelated metric.
    if (action.rows[0].insightId) {
      const linked = await db.query(`
        SELECT a."resourceId"
        FROM ai_insights i
        JOIN anomalies a ON a.id=i."anomalyId" AND a."organizationId"=i."organizationId"
        WHERE i.id=$1 AND i."organizationId"=$2
      `, [action.rows[0].insightId, org]);
      if (linked.rowCount && linked.rows[0].resourceId !== b.resourceId) {
        return res.status(400).json({
          success:false,
          error:{code:'RESOURCE_MISMATCH',message:'Use the resource linked to this investigation for the outcome measurement.'}
        });
      }
    }

    const change = calculatePercentageChange(b.afterValue, b.beforeValue);
    const measuredAt = b.measuredAt || new Date();
    const now = new Date();
    const oid = crypto.randomUUID();

    const r = await db.query(`
      INSERT INTO outcomes(
        id,"organizationId","actionId","beforeValue","afterValue","percentageChange",
        "resourceId","measuredAt",notes,"createdAt","updatedAt"
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
      RETURNING *
    `, [
      oid, org, b.actionId, b.beforeValue, b.afterValue, change,
      b.resourceId, measuredAt, b.notes, now
    ]);

    res.status(201).json({ success:true, data:r.rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
