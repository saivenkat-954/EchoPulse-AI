const crypto=require('crypto');
const express=require('express');
const {z}=require('zod');
const db=require('../db');
const {authenticateToken}=require('../middleware/auth');
const router=express.Router();
router.use(authenticateToken);
const id=z.string().uuid();
const status=z.enum(['OPEN','IN_PROGRESS','COMPLETED','ARCHIVED']);
const priority=z.enum(['HIGH','MEDIUM','LOW']);
const createSchema=z.object({
  insightId:id.nullable().optional(),
  title:z.string().trim().min(2).max(200),
  description:z.string().trim().min(2).max(2000),
  priority:priority.default('MEDIUM'),
  assignedTo:id.nullable().optional(),
  locationId:id.nullable().optional(),
  dueDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:status.default('OPEN')
});

async function ensureRefs(org,{insightId,assignedTo,locationId}){
  if(insightId){
    const x=await db.query(`SELECT i.id,a."locationId" FROM ai_insights i JOIN anomalies a ON a.id=i."anomalyId" AND a."organizationId"=i."organizationId" WHERE i.id=$1 AND i."organizationId"=$2`,[insightId,org]);
    if(!x.rowCount)throw Object.assign(new Error('Insight does not belong to this organization.'),{status:400,publicCode:'INVALID_REFERENCE',publicMessage:'Insight does not belong to this organization.'});
    if(locationId && x.rows[0].locationId!==locationId)throw Object.assign(new Error('Action location must match the investigation location.'),{status:400,publicCode:'INVALID_REFERENCE',publicMessage:'Action location must match the investigation location.'});
  }
  if(assignedTo){const x=await db.query('SELECT id FROM users WHERE id=$1 AND "organizationId"=$2',[assignedTo,org]);if(!x.rowCount)throw Object.assign(new Error('Assignee does not belong to this organization.'),{status:400,publicCode:'INVALID_REFERENCE',publicMessage:'Assignee does not belong to this organization.'})}
  if(locationId){const x=await db.query('SELECT id FROM locations WHERE id=$1 AND "organizationId"=$2',[locationId,org]);if(!x.rowCount)throw Object.assign(new Error('Location does not belong to this organization.'),{status:400,publicCode:'INVALID_REFERENCE',publicMessage:'Location does not belong to this organization.'})}
}

router.get('/',async(req,res,next)=>{try{
  const p=[req.user.organizationId];let sql=`
    SELECT a.*,l.name AS location,u.name AS assignee,
           i.summary AS "insightSummary",i.severity AS "insightSeverity",
           i."rawResponse" AS "insightRawResponse",
           r2.id AS "suggestedResourceId",r2.name AS "suggestedResource",r2.unit AS "suggestedResourceUnit",
           an."currentValue" AS "suggestedCurrentValue",an."baselineValue" AS "suggestedBaselineValue",an."changePercent" AS "suggestedChangePercent"
    FROM action_items a
    LEFT JOIN locations l ON l.id=a."locationId" AND l."organizationId"=a."organizationId"
    LEFT JOIN users u ON u.id=a."assignedTo" AND u."organizationId"=a."organizationId"
    LEFT JOIN ai_insights i ON i.id=a."insightId" AND i."organizationId"=a."organizationId"
    LEFT JOIN anomalies an ON an.id=i."anomalyId" AND an."organizationId"=a."organizationId"
    LEFT JOIN resources r2 ON r2.id=an."resourceId" AND r2."organizationId"=a."organizationId"
    WHERE a."organizationId"=$1`;
  for(const [key,col,validator] of [['status','a.status',status],['priority','a.priority',priority]])if(req.query[key]){validator.parse(req.query[key]);p.push(req.query[key]);sql+=` AND ${col}=$${p.length}`}
  if(req.query.locationId){id.parse(req.query.locationId);p.push(req.query.locationId);sql+=` AND a."locationId"=$${p.length}`}
  if(req.query.search){p.push(`%${req.query.search}%`);sql+=` AND (a.title ILIKE $${p.length} OR a.description ILIKE $${p.length} OR coalesce(u.name,'') ILIKE $${p.length})`}
  sql+=` ORDER BY CASE a.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,a."createdAt" DESC`;
  const result=(await db.query(sql,p)).rows.map(x=>{let raw=x.insightRawResponse;if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{raw={}}}return {...x,insightProvider:raw?.provider||null}});
  res.json({success:true,data:result});
}catch(e){next(e)}});

