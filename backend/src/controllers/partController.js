import Part from "../models/Part.js";

/**
 * List all parts (catalog). Optionally filter by model: ?inverterModel=id
 * GET /api/parts
 */
export const listParts = async (req, res) => {
  try {
    const filter = req.query.inverterModel ? { inverterModel: req.query.inverterModel } : {};
    const parts = await Part.find(filter)
      .populate("inverterModel", "brand productLine variant modelCode modelName")
      .sort({ inverterModel: 1, partCode: 1 })
      .lean();
    return res.json({ message: "OK", parts });
  } catch (err) {
    console.error("List parts error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Create a part (for a specific model/variant).
 * POST /api/parts
 */
export const createPart = async (req, res) => {
  try {
    const { inverterModel, partCode, partName, description } = req.body;
    if (!inverterModel || !partCode || !partName) {
      return res.status(400).json({ message: "inverterModel, partCode and partName are required" });
    }
    const existing = await Part.findOne({
      inverterModel,
      partCode: partCode.trim(),
    });
    if (existing) {
      return res.status(409).json({ message: "Part with this part code already exists for this model" });
    }
    const part = await Part.create({
      inverterModel,
      partCode: partCode.trim(),
      partName: partName.trim(),
      description: (description || "").trim(),
    });
    const populated = await Part.findById(part._id)
      .populate("inverterModel", "brand productLine variant modelCode modelName")
      .lean();
    return res.status(201).json({ message: "Part created", part: populated || part });
  } catch (err) {
    console.error("Create part error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update a part.
 * PUT /api/parts/:id
 */
export const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const { partCode, partName, description } = req.body;
    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }
    const newCode = partCode != null ? partCode.trim() : part.partCode;
    if (partCode != null) part.partCode = newCode;
    if (partName != null) part.partName = partName.trim();
    if (description != null) part.description = description.trim();
    const existing = await Part.findOne({
      inverterModel: part.inverterModel,
      partCode: newCode,
      _id: { $ne: id },
    });
    if (existing) {
      return res.status(409).json({ message: "Part with this part code already exists for this model" });
    }
    await part.save();
    const populated = await Part.findById(part._id)
      .populate("inverterModel", "brand productLine variant modelCode modelName")
      .lean();
    return res.json({ message: "Part updated", part: populated || part });
  } catch (err) {
    console.error("Update part error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a part.
 * DELETE /api/parts/:id
 */
export const deletePart = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await Part.findByIdAndDelete(id);
    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }
    return res.json({ message: "Part deleted" });
  } catch (err) {
    console.error("Delete part error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
