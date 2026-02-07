import InstallerProgram from "../models/InstallerProgram.js";
import RewardRule from "../models/RewardRule.js";
import PointsMilestone from "../models/PointsMilestone.js";
import InstallationSubmission from "../models/InstallationSubmission.js";
import User from "../models/User.js";

/**
 * Get active program (current date within startDate..endDate)
 */
export const getActiveProgram = async (req, res) => {
  try {
    const now = new Date();
    const program = await InstallerProgram.findOne({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });
    return res.json(program || null);
  } catch (err) {
    console.error("getActiveProgram:", err);
    return res.status(500).json({ message: "Failed to get active program" });
  }
};

/**
 * List all programs (INSTALLER_PROGRAM_MANAGER)
 */
export const listPrograms = async (req, res) => {
  try {
    const programs = await InstallerProgram.find().sort({ startDate: -1 });
    return res.json(programs);
  } catch (err) {
    console.error("listPrograms:", err);
    return res.status(500).json({ message: "Failed to list programs" });
  }
};

/**
 * Create program
 */
export const createProgram = async (req, res) => {
  try {
    const { name, startDate, endDate, description } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "name, startDate, endDate required" });
    }
    const program = await InstallerProgram.create({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description || null,
      isActive: true,
    });
    return res.status(201).json(program);
  } catch (err) {
    console.error("createProgram:", err);
    return res.status(500).json({ message: "Failed to create program" });
  }
};

/**
 * Update program
 */
export const updateProgram = async (req, res) => {
  try {
    const program = await InstallerProgram.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!program) return res.status(404).json({ message: "Program not found" });
    return res.json(program);
  } catch (err) {
    console.error("updateProgram:", err);
    return res.status(500).json({ message: "Failed to update program" });
  }
};

// --- Reward rules ---
export const listRewardRules = async (req, res) => {
  try {
    const rules = await RewardRule.find().sort({ type: 1 });
    return res.json(rules);
  } catch (err) {
    console.error("listRewardRules:", err);
    return res.status(500).json({ message: "Failed to list reward rules" });
  }
};

