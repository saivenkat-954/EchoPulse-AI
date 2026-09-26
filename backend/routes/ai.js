const crypto = require('crypto');
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateAIInvestigation, buildEvidencePack } = require('../services/aiService');

const router = express.Router();
router.use(authenticateToken);

const anomalyIdSchema = z.string().uuid();
const investigateSchema = z.object({
  anomalyId: anomalyIdSchema,
  refresh: z.boolean().optional().default(true)
});

router.get('/status', (req, res) => {
  const configured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY';
  res.json({
    success: true,
    data: { configured, provider: 'Google Gemini', model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', backendOnly: true }
  });
});

function monthKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}
function monthLabel(key) {
  const [y,m] = key.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,1)).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
}
function parseJson(v, fallback = []) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || JSON.stringify(fallback)); } catch { return fallback; }
}
function formatInsight(i, a, evidence, provider) {
  const raw = parseJson(i.rawResponse, {});
  const ai = raw.ai && typeof raw.ai === 'object' ? raw.ai : {};
  return {
    ...i,
    possibleFactors: parseJson(i.possibleFactors, []),
    investigationChecklist: parseJson(i.investigationChecklist, []),
    recommendedActions: parseJson(i.recommendedActions, []),
    evidence: evidence || raw.evidence || null,
    provider: provider || raw.provider || 'saved investigation',
    whyThisCouldBeHappening: ai.whyThisCouldBeHappening || ''
  };
}

async function fetchEvidence(org, anomaly) {
  const [consumptionResult, productionResult, peerResult] = await Promise.all([
    db.query(`
      SELECT c.quantity,c.cost,c."recordedAt",c.notes,r.name AS resource,r.unit
      FROM consumption_records c
      JOIN resources r ON r.id=c."resourceId" AND r."organizationId"=c."organizationId"
      WHERE c."organizationId"=$1 AND c."locationId"=$2 AND c."resourceId"=$3
      ORDER BY c."recordedAt" ASC
      LIMIT 500
    `, [org, anomaly.locationId, anomaly.resourceId]),
    db.query(`
      SELECT "outputQuantity",unit,"recordedAt"
      FROM production_records
      WHERE "organizationId"=$1 AND "locationId"=$2
      ORDER BY "recordedAt" ASC
      LIMIT 500
    `, [org, anomaly.locationId]),
    db.query(`
      SELECT l.name AS location,SUM(c.quantity)::numeric AS quantity
      FROM consumption_records c
      JOIN locations l ON l.id=c."locationId" AND l."organizationId"=c."organizationId"
      WHERE c."organizationId"=$1 AND c."resourceId"=$2
      GROUP BY l.id,l.name
      ORDER BY quantity DESC
    `, [org, anomaly.resourceId])
  ]);

  const byMonth = new Map();
  for (const row of consumptionResult.rows) {
    const key = monthKey(row.recordedAt);
    if (!key) continue;
    const b = byMonth.get(key) || { month:key, quantity:0, cost:0, recordCount:0, notes:[] };
    b.quantity += Number(row.quantity || 0);
    b.cost += Number(row.cost || 0);
    b.recordCount += 1;
    if (row.notes) b.notes.push(row.notes);
    byMonth.set(key,b);
  }
  const history = [...byMonth.values()].sort((x,y)=>x.month.localeCompare(y.month)).map(x=>({
    month:x.month,
    quantity:Number(x.quantity.toFixed(2)),
    cost:Number(x.cost.toFixed(2)),
    recordCount:x.recordCount,
    notes:x.notes.slice(0,4).join(' | ')
  }));

  const productionByMonth = new Map();
  for (const row of productionResult.rows) {
    const key = monthKey(row.recordedAt);
    if (!key) continue;
    productionByMonth.set(key,(productionByMonth.get(key)||0)+Number(row.outputQuantity||0));
  }
  const productionHistory=[...productionByMonth.entries()]
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([month,outputQuantity])=>({month,outputQuantity:Number(outputQuantity.toFixed(2))}));

  const latestMonth = history.at(-1)?.month || monthKey(anomaly.detectedAt) || new Date().toISOString().slice(0,7);
  const prior = history.filter(x=>x.month!==latestMonth);
  const productionPrior = productionHistory.filter(x=>x.month!==latestMonth);
  const productionBaseline = productionPrior.length
    ? productionPrior.slice(-6).reduce((s,x)=>s+x.outputQuantity,0)/Math.min(6,productionPrior.length)
    : 0;

  return {
    resource:{name:anomaly.resource,type:anomaly.resourceType,unit:anomaly.unit},
    location:{name:anomaly.location,description:anomaly.locationDescription},
    currentValue:Number(anomaly.currentValue),
    baselineValue:Number(anomaly.baselineValue),
    changePercent:Number(anomaly.changePercent),
    severity:anomaly.severity,
    latestMonth,
    history,
    productionHistory,
    productionBaseline,
    peerLocationConsumption:peerResult.rows.map(x=>({location:x.location,quantity:Number(x.quantity||0)})),
    latestMonthLabel:monthLabel(latestMonth),
    priorCostAverage:prior.length ? prior.slice(-6).reduce((s,x)=>s+x.cost,0)/Math.min(6,prior.length) : 0
  };
}

