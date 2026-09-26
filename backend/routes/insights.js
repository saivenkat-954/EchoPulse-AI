const express=require('express');
const db=require('../db');
const {authenticateToken}=require('../middleware/auth');
const router=express.Router();
router.use(authenticateToken);
function arr(v){if(Array.isArray(v))return v;try{return JSON.parse(v||'[]')}catch{return[]}}
function obj(v){if(v&&typeof v==='object')return v;try{return JSON.parse(v||'{}')}catch{return{}}}
function format(r){const raw=obj(r.rawResponse);return{
  ...r,
  possibleFactors:arr(r.possibleFactors),
  investigationChecklist:arr(r.investigationChecklist),
  recommendedActions:arr(r.recommendedActions),
  provider:raw.provider||'saved investigation',
  evidence:raw.evidence||null,
  whyThisCouldBeHappening:(raw.ai&&typeof raw.ai==='object'&&raw.ai.whyThisCouldBeHappening)||''
}}
router.get('/',async(req,res,next)=>{try{const r=await db.query(`
  SELECT i.*,a."currentValue",a."baselineValue",a."changePercent",a."detectedAt",a."locationId",a."resourceId",
         l.name AS location,rr.name AS resource,rr.unit AS "resourceUnit",rr.type AS "resourceType"
  FROM ai_insights i
  JOIN anomalies a ON a.id=i."anomalyId" AND a."organizationId"=i."organizationId"
  JOIN locations l ON l.id=a."locationId" AND l."organizationId"=a."organizationId"
  JOIN resources rr ON rr.id=a."resourceId" AND rr."organizationId"=a."organizationId"
  WHERE i."organizationId"=$1
  ORDER BY i."createdAt" DESC
`,[req.user.organizationId]);res.json({success:true,data:r.rows.map(format)})}catch(e){next(e)}});
router.get('/:id',async(req,res,next)=>{try{const r=await db.query(`
  SELECT i.*,a."currentValue",a."baselineValue",a."changePercent",a."detectedAt",a."locationId",a."resourceId",
         l.name AS location,rr.name AS resource,rr.unit AS "resourceUnit",rr.type AS "resourceType"
  FROM ai_insights i
  JOIN anomalies a ON a.id=i."anomalyId" AND a."organizationId"=i."organizationId"
  JOIN locations l ON l.id=a."locationId" AND l."organizationId"=a."organizationId"
  JOIN resources rr ON rr.id=a."resourceId" AND rr."organizationId"=a."organizationId"
  WHERE i.id=$1 AND i."organizationId"=$2
`,[req.params.id,req.user.organizationId]);if(!r.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'AI insight not found'}});res.json({success:true,data:format(r.rows[0])})}catch(e){next(e)}});
module.exports=router;
