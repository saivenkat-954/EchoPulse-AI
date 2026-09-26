const crypto=require('crypto');
const express=require('express');
const db=require('../db');
const {authenticateToken}=require('../middleware/auth');
const {detectAnomaliesForOrganization}=require('../services/analyticsService');
const router=express.Router(); router.use(authenticateToken);

router.post('/load-scenario',async(req,res,next)=>{try{
  const org=req.user.organizationId; const now=new Date();
  const locationNames=['Production Floor A','Production Floor B','Administration Block'];
  for(const name of locationNames){await db.query(`INSERT INTO locations(id,"organizationId",name,description,"createdAt","updatedAt") SELECT $1,$2,$3,$4,$5,$5 WHERE NOT EXISTS(SELECT 1 FROM locations WHERE "organizationId"=$2 AND name=$3)`,[crypto.randomUUID(),org,name,'Operational facility',now]);}
  const resourceDefs=[['Electricity','ELECTRICITY','kWh'],['Water','WATER','L'],['Fuel','FUEL','L'],['Material','MATERIAL','kg']];
  for(const [name,type,unit] of resourceDefs){await db.query(`INSERT INTO resources(id,"organizationId",name,type,unit,"createdAt","updatedAt") SELECT $1,$2,$3,$4,$5,$6,$6 WHERE NOT EXISTS(SELECT 1 FROM resources WHERE "organizationId"=$2 AND name=$3)`,[crypto.randomUUID(),org,name,type,unit,now]);}
  const locs=(await db.query('SELECT id,name FROM locations WHERE "organizationId"=$1',[org])).rows;
  const resources=(await db.query('SELECT id,name,type,unit FROM resources WHERE "organizationId"=$1',[org])).rows;
  const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-7,15));
  for(let m=0;m<8;m++){
    const date=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+m,15));
    const elec=resources.find(r=>r.type==='ELECTRICITY'); const floorA=locs.find(l=>l.name==='Production Floor A');
    if(elec&&floorA){const electricityByName={'Production Floor A':m===7?1240:980,'Production Floor B':760,'Administration Block':300};for(const loc of locs){if(electricityByName[loc.name]==null)continue;const value=electricityByName[loc.name];await db.query(`INSERT INTO consumption_records(id,"organizationId","locationId","resourceId",quantity,unit,cost,"recordedAt",notes,"createdAt","updatedAt") SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10 WHERE NOT EXISTS(SELECT 1 FROM consumption_records WHERE "organizationId"=$2 AND "locationId"=$3 AND "resourceId"=$4 AND date_trunc('month',"recordedAt")=date_trunc('month',$8::timestamptz))`,[crypto.randomUUID(),org,loc.id,elec.id,value,'kWh',value*0.12,date,loc.name==='Production Floor A'?'Demo electricity deviation scenario':'Stable peer-location electricity reading',now]);}}
    for(const [resourceName,baseByLocation] of [['Water',{'Production Floor A':5200,'Production Floor B':4100,'Administration Block':2100}],['Fuel',{'Production Floor A':410,'Production Floor B':330}],['Material',{'Production Floor A':300,'Production Floor B':260,'Administration Block':140}]]){const r=resources.find(x=>x.name===resourceName);if(!r)continue;for(const l of locs){if(baseByLocation[l.name]==null)continue;const v=Math.round(baseByLocation[l.name]*(1+(m<7?(m-3)*0.01:0)));await db.query(`INSERT INTO consumption_records(id,"organizationId","locationId","resourceId",quantity,unit,cost,"recordedAt","createdAt","updatedAt") SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$9 WHERE NOT EXISTS(SELECT 1 FROM consumption_records WHERE "organizationId"=$2 AND "locationId"=$3 AND "resourceId"=$4 AND date_trunc('month',"recordedAt")=date_trunc('month',$8::timestamptz))`,[crypto.randomUUID(),org,l.id,r.id,v,r.unit,v*0.05,date,now]);}}
    for(const l of locs){const output=l.name==='Production Floor A'?(m===6?1666.67:m===7?1683.33:1600+m*13.33):(l.name==='Production Floor B'?1500:900);await db.query(`INSERT INTO production_records(id,"organizationId","locationId","outputQuantity",unit,"recordedAt","createdAt","updatedAt") SELECT $1,$2,$3,$4,'units',$5,$6,$6 WHERE NOT EXISTS(SELECT 1 FROM production_records WHERE "organizationId"=$2 AND "locationId"=$3 AND date_trunc('month',"recordedAt")=date_trunc('month',$5::timestamptz))`,[crypto.randomUUID(),org,l.id,output,date,now]);}
  }
  await detectAnomaliesForOrganization(org);
  const user=(await db.query('SELECT id FROM users WHERE id=$1 AND "organizationId"=$2',[req.user.userId,org])).rows[0];
  const latestAnomaly=(await db.query(`SELECT a.id,a."locationId",a."resourceId" FROM anomalies a WHERE a."organizationId"=$1 ORDER BY a."detectedAt" DESC LIMIT 1`,[org])).rows[0];
  if(latestAnomaly){
    const existing=(await db.query('SELECT id FROM ai_insights WHERE "anomalyId"=$1 AND "organizationId"=$2 LIMIT 1',[latestAnomaly.id,org])).rows[0];
    const insightId=existing?.id||null;
    const count=(await db.query('SELECT count(*)::int AS count FROM action_items WHERE "organizationId"=$1',[org])).rows[0].count;
    if(Number(count)===0){
      const now2=new Date();
      const open=crypto.randomUUID(), progress=crypto.randomUUID(), done=crypto.randomUUID();
      await db.query(`INSERT INTO action_items(id,"organizationId","insightId",title,description,priority,"assignedTo","locationId","dueDate",status,"createdAt","updatedAt") VALUES
      ($1,$2,$3,'Review high-load equipment runtime','Compare high-consumption equipment duty cycles with the latest baseline.','HIGH',$4,$5,CURRENT_DATE+2,'OPEN',$6,$6),
      ($7,$2,$3,'Validate HVAC schedule','Review operating hours, setbacks and recent control changes.','MEDIUM',$4,$5,CURRENT_DATE+3,'IN_PROGRESS',$6,$6),
      ($8,$2,$3,'Compressed-air inspection','Inspect the compressed-air distribution and record observations.','LOW',$4,$5,CURRENT_DATE-1,'COMPLETED',$6,$6)`
      ,[open,org,insightId,user?.id||null,latestAnomaly.locationId,now2,progress,done]);
      const elec=(await db.query("SELECT id FROM resources WHERE \"organizationId\"=$1 AND type='ELECTRICITY' LIMIT 1",[org])).rows[0];
      if(elec){await db.query(`INSERT INTO outcomes(id,"organizationId","actionId","beforeValue","afterValue","percentageChange","resourceId","measuredAt",notes,"createdAt","updatedAt") VALUES($1,$2,$3,1240,1160,$4,$5,CURRENT_DATE-1,'Seeded observed change after intervention.',$6,$6)`,[crypto.randomUUID(),org,done,((1160-1240)/1240)*100,elec.id,now2]);}
    }
  }
  res.json({success:true,data:{message:'Demo scenario loaded for the current workspace.'}});
}catch(e){next(e)}});
module.exports=router;