export const upsertRewardRule = async (req, res) => {
  try {
    const { type, amountPkr, description } = req.body;
    if (!type || amountPkr == null) {
      return res.status(400).json({ message: "type and amountPkr required" });
    }
    const rule = await RewardRule.findOneAndUpdate(
      { type },
      { amountPkr: Number(amountPkr), description: description || "" },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json(rule);
  } catch (err) {
    console.error("upsertRewardRule:", err);
    return res.status(500).json({ message: "Failed to save reward rule" });
  }
};

// --- Points milestones ---
export const listMilestones = async (req, res) => {
  try {
    const milestones = await PointsMilestone.find().sort({ pointsRequired: 1 });
    return res.json(milestones);
  } catch (err) {
    console.error("listMilestones:", err);
    return res.status(500).json({ message: "Failed to list milestones" });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const { pointsRequired, prizeName, description, order } = req.body;
    if (!pointsRequired || !prizeName) {
      return res.status(400).json({ message: "pointsRequired and prizeName required" });
    }
    const milestone = await PointsMilestone.create({
      pointsRequired: Number(pointsRequired),
      prizeName,
      description: description || "",
      order: order != null ? Number(order) : 0,
    });
    return res.status(201).json(milestone);
  } catch (err) {
    console.error("createMilestone:", err);
    return res.status(500).json({ message: "Failed to create milestone" });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const milestone = await PointsMilestone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    return res.json(milestone);
  } catch (err) {
    console.error("updateMilestone:", err);
    return res.status(500).json({ message: "Failed to update milestone" });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const milestone = await PointsMilestone.findByIdAndDelete(req.params.id);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    return res.json({ message: "Milestone deleted" });
  } catch (err) {
    console.error("deleteMilestone:", err);
    return res.status(500).json({ message: "Failed to delete milestone" });
  }
};

// --- Submissions (manager list, verify, reject) ---
export const listSubmissions = async (req, res) => {
  try {
    const { status, installerId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (installerId) filter.installer = installerId;
    const submissions = await InstallationSubmission.find(filter)
      .populate("installer", "name email")
      .populate("verifiedBy", "name")
      .populate("program", "name startDate endDate")
      .sort({ createdAt: -1 });
    return res.json(submissions);
  } catch (err) {
    console.error("listSubmissions:", err);
    return res.status(500).json({ message: "Failed to list submissions" });
  }
};

export const verifySubmission = async (req, res) => {
  try {
    const sub = await InstallationSubmission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (sub.status !== "PENDING") {
      return res.status(400).json({ message: "Submission already processed" });
    }
    const rewardRule = sub.rewardType
      ? await RewardRule.findOne({ type: sub.rewardType })
      : null;
    const cashAmountPkr = rewardRule ? rewardRule.amountPkr : sub.cashAmountPkr || 0;
    sub.status = "VERIFIED";
    sub.cashAmountPkr = cashAmountPkr;
    sub.pointsAwarded = sub.pointsAwarded ?? 1;
    sub.verifiedBy = req.user.userId || req.user._id;
    sub.verifiedAt = new Date();
    sub.rejectionReason = undefined;
    await sub.save();
    const populated = await InstallationSubmission.findById(sub._id)
      .populate("installer", "name email")
      .populate("verifiedBy", "name")
      .populate("program", "name startDate endDate");
    return res.json(populated);
  } catch (err) {
    console.error("verifySubmission:", err);
    return res.status(500).json({ message: "Failed to verify submission" });
  }
};

export const rejectSubmission = async (req, res) => {
  try {
    const sub = await InstallationSubmission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (sub.status !== "PENDING") {
      return res.status(400).json({ message: "Submission already processed" });
    }
    const { rejectionReason } = req.body;
    sub.status = "REJECTED";
    sub.rejectionReason = rejectionReason || "";
    sub.verifiedBy = req.user.userId || req.user._id;
    sub.verifiedAt = new Date();
    await sub.save();
    const populated = await InstallationSubmission.findById(sub._id)
      .populate("installer", "name email")
      .populate("verifiedBy", "name")
      .populate("program", "name startDate endDate");
    return res.json(populated);
  } catch (err) {
    console.error("rejectSubmission:", err);
    return res.status(500).json({ message: "Failed to reject submission" });
  }
};

// --- Installers (user accounts with role INSTALLER) ---
export const listInstallers = async (req, res) => {
  try {
    const users = await User.find({ role: "INSTALLER" })
      .select("name email username createdAt active")
      .sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error("listInstallers:", err);
    return res.status(500).json({ message: "Failed to list installers" });
  }
};

export const createInstaller = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: "name, username, password required" });
    }
    const existing = await User.findOne({
      $or: [{ username }, { email: username }],
    });
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const user = new User({ name, username, role: "INSTALLER", active: true });
    await user.setPassword(password);
    await user.save();
    return res.status(201).json({
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    console.error("createInstaller:", err);
    return res.status(500).json({ message: "Failed to create installer" });
  }
};

/**
 * Leaderboard: installers with total points and total cash (verified only)
 */
export const getLeaderboard = async (req, res) => {
  try {
    const pipeline = [
      { $match: { status: "VERIFIED" } },
      {
        $group: {
          _id: "$installer",
          totalPoints: { $sum: "$pointsAwarded" },
          totalCashPkr: { $sum: "$cashAmountPkr" },
          installationCount: { $sum: 1 },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      {
        $project: {
          installerId: "$_id",
          installerName: "$user.name",
          email: "$user.email",
          totalPoints: 1,
          totalCashPkr: 1,
          installationCount: 1,
        },
      },
      { $sort: { totalPoints: -1, totalCashPkr: -1 } },
    ];
    const leaderboard = await InstallationSubmission.aggregate(pipeline);
    return res.json(leaderboard);
  } catch (err) {
    console.error("getLeaderboard:", err);
    return res.status(500).json({ message: "Failed to get leaderboard" });
  }
};
