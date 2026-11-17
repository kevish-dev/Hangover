import { Router } from "express";
import { optionalAuth, requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import { prisma } from "../../prisma/client.js";
import { getTrackRecord } from "./track-record.js";
const router = Router();
router.get("/track-record", async (req, res, next) => {
  try {
    res.json(await getTrackRecord());
  } catch (error) {
    next(error);
  }
});
const models = { footprints: prisma.landingFootprint, journey: prisma.landingJourneyMilestone };
const fields = { footprints: ["value","suffix","label","sublabel","sortOrder","isActive"], journey: ["period","title","tagline","description","iconName","sortOrder","isActive"] };
const valid = (type) => models[type];
router.get("/:type", optionalAuth, async (req,res,next) => { try { const model = valid(req.params.type); if (!model) return res.status(404).json({message:"Unknown landing content"}); const admin = req.user?.role === "ADMIN" && req.query.adminView === "true"; res.json({data: await model.findMany({where: admin ? {} : {isActive:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]})}); } catch(e){next(e);} });
router.use(requireAuth, requireAdmin);
router.post("/:type", async (req,res,next) => { try { const model=valid(req.params.type); if(!model)return res.status(404).json({message:"Unknown landing content"}); const data=Object.fromEntries(fields[req.params.type].filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]])); const item=await model.create({data}); res.status(201).json({item}); }catch(e){next(e);} });
router.put("/:type/:id", async (req,res,next) => { try { const model=valid(req.params.type); if(!model)return res.status(404).json({message:"Unknown landing content"}); const data=Object.fromEntries(fields[req.params.type].filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]])); res.json({item:await model.update({where:{id:req.params.id},data})}); }catch(e){next(e);} });
router.delete("/:type/:id", async (req,res,next) => { try { const model=valid(req.params.type); if(!model)return res.status(404).json({message:"Unknown landing content"}); await model.delete({where:{id:req.params.id}}); res.status(204).end(); }catch(e){next(e);} });
export default router;
