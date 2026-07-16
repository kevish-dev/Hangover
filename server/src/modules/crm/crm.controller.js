import * as crmService from "./crm.service.js";

export const listContacts = async (req, res, next) => {
  try { res.json(await crmService.listContacts(req.query)); } catch (error) { next(error); }
};

export const getContact = async (req, res, next) => {
  try { res.json(await crmService.getContact(req.params.id)); } catch (error) { next(error); }
};

export const createContact = async (req, res, next) => {
  try { res.status(201).json(await crmService.createContact(req.body)); } catch (error) { next(error); }
};

export const updateContact = async (req, res, next) => {
  try { res.json(await crmService.updateContact(req.params.id, req.body)); } catch (error) { next(error); }
};

export const listLeads = async (req, res, next) => {
  try { res.json(await crmService.listLeads(req.query)); } catch (error) { next(error); }
};

export const getLead = async (req, res, next) => {
  try { res.json(await crmService.getLead(req.params.id)); } catch (error) { next(error); }
};

export const createLead = async (req, res, next) => {
  try { res.status(201).json(await crmService.createLead(req.body, req.user.id)); } catch (error) { next(error); }
};

export const updateLead = async (req, res, next) => {
  try { res.json(await crmService.updateLead(req.params.id, req.body, req.user.id)); } catch (error) { next(error); }
};

export const createActivity = async (req, res, next) => {
  try { res.status(201).json(await crmService.createActivity(req.body, req.user.id)); } catch (error) { next(error); }
};

export const listTasks = async (req, res, next) => {
  try { res.json(await crmService.listTasks(req.query)); } catch (error) { next(error); }
};

export const createTask = async (req, res, next) => {
  try { res.status(201).json(await crmService.createTask(req.body, req.user.id)); } catch (error) { next(error); }
};

export const updateTask = async (req, res, next) => {
  try { res.json(await crmService.updateTask(req.params.id, req.body, req.user.id)); } catch (error) { next(error); }
};

