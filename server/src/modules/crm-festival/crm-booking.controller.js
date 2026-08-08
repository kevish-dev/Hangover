import * as service from "./crm-booking.service.js";
export const create = async (req,res,next)=>{try{res.status(201).json(await service.createCrmFestivalBooking(req.params.id,req.body,req.user.id));}catch(e){next(e)}};
export const createPublic = async (req,res,next)=>{try{res.status(201).json(await service.createPublicCrmFestivalBooking(req.params.id,req.body,req.user.id));}catch(e){next(e)}};
export const list = async (req,res,next)=>{try{res.json(await service.listCrmFestivalBookings(req.params.id));}catch(e){next(e)}};
export const createInstallment = async (req,res,next)=>{try{res.status(201).json(await service.createCrmFestivalInstallment(req.params.id,req.params.bookingId,req.body,req.user.id));}catch(e){next(e)}};
