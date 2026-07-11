import * as service from "./landing-trip-type.service.js";

export const getTripTypes = async (req, res, next) => { try { const data = await service.getTripTypes(req.user?.role === "ADMIN" && req.query.adminView === "true"); res.status(200).json({ data }); } catch (error) { next(error); } };
export const createTripType = async (req, res, next) => { try { const tripType = await service.createTripType(req.body); res.status(201).json({ tripType }); } catch (error) { next(error); } };
export const updateTripType = async (req, res, next) => { try { const tripType = await service.updateTripType(req.params.id, req.body); res.status(200).json({ tripType }); } catch (error) { next(error); } };
export const deleteTripType = async (req, res, next) => { try { await service.deleteTripType(req.params.id); res.status(200).json({ message: "Trip type deleted" }); } catch (error) { next(error); } };
export const uploadTripTypeImage = async (req, res, next) => { try { const imageUrl = await service.uploadTripTypeImage(req.file); res.status(201).json({ imageUrl }); } catch (error) { next(error); } };
