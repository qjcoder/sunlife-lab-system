import InstallationSubmission from "../models/InstallationSubmission.js";
import InstallerProgram from "../models/InstallerProgram.js";
import RewardRule from "../models/RewardRule.js";
import InverterUnit from "../models/InverterUnit.js";

/**
 * Resolve reward type from product types (from InverterModel.productType)
 * Returns { rewardType, cashAmountPkr } or error message.
 */
async function resolveRewardType(serialNumbers, programId) {
  if (!serialNumbers || serialNumbers.length === 0) {
    return { error: "At least one serial number required" };
  }
  if (serialNumbers.length > 2) {
    return { error: "Maximum 2 serial numbers (Battery + Inverter combo)" };
  }

  const units = await InverterUnit.find({
    serialNumber: { $in: serialNumbers },
  }).populate("inverterModel", "productType modelCode");

  const missing = serialNumbers.filter((s) => !units.some((u) => u.serialNumber === s));
  if (missing.length) {
    return { error: "Serial not found in company database", missingSerials: missing };
  }

  const types = units.map((u) => (u.inverterModel && u.inverterModel.productType) || "Inverter");
  let rewardType = null;

  if (types.length === 1) {
    const t = types[0];
    if (t === "Battery") rewardType = "SINGLE_BATTERY";
    else if (t === "Inverter") rewardType = "SINGLE_INVERTER";
    else if (t === "VFD") rewardType = "SINGLE_VFD";
    else rewardType = "SINGLE_INVERTER";
  } else {
    const hasBattery = types.includes("Battery");
    const hasInverter = types.includes("Inverter");
    if (hasBattery && hasInverter) rewardType = "BATTERY_PLUS_INVERTER";
    else {
      return { error: "Two serials must be one Battery and one Inverter for combo reward" };
    }
  }

  const rule = await RewardRule.findOne({ type: rewardType });
  const cashAmountPkr = rule ? rule.amountPkr : 0;

  return { rewardType, cashAmountPkr };
}

/**
 * Submit installation (INSTALLER or INSTALLER_PROGRAM_MANAGER)
 * Body: installerName, location, contactNumber, serialNumbers (array), optional videoPath
 * If multer used, video path comes from req.file.path or saved under /installer-videos/...
 */
export const submitInstallation = async (req, res) => {
  try {
    const now = new Date();
    const activeProgram = await InstallerProgram.findOne({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });

    if (!activeProgram) {
      return res.status(400).json({
        message: "No active installer program. Program may have ended or not started.",
      });
    }

    const installerId = req.user.userId || req.user._id;
    let { installerName, location, contactNumber, serialNumbers } = req.body;
    if (typeof serialNumbers === "string") {
      try {
        serialNumbers = JSON.parse(serialNumbers);
      } catch {
        serialNumbers = serialNumbers.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (!installerName || !location || !contactNumber) {
      return res.status(400).json({
        message: "installerName, location, contactNumber required",
      });
    }

    const serials = Array.isArray(serialNumbers)
      ? serialNumbers.map((s) => String(s).trim()).filter(Boolean)
      : serialNumbers
        ? [String(serialNumbers).trim()].filter(Boolean)
        : [];
    if (serials.length === 0) {
      return res.status(400).json({ message: "At least one serial number required" });
    }

    const alreadyUsed = await InstallationSubmission.findOne({
      program: activeProgram._id,
      status: "VERIFIED",
      serialNumbers: { $in: serials },
    });
    if (alreadyUsed) {
      return res.status(400).json({
        message: "One or more serial numbers already used in a verified submission",
      });
    }

    const pendingSame = await InstallationSubmission.findOne({
      program: activeProgram._id,
      status: "PENDING",
      serialNumbers: { $in: serials },
    });
    if (pendingSame) {
      return res.status(400).json({
        message: "A pending submission already exists for one of these serials",
      });
    }

    const resolved = await resolveRewardType(serials, activeProgram._id);
    if (resolved.error) {
      return res.status(400).json({
        message: resolved.error,
        missingSerials: resolved.missingSerials,
      });
    }

    let videoPath = req.body.videoPath || null;
    if (req.file && req.file.filename) {
      videoPath = `/installer-videos/${req.file.filename}`;
    }

    const submission = await InstallationSubmission.create({
      installer: installerId,
      installerName: installerName.trim(),
      location: location.trim(),
      contactNumber: contactNumber.trim(),
      serialNumbers: serials,
      videoPath,
      status: "PENDING",
      rewardType: resolved.rewardType,
      cashAmountPkr: resolved.cashAmountPkr,
      pointsAwarded: 1,
      program: activeProgram._id,
    });

    const populated = await InstallationSubmission.findById(submission._id)
      .populate("installer", "name email")
      .populate("program", "name startDate endDate");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("submitInstallation:", err);
    return res.status(500).json({ message: "Failed to submit installation" });
  }
};

/**
 * List my submissions (INSTALLER)
 */
export const listMySubmissions = async (req, res) => {
  try {
    const installerId = req.user.userId || req.user._id;
    const submissions = await InstallationSubmission.find({ installer: installerId })
      .populate("program", "name startDate endDate")
      .sort({ createdAt: -1 });
    return res.json(submissions);
  } catch (err) {
    console.error("listMySubmissions:", err);
    return res.status(500).json({ message: "Failed to list submissions" });
  }
};

/**
 * Get my stats (points, cash, count) for leaderboard display
 */
export const getMyStats = async (req, res) => {
  try {
    const installerId = req.user.userId || req.user._id;
    const stats = await InstallationSubmission.aggregate([
      { $match: { installer: installerId, status: "VERIFIED" } },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: "$pointsAwarded" },
          totalCashPkr: { $sum: "$cashAmountPkr" },
          count: { $sum: 1 },
        },
      },
    ]);
    const result = stats[0] || { totalPoints: 0, totalCashPkr: 0, count: 0 };
    return res.json(result);
  } catch (err) {
    console.error("getMyStats:", err);
    return res.status(500).json({ message: "Failed to get stats" });
  }
};
