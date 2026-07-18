import * as service from "./custom-trip.service.js";
import { ValidationError } from "../../core/errors/errors.js";

const requestData = (req) => {
  if (!req.body?.data) return req.body;
  try {
    return JSON.parse(req.body.data);
  } catch {
    throw new ValidationError("Custom trip form data is invalid.");
  }
};

export const list = async (req, res, next) => {
  try { res.json(await service.listCustomTrips(req.query)); } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try { res.json(await service.getCustomTrip(req.params.id)); } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try { res.status(201).json(await service.createCustomTrip(req.user.id, requestData(req), req.files || [])); } catch (error) { next(error); }
};

export const update = async (req, res, next) => {
  try { res.json(await service.updateCustomTrip(req.params.id, requestData(req), req.files || [])); } catch (error) { next(error); }
};

export const uploadBanners = async (req, res, next) => {
  try { res.json(await service.uploadBanners(req.params.id, req.files, req.user.id)); } catch (error) { next(error); }
};

export const removeBanner = async (req, res, next) => {
  try {
    if (!req.body?.imageUrl) throw new ValidationError("imageUrl is required.");
    res.json(await service.removeBanner(req.params.id, req.body.imageUrl));
  } catch (error) { next(error); }
};

export const send = async (req, res, next) => {
  try { res.json(await service.sendCustomTrip(req.params.id)); } catch (error) { next(error); }
};

export const duplicate = async (req, res, next) => {
  try { res.status(201).json(await service.duplicateCustomTrip(req.params.id, req.user.id)); } catch (error) { next(error); }
};

export const cancel = async (req, res, next) => {
  try { res.json(await service.cancelCustomTrip(req.params.id, req.body?.reason)); } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try { res.json(await service.deleteCustomTrip(req.params.id)); } catch (error) { next(error); }
};

export const getOffer = async (req, res, next) => {
  try { res.json(await service.getOffer(req.params.token, req.user)); } catch (error) { next(error); }
};

export const bookOffer = async (req, res, next) => {
  try { res.status(201).json(await service.bookOffer(req.params.token, req.user.id, req.body)); } catch (error) { next(error); }
};