router.post('/',async(req,res,next)=>{try{
  const b=createSchema.parse(req.body);const org=req.user.organizationId;const assignedTo=b.assignedTo||req.user.userId;
  let locationId=b.locationId||null;
  if(b.insightId && !locationId){const x=await db.query(`SELECT a."locationId" FROM ai_insights i JOIN anomalies a ON a.id=i."anomalyId" AND a."organizationId"=i."organizationId" WHERE i.id=$1 AND i."organizationId"=$2`,[b.insightId,org]);if(x.rowCount)locationId=x.rows[0].locationId;}
  await ensureRefs(org,{...b,assignedTo,locationId});
  const aid=crypto.randomUUID(),now=new Date();
  const r=await db.query(`INSERT INTO action_items(id,"organizationId","insightId",title,description,priority,"assignedTo","locationId","dueDate",status,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,[aid,org,b.insightId||null,b.title,b.description,b.priority,assignedTo,locationId,b.dueDate||null,b.status,now]);
  res.status(201).json({success:true,data:r.rows[0]});
}catch(e){next(e)}});

router.put('/:id',async(req,res,next)=>{try{
  id.parse(req.params.id);const b=createSchema.partial().parse(req.body);const existing=await db.query('SELECT * FROM action_items WHERE id=$1 AND "organizationId"=$2',[req.params.id,req.user.organizationId]);
  if(!existing.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Action not found'}});
  const cur=existing.rows[0],merged={...cur,...b,assignedTo:b.assignedTo===undefined?cur.assignedTo:b.assignedTo,locationId:b.locationId===undefined?cur.locationId:b.locationId};await ensureRefs(req.user.organizationId,merged);
  const now=new Date();const r=await db.query(`UPDATE action_items SET "insightId"=$1,title=$2,description=$3,priority=$4,"assignedTo"=$5,"locationId"=$6,"dueDate"=$7,status=$8,"updatedAt"=$9 WHERE id=$10 AND "organizationId"=$11 RETURNING *`,[merged.insightId||null,merged.title,merged.description,merged.priority,merged.assignedTo||null,merged.locationId||null,merged.dueDate||null,merged.status,now,req.params.id,req.user.organizationId]);res.json({success:true,data:r.rows[0]});
}catch(e){next(e)}});

router.patch('/:id/status',async(req,res,next)=>{try{
  id.parse(req.params.id);const nextStatus=status.parse(req.body.status);const cur=await db.query('SELECT status FROM action_items WHERE id=$1 AND "organizationId"=$2',[req.params.id,req.user.organizationId]);if(!cur.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Action not found'}});
  const current=cur.rows[0].status;const allowed={OPEN:['IN_PROGRESS'],IN_PROGRESS:['COMPLETED'],COMPLETED:['ARCHIVED'],ARCHIVED:[]};
  if(current!==nextStatus&&!allowed[current].includes(nextStatus))return res.status(409).json({success:false,error:{code:'INVALID_STATUS_TRANSITION',message:`Cannot move an action from ${current} to ${nextStatus}.`}});
  const r=await db.query('UPDATE action_items SET status=$1,"updatedAt"=$2 WHERE id=$3 AND "organizationId"=$4 RETURNING *',[nextStatus,new Date(),req.params.id,req.user.organizationId]);res.json({success:true,data:r.rows[0]});
}catch(e){next(e)}});
router.delete('/:id',async(req,res,next)=>{try{id.parse(req.params.id);const r=await db.query('DELETE FROM action_items WHERE id=$1 AND "organizationId"=$2 RETURNING id',[req.params.id,req.user.organizationId]);if(!r.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Action not found'}});res.json({success:true,data:{id:req.params.id}})}catch(e){next(e)}});
module.exports=router;
