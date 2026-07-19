import * as circuitService from "./circuit.service.js";

// ═══════════════════════════════════════════════════════════════════════════
// Circuit CRUD
// ═══════════════════════════════════════════════════════════════════════════
export const getCircuits = async (req, res, next) => {
  try {
    const { page, limit, ...query } = req.query;
    const result = await circuitService.getCircuits(page, limit, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCircuitById = async (req, res, next) => {
  try {
    const circuit = await circuitService.getCircuitById(req.params.id);
    res.status(200).json(circuit);
  } catch (error) {
    next(error);
  }
};



export const createCircuit = async (req, res, next) => {
  try {
    const circuit = await circuitService.createCircuit(req.body, req.user.id);
    res.status(201).json({ message: "Circuit created successfully", circuit });
  } catch (error) {
    next(error);
  }
};

export const updateCircuit = async (req, res, next) => {
  try {
    const circuit = await circuitService.updateCircuit(req.params.id, req.body);
    res.status(200).json({ message: "Circuit updated successfully", circuit });
  } catch (error) {
    next(error);
  }
};

export const deleteCircuit = async (req, res, next) => {
  try {
    await circuitService.deleteCircuit(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Circuit Media
// ═══════════════════════════════════════════════════════════════════════════
export const createUploadSignature = async (req, res, next) => {
  try {
    const result = await circuitService.createUploadSignature();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const uploadBanners = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No images provided" });
    }
    const buffers = files.map(file => file.buffer);
    const circuit = await circuitService.uploadBannerImages(req.params.id, buffers);
    res.status(200).json({ message: "Banner images uploaded successfully", circuit });
  } catch (error) {
    next(error);
  }
};

export const createBannerUploadSignature = async (req, res, next) => {
  try {
    const result = await circuitService.createBannerUploadSignature(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const attachBannerImages = async (req, res, next) => {
  try {
    const circuit = await circuitService.attachBannerImages(req.params.id, req.body?.imageUrls);
    res.status(200).json({ message: "Banner images attached successfully", circuit });
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "imageUrl is required" });
    }
    const circuit = await circuitService.deleteBannerImage(req.params.id, imageUrl);
    res.status(200).json({ message: "Banner image deleted successfully", circuit });
  } catch (error) {
    next(error);
  }
};

export const syncHighlights = async (req, res, next) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ message: "Payload missing" });
    }
    const files = req.files || [];
    const circuit = await circuitService.syncHighlights(req.params.id, payload, files);
    res.status(200).json({ message: "Highlights updated", circuit });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDay sub-resource
// ═══════════════════════════════════════════════════════════════════════════
export const addDay = async (req, res, next) => {
  try {
    const day = await circuitService.addDay(req.params.id, req.body);
    res.status(201).json({ message: "Day added successfully", day });
  } catch (error) {
    next(error);
  }
};

export const editDay = async (req, res, next) => {
  try {
    const day = await circuitService.editDay(
      req.params.id,
      req.params.dayId,
      req.body
    );
    res.status(200).json({ message: "Day updated successfully", day });
  } catch (error) {
    next(error);
  }
};

export const removeDay = async (req, res, next) => {
  try {
    await circuitService.removeDay(req.params.id, req.params.dayId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDayTask sub-resource
// ═══════════════════════════════════════════════════════════════════════════
export const addTask = async (req, res, next) => {
  try {
    const task = await circuitService.addTask(
      req.params.id,
      req.params.dayId,
      req.body
    );
    res.status(201).json({ message: "Task added successfully", task });
  } catch (error) {
    next(error);
  }
};

export const editTask = async (req, res, next) => {
  try {
    const task = await circuitService.editTask(
      req.params.id,
      req.params.dayId,
      req.params.taskId,
      req.body
    );
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    next(error);
  }
};

export const removeTask = async (req, res, next) => {
  try {
    await circuitService.removeTask(
      req.params.id,
      req.params.dayId,
      req.params.taskId
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
