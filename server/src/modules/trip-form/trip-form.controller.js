import * as tripFormService from "./trip-form.service.js";

export const createFormField = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const formField = await tripFormService.createFormField(tripId, req.body);
    res.status(201).json(formField);
  } catch (error) {
    next(error);
  }
};

export const getFormFields = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const formFields = await tripFormService.getFormFields(tripId);
    res.status(200).json(formFields);
  } catch (error) {
    next(error);
  }
};

export const updateFormField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const updated = await tripFormService.updateFormField(fieldId, req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteFormField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    await tripFormService.deleteFormField(fieldId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
