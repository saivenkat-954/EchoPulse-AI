const express=require('express'); const db=require('../db'); const {authenticateToken}=require('../middleware/auth'); const {calculatePercentageChange,calculateEfficiencyScore}=require('../services/analyticsService');
const router=express.Router(); router.use(authenticateToken);
router.get('/dashboard',async(req,res,next)=>{try{
  const org=req.user.organizationId;
  const anchor=await db.query("SELECT date_trunc('month', MAX(\"recordedAt\")) AS latest FROM consumption_records WHERE \"organizationId\"=$1",[org]);
  const latestPeriod=anchor.rows[0]?.latest;
  const resources=(await db.query('SELECT * FROM resources WHERE "organizationId"=$1 ORDER BY type,name',[org])).rows;
  const data=[];
  for(const r of resources){
    const q=latestPeriod
      ? await db.query(`SELECT COALESCE(SUM(quantity) FILTER(WHERE "recordedAt">=$3::timestamptz AND "recordedAt"<$3::timestamptz+interval '1 month'),0) AS current, COALESCE(SUM(quantity) FILTER(WHERE "recordedAt">=$3::timestamptz-interval '1 month' AND "recordedAt"<$3::timestamptz),0) AS previous FROM consumption_records WHERE "organizationId"=$1 AND "resourceId"=$2`,[org,r.id,latestPeriod])
      : {rows:[{current:0,previous:0}]};
    const current=Number(q.rows[0].current||0), previous=Number(q.rows[0].previous||0);
    data.push({id:r.id,name:r.name,type:r.type,unit:r.unit,current,previous,changePercent:calculatePercentageChange(current,previous)});
  }
  const anomalies=(await db.query(`SELECT a.*,r.name AS resource,r.unit AS "resourceUnit",l.name AS location FROM anomalies a JOIN resources r ON r.id=a."resourceId" JOIN locations l ON l.id=a."locationId" WHERE a."organizationId"=$1 AND a.status NOT IN ('RESOLVED','ARCHIVED') ORDER BY ABS(a."changePercent") DESC,a."detectedAt" DESC LIMIT 5`,[org])).rows;
  const actions=(await db.query(`SELECT a.*,l.name AS location,u.name AS assignee FROM action_items a LEFT JOIN locations l ON l.id=a."locationId" LEFT JOIN users u ON u.id=a."assignedTo" WHERE a."organizationId"=$1 AND a.status<>'ARCHIVED' ORDER BY a."createdAt" DESC LIMIT 6`,[org])).rows;
  res.json({success:true,data:{resources:data,anomalies,actions,efficiencyScore:(await calculateEfficiencyScore(org)).overallScore}});
}catch(e){next(e)}});
router.get('/trends',async(req,res,next)=>{try{
  const org=req.user.organizationId;
  const limitMonths=12;
  const anchor=await db.query('SELECT MAX("recordedAt") AS latest FROM consumption_records WHERE "organizationId"=$1',[org]);
  const latest=anchor.rows[0]?.latest;
  if(!latest) return res.json({success:true,data:[]});
  const r=await db.query(`SELECT c."recordedAt", c.quantity, r.type
    FROM consumption_records c
    JOIN resources r ON r.id=c."resourceId" AND r."organizationId"=$1
    WHERE c."organizationId"=$1
      AND c."recordedAt" >= ($2::timestamptz - INTERVAL '12 months')
    ORDER BY c."recordedAt" ASC`,[org,latest]);
  const buckets=new Map();
  for(const row of r.rows){
    const d=new Date(row.recordedAt);
    if(Number.isNaN(d.getTime())) continue;
    const key=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    const label=d.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
    const bucket=buckets.get(key)||{month:label,monthKey:key,totals:{}};
    bucket.totals[row.type]=(bucket.totals[row.type]||0)+Number(row.quantity||0);
    buckets.set(key,bucket);
  }
  const data=[];
  for(const bucket of Array.from(buckets.values()).sort((a,b)=>a.monthKey.localeCompare(b.monthKey)).slice(-limitMonths))
    for(const [type,total] of Object.entries(bucket.totals)) data.push({month:bucket.month,type,total:Number(total.toFixed(2))});
  res.json({success:true,data});
}catch(e){next(e)}});
router.get('/what-changed',async(req,res,next)=>{try{
  const org=req.user.organizationId;
  const anchor=await db.query('SELECT MAX("recordedAt") AS latest FROM consumption_records WHERE "organizationId"=$1',[org]);
  const latest=anchor.rows[0]?.latest;
  if(!latest) return res.json({success:true,data:{periodDays:30,resources:[],production:{currentValue:0,previousValue:0,percentageChange:0}}});
  const r=await db.query(`SELECT r.id,r.name,r.type,r.unit,
    COALESCE(SUM(c.quantity) FILTER(WHERE c."recordedAt">=$2::timestamptz-INTERVAL '30 days'),0) current,
    COALESCE(SUM(c.quantity) FILTER(WHERE c."recordedAt">=$2::timestamptz-INTERVAL '60 days' AND c."recordedAt"<$2::timestamptz-INTERVAL '30 days'),0) previous
    FROM resources r LEFT JOIN consumption_records c ON c."resourceId"=r.id AND c."organizationId"=$1
    WHERE r."organizationId"=$1 GROUP BY r.id`,[org,latest]);
  const resources=r.rows.map(x=>({...x,current:Number(x.current),previous:Number(x.previous),percentageChange:calculatePercentageChange(x.current,x.previous)}));
  const p=await db.query(`SELECT COALESCE(SUM("outputQuantity") FILTER(WHERE "recordedAt">=$2::timestamptz-INTERVAL '30 days'),0) current,
    COALESCE(SUM("outputQuantity") FILTER(WHERE "recordedAt">=$2::timestamptz-INTERVAL '60 days' AND "recordedAt"<$2::timestamptz-INTERVAL '30 days'),0) previous
    FROM production_records WHERE "organizationId"=$1`,[org,latest]);
  res.json({success:true,data:{periodDays:30,resources,production:{currentValue:Number(p.rows[0].current),previousValue:Number(p.rows[0].previous),percentageChange:calculatePercentageChange(p.rows[0].current,p.rows[0].previous)}}});
}catch(e){next(e)}});
router.get('/efficiency-score',async(req,res,next)=>{try{res.json({success:true,data:await calculateEfficiencyScore(req.user.organizationId)})}catch(e){next(e)}});
module.exports=router;
