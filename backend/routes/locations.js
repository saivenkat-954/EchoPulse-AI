const crypto=require('crypto');
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
router.use(authenticateToken);

const id = z.string().trim().min(1).max(100);
const bodySchema = z.object({ name:z.string().trim().min(2).max(160), description:z.string().trim().max(500).optional().default('') });

router.get('/', async(req,res,next)=>{try{const r=await db.query('SELECT * FROM locations WHERE "organizationId"=$1 ORDER BY name',[req.user.organizationId]);res.json({success:true,data:r.rows})}catch(e){next(e)}});
router.get('/:id', async(req,res,next)=>{try{id.parse(req.params.id);const r=await db.query('SELECT * FROM locations WHERE id=$1 AND "organizationId"=$2',[req.params.id,req.user.organizationId]);if(!r.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Location not found'}});res.json({success:true,data:r.rows[0]})}catch(e){next(e)}});
router.post('/', async(req,res,next)=>{try{const b=bodySchema.parse(req.body);const now=new Date(), locationId=crypto.randomUUID();const r=await db.query('INSERT INTO locations(id,"organizationId",name,description,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$5) RETURNING *',[locationId,req.user.organizationId,b.name,b.description,now]);res.status(201).json({success:true,data:r.rows[0]})}catch(e){next(e)}});
router.put('/:id', async(req,res,next)=>{try{id.parse(req.params.id);const b=bodySchema.parse(req.body);const r=await db.query('UPDATE locations SET name=$1,description=$2,"updatedAt"=$3 WHERE id=$4 AND "organizationId"=$5 RETURNING *',[b.name,b.description,new Date(),req.params.id,req.user.organizationId]);if(!r.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Location not found'}});res.json({success:true,data:r.rows[0]})}catch(e){next(e)}});
router.delete('/:id', async(req,res,next)=>{try{id.parse(req.params.id);const r=await db.query('DELETE FROM locations WHERE id=$1 AND "organizationId"=$2 RETURNING id',[req.params.id,req.user.organizationId]);if(!r.rowCount)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Location not found'}});res.json({success:true,data:{id:req.params.id}})}catch(e){next(e)}});
module.exports=router;
