import * as tripFormService from "./trip-form.service.js";

export const createFormField = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const formField = await tripFormService.createFormField(tripId, req.body);
    res.status(201).json(formField);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A field with this key already exists for this trip." });
    }
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
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A field with this key already exists for this trip." });
    }
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

export const updateFieldOrder = async (req, res, next) => {
  try {
    const { fieldIds } = req.body;
    if (!Array.isArray(fieldIds)) {
      return res.status(400).json({ message: "fieldIds must be an array" });
    }
    await tripFormService.updateFieldOrder(fieldIds);
    res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const getTripSubmissions = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const rawResponses = await tripFormService.getSubmissions(tripId);
    
    // Group responses by bookingId and travelerIndex
    const submissionsMap = {};
    for (const resp of rawResponses) {
      const key = `${resp.bookingId}_${resp.travelerIndex}`;
      if (!submissionsMap[key]) {
        submissionsMap[key] = {
          bookingId: resp.bookingId,
          travelerIndex: resp.travelerIndex,
          travelerName: resp.booking?.user?.profile?.fullName || 'Unknown Traveler',
          responses: []
        };
      }
      submissionsMap[key].responses.push({
        id: resp.id,
        fieldId: resp.fieldId,
        label: resp.field?.label,
        value: resp.value,
        fileUrl: resp.fileUrl
      });
    }

    res.status(200).json(Object.values(submissionsMap));
  } catch (error) {
    next(error);
  }
};
