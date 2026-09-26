require('dotenv').config();
const bcrypt=require('bcryptjs');
const crypto=require('crypto');
const db=require('./index');
const {detectAnomaliesForOrganization}=require('../services/analyticsService');

async function seed(force=false){
  const existing=await db.query('SELECT id FROM users WHERE lower(email)=lower($1)',['demo@ecopulse.ai']);
  if(existing.rowCount&&!force){console.log('[Seed] Demo account already exists. Use seed:force to reset it.');return;}
  if(force){for(const t of ['outcomes','action_items','ai_insights','anomalies','production_records','consumption_records','resources','locations','users','organizations'])await db.query(`DELETE FROM ${t}`)}

  const now=new Date();
  const orgId=crypto.randomUUID(), userId=crypto.randomUUID();
  await db.query(`INSERT INTO organizations(id,name,industry,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$4)`,[orgId,'GreenCore Manufacturing','Manufacturing & Industrial Operations',now]);
  const hash=await bcrypt.hash('EcoPulse@2026',12);
  await db.query(`INSERT INTO users(id,name,email,"passwordHash","organizationId",role,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$7)`,[userId,'Venkat — Operations Manager','demo@ecopulse.ai',hash,orgId,'OPERATIONS_MANAGER',now]);

  const locs=[['Production Floor A','Primary production area'],['Production Floor B','Secondary production area'],['Administration Block','Administrative offices']].map(([name,description])=>({id:crypto.randomUUID(),name,description}));
  for(const l of locs)await db.query(`INSERT INTO locations(id,"organizationId",name,description,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$5)`,[l.id,orgId,l.name,l.description,now]);

  const resources=[['Electricity','ELECTRICITY','kWh'],['Water','WATER','L'],['Fuel','FUEL','L'],['Material','MATERIAL','kg']].map(([name,type,unit])=>({id:crypto.randomUUID(),name,type,unit}));
  for(const r of resources)await db.query(`INSERT INTO resources(id,"organizationId",name,type,unit,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$6)`,[r.id,orgId,r.name,r.type,r.unit,now]);

  // Eight months of coherent operating history. Floor A electricity jumps only in the latest month.
  const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-7,15));
  for(let m=0;m<8;m++){
    const date=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+m,15));
    const [floorA,floorB,admin]=locs, [elec,water,fuel,material]=resources;
    const electricity=[[floorA,m===7?1240:980],[floorB,760],[admin,300]];
    for(const [loc,value] of electricity){
      await db.query(`INSERT INTO consumption_records(id,"organizationId","locationId","resourceId",quantity,unit,cost,"recordedAt",notes,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,[crypto.randomUUID(),orgId,loc.id,elec.id,value,'kWh',value*.12,date,loc===floorA?'Latest-month demo deviation: inspect operating conditions':'Stable peer-location electricity reading',now]);
    }
    const resourceBases=[[water,[[floorA,5200],[floorB,4100],[admin,2100]]],[fuel,[[floorA,410],[floorB,330]]],[material,[[floorA,300],[floorB,260],[admin,140]]]];
    for(const [r,entries] of resourceBases){
      for(const [loc,base] of entries){
        const drift=m<7?(m-3)*0.01:0;
        const value=Math.round(base*(1+drift));
        await db.query(`INSERT INTO consumption_records(id,"organizationId","locationId","resourceId",quantity,unit,cost,"recordedAt","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,[crypto.randomUUID(),orgId,loc.id,r.id,value,r.unit,value*.05,date,now]);
      }
    }
    const floorAOutput=m===6?1666.67:m===7?1683.33:1600+m*13.33;
    for(const loc of locs){
      const output=loc===floorA?floorAOutput:(loc===floorB?1500:900);
      await db.query(`INSERT INTO production_records(id,"organizationId","locationId","outputQuantity",unit,"recordedAt","createdAt","updatedAt") VALUES($1,$2,$3,$4,'units',$5,$6,$6)`,[crypto.randomUUID(),orgId,loc.id,output,date,now]);
    }
  }

  const anomalies=await detectAnomaliesForOrganization(orgId);
  const electricityAnomaly=anomalies.find(a=>a.resourceType==='ELECTRICITY')||anomalies[0];
  let insightId=null;
  if(electricityAnomaly){
    insightId=crypto.randomUUID();
    const evidence={
      resource:{name:electricityAnomaly.resource,type:electricityAnomaly.resourceType,unit:electricityAnomaly.unit||'kWh'},
      location:{name:electricityAnomaly.location},
      anomaly:{currentValue:Number(electricityAnomaly.currentValue),baselineValue:Number(electricityAnomaly.baselineValue),changePercent:Number(electricityAnomaly.changePercent),severity:electricityAnomaly.severity},
      facts:[
        `Seeded demo signal: ${electricityAnomaly.resource} at ${electricityAnomaly.location} is ${Number(electricityAnomaly.changePercent).toFixed(1)}% above its historical baseline.`,
        'Production output in the latest period changes only slightly compared with the resource deviation.',
        'This investigation is preloaded as demo context; the first Investigate with AI action re-runs the analysis against current workspace data.'
      ]
    };
    const ai={
      severity:electricityAnomaly.severity,
      summary:'Preloaded evidence context for the GreenCore electricity deviation. Run Investigate with AI to generate the live evidence-based explanation.',
      possibleContributingFactors:['The consumption increase is materially larger than the production change, indicating a possible efficiency issue that needs operational investigation.'],
      investigationChecklist:['Review equipment/runtime records for Production Floor A.','Validate HVAC and operating schedules.','Compare the latest meter reading with source records.'],
      recommendedActions:[{title:'Review high-load equipment runtime',description:'Compare equipment duty cycles and operating hours against the baseline period.',priority:electricityAnomaly.severity}],
      monitoringPlan:'Re-measure electricity in the next operating period and compare it with the same baseline method.',
      whyThisCouldBeHappening:'The stored readings show a materially larger electricity increase than the production change; the data supports an efficiency investigation but does not establish a single root cause.'
    };
    await db.query(`INSERT INTO ai_insights(id,"organizationId","anomalyId",summary,severity,"possibleFactors","investigationChecklist","recommendedActions","monitoringPlan","rawResponse","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,[insightId,orgId,electricityAnomaly.id,ai.summary,ai.severity,JSON.stringify(ai.possibleContributingFactors),JSON.stringify(ai.investigationChecklist),JSON.stringify(ai.recommendedActions),ai.monitoringPlan,JSON.stringify({provider:'demo-preloaded',evidence,ai}),now]);
  }

  const open=crypto.randomUUID(),progress=crypto.randomUUID(),done=crypto.randomUUID();
  const floorA=locs[0],floorB=locs[1], electricity=resources[0];
  await db.query(`INSERT INTO action_items(id,"organizationId","insightId",title,description,priority,"assignedTo","locationId","dueDate",status,"createdAt","updatedAt") VALUES
    ($1,$2,$8,'Review high-load equipment runtime','Compare high-consumption equipment duty cycles with the baseline period.','HIGH',$4,$6,CURRENT_DATE+2,'OPEN',$7,$7),
    ($3,$2,$8,'Validate HVAC schedule','Review operating hours and setback schedules around the latest deviation.','MEDIUM',$4,$6,CURRENT_DATE+3,'IN_PROGRESS',$7,$7),
    ($5,$2,$8,'Meter reading reconciliation','Verify the latest electricity meter reading against the source record.','HIGH',$4,$6,CURRENT_DATE-2,'COMPLETED',$7,$7)`,[open,orgId,progress,userId,done,floorA.id,now,insightId]);

  await db.query(`INSERT INTO outcomes(id,"organizationId","actionId","beforeValue","afterValue","percentageChange","resourceId","measuredAt",notes,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,[
    crypto.randomUUID(),orgId,done,1240,1160,((1160-1240)/1240)*100,electricity.id,new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-1)),'Observed change after intervention; this record does not establish sole causality.',now
  ]);

  console.log('[Seed] GreenCore Manufacturing ready: demo@ecopulse.ai / EcoPulse@2026');
}
(async()=>{try{await db.initializeDatabase();await seed(process.argv.includes('--force'));}catch(e){console.error('[Seed] Failed:',e);process.exitCode=1;}finally{await db.pool.end();}})();
