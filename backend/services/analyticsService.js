const crypto = require('crypto');
const db = require('../db');

function calculatePercentageChange(current, baseline) {
  const c = Number(current || 0);
  const b = Number(baseline || 0);
  if (b === 0) return c === 0 ? 0 : 100;
  return Number((((c - b) / b) * 100).toFixed(2));
}

function evaluateAnomalySeverity(changePercent) {
  const abs = Math.abs(Number(changePercent || 0));
  if (abs >= 30) return 'HIGH';
  if (abs >= 15) return 'MEDIUM';
  return 'LOW';
}

async function detectAnomaliesForOrganization(organizationId) {
  const anchor=await db.query("SELECT date_trunc('month', MAX(\"recordedAt\")) AS latest FROM consumption_records WHERE \"organizationId\"=$1",[organizationId]);
  const latestMonth=anchor.rows[0]?.latest;
  if(!latestMonth) return [];
  const r = await db.query(`
    WITH monthly AS (
      SELECT c."locationId", c."resourceId", date_trunc('month', c."recordedAt") AS month,
             SUM(c.quantity)::numeric AS value
      FROM consumption_records c
      WHERE c."organizationId"=$1
      GROUP BY c."locationId", c."resourceId", date_trunc('month', c."recordedAt")
    ), scored AS (
      SELECT m.*, AVG(m.value) OVER (
        PARTITION BY m."locationId", m."resourceId"
        ORDER BY m.month ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING
      ) AS baseline
      FROM monthly m
    )
    SELECT s.*, r.name AS resource, r.type AS "resourceType", r.unit AS unit,
           l.name AS location
    FROM scored s
    JOIN resources r ON r.id=s."resourceId" AND r."organizationId"=$1
    JOIN locations l ON l.id=s."locationId" AND l."organizationId"=$1
    WHERE s.month=$2
      AND s.baseline IS NOT NULL
      AND ABS(CASE WHEN s.baseline=0 THEN CASE WHEN s.value=0 THEN 0 ELSE 100 END ELSE ((s.value-s.baseline)/s.baseline)*100 END) >= 15
    ORDER BY ABS(((s.value-s.baseline)/NULLIF(s.baseline,0))*100) DESC
  `, [organizationId, latestMonth]);

  const created=[];
  for (const x of r.rows) {
    const change=calculatePercentageChange(x.value,x.baseline);
    const severity=evaluateAnomalySeverity(change);
    const existing=await db.query(
      `SELECT id FROM anomalies WHERE "organizationId"=$1 AND "locationId"=$2 AND "resourceId"=$3 AND "detectedAt">=$4 AND "detectedAt"<$4+interval '1 month'`,
      [organizationId,x.locationId,x.resourceId,latestMonth]
    );
    if(existing.rowCount) continue;
    const id=crypto.randomUUID(); const now=new Date();
    const saved=await db.query(
      `INSERT INTO anomalies(id,"organizationId","locationId","resourceId","currentValue","baselineValue","changePercent",severity,"detectedAt","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$9) RETURNING *`,
      [id,organizationId,x.locationId,x.resourceId,Number(x.value),Number(Number(x.baseline).toFixed(2)),change,severity,new Date(x.month)]
    );
    created.push({...saved.rows[0],resource:x.resource,location:x.location,unit:x.unit});
  }
  return created;
}

async function calculateEfficiencyScore(organizationId) {
  const anomalies=await db.query(`SELECT severity FROM anomalies WHERE "organizationId"=$1 AND status IN ('OPEN','INVESTIGATED')`,[organizationId]);
  const high=anomalies.rows.filter(x=>x.severity==='HIGH').length;
  const medium=anomalies.rows.filter(x=>x.severity==='MEDIUM').length;
  const anomalyPenalty=Math.min(45,high*12+medium*6);

  const resourceScores={ELECTRICITY:85,WATER:85,FUEL:85,MATERIAL:85};
  const resources=await db.query('SELECT id,type FROM resources WHERE "organizationId"=$1',[organizationId]);
  for(const resource of resources.rows){
    const values=await db.query(`SELECT quantity FROM consumption_records WHERE "organizationId"=$1 AND "resourceId"=$2 ORDER BY "recordedAt" DESC LIMIT 7`,[organizationId,resource.id]);
    if(values.rowCount<2) continue;
    const latest=Number(values.rows[0].quantity); const baseline=values.rows.slice(1).reduce((a,b)=>a+Number(b.quantity),0)/(values.rowCount-1);
    const change=Math.abs(calculatePercentageChange(latest,baseline));
    resourceScores[resource.type]=Number(Math.max(45,Math.min(98,85-(change*0.65))).toFixed(1));
  }

  const outcomes=await db.query(`SELECT "percentageChange" FROM outcomes WHERE "organizationId"=$1 ORDER BY "measuredAt" DESC LIMIT 10`,[organizationId]);
  const verifiedBonus=Math.min(10,outcomes.rows.filter(x=>Number(x.percentageChange)<0).length*2);
  const completed=await db.query(`SELECT count(*)::int AS count FROM action_items WHERE "organizationId"=$1 AND status='COMPLETED'`,[organizationId]);
  const actionBonus=Math.min(5,Number(completed.rows[0].count||0));

  const overall=Math.round(Math.max(10,Math.min(100,
    resourceScores.ELECTRICITY*.35+resourceScores.WATER*.25+resourceScores.FUEL*.2+resourceScores.MATERIAL*.2-anomalyPenalty+verifiedBonus+actionBonus
  )));
  return { overallScore:overall, breakdown:{electricity:resourceScores.ELECTRICITY,water:resourceScores.WATER,fuel:resourceScores.FUEL,operationalConsistency:Math.max(20,Math.min(100,Math.round(85-anomalyPenalty+verifiedBonus+actionBonus)))}, formulaExplanation:'Efficiency Score is deterministic: resource stability (35% electricity, 25% water, 20% fuel, 20% material), minus active anomaly penalties, plus small credits for completed actions and observed reductions. Gemini does not calculate this score.' };
}

module.exports={calculatePercentageChange,evaluateAnomalySeverity,detectAnomaliesForOrganization,calculateEfficiencyScore};
