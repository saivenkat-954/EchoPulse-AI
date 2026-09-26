const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
router.use(authenticateToken);

async function getCurrent(req,res,next){
  try {
    const r = await db.query('SELECT id,name,industry,"createdAt","updatedAt" FROM organizations WHERE id=$1',[req.user.organizationId]);
    if(!r.rowCount) return res.status(404).json({success:false,error:{code:'ORG_NOT_FOUND',message:'Organization not found'}});
    res.json({success:true,data:r.rows[0]});
  } catch(e){next(e)}
}

router.get('/current', getCurrent);
router.get('/me', getCurrent);

router.put('/current', async(req,res,next)=>{
  try {
    const b=z.object({name:z.string().trim().min(2).max(160),industry:z.string().trim().min(2).max(120)}).parse(req.body);
    const now=new Date();
    const r=await db.query('UPDATE organizations SET name=$1,industry=$2,"updatedAt"=$3 WHERE id=$4 RETURNING id,name,industry,"createdAt","updatedAt"',[b.name,b.industry,now,req.user.organizationId]);
    if(!r.rowCount) return res.status(404).json({success:false,error:{code:'ORG_NOT_FOUND',message:'Organization not found'}});
    res.json({success:true,data:r.rows[0]});
  } catch(e){next(e)}
});
module.exports=router;