router.post('/investigate', async (req, res, next) => {
  try {
    const { anomalyId, refresh } = investigateSchema.parse(req.body);
    const org = req.user.organizationId;

    const anomalyResult = await db.query(`
      SELECT a.*, l.name AS location, l.description AS "locationDescription",
             r.name AS resource, r.type AS "resourceType", r.unit AS unit
      FROM anomalies a
      JOIN locations l ON l.id=a."locationId" AND l."organizationId"=a."organizationId"
      JOIN resources r ON r.id=a."resourceId" AND r."organizationId"=a."organizationId"
      WHERE a.id=$1 AND a."organizationId"=$2
    `, [anomalyId, org]);
    if (!anomalyResult.rowCount) {
      return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Anomaly not found'}});
    }
    const anomaly=anomalyResult.rows[0];

    const existing=await db.query(`
      SELECT * FROM ai_insights
      WHERE "anomalyId"=$1 AND "organizationId"=$2
      ORDER BY "createdAt" DESC LIMIT 1
    `,[anomalyId,org]);

    if (existing.rowCount && !refresh) {
      const latest=existing.rows[0];
      const raw=parseJson(latest.rawResponse,{});
      const provider=raw.provider || 'saved investigation';
      if (provider === 'gemini' || provider === 'gemini-retry') {
        return res.json({success:true,data:formatInsight(latest,anomaly,raw.evidence,provider),meta:{reused:true}});
      }
    }

    const ctx=await fetchEvidence(org,anomaly);
    ctx.evidence=buildEvidencePack(ctx);
    const generated=await generateAIInvestigation(ctx);
    const out=generated.result;
    const rawResponse={provider:generated.provider,evidence:generated.evidence,ai:out};
    const now=new Date();
    const insightId=crypto.randomUUID();

    const saved=await db.query(`
      INSERT INTO ai_insights(
        id,"organizationId","anomalyId",summary,severity,"possibleFactors",
        "investigationChecklist","recommendedActions","monitoringPlan","rawResponse","createdAt","updatedAt"
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
      RETURNING *
    `,[
      insightId,org,anomalyId,out.summary,out.severity,
      JSON.stringify(out.possibleContributingFactors),
      JSON.stringify(out.investigationChecklist),
      JSON.stringify(out.recommendedActions),out.monitoringPlan,
      JSON.stringify(rawResponse),now
    ]);

    await db.query(`
      UPDATE anomalies SET status=CASE WHEN status='OPEN' THEN 'INVESTIGATED' ELSE status END,"updatedAt"=$1
      WHERE id=$2 AND "organizationId"=$3
    `,[now,anomalyId,org]);

    res.status(existing.rowCount ? 200 : 201).json({
      success:true,
      data:formatInsight(saved.rows[0],anomaly,generated.evidence,generated.provider),
      meta:{reused:false,refresh:!!refresh,provider:generated.provider}
    });
  } catch(e) { next(e); }
});

module.exports=router;
