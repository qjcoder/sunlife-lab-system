import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

/** Only script-created Super Admin (has email) can delete accounts. Use after requireAuth + requireRole("FACTORY_ADMIN"). */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const caller = await User.findById(req.user.userId).select("email").lean();
    if (!caller?.email || !caller.email.includes("@")) {
      return res.status(403).json({
        message: "Only the Super Admin can delete accounts.",
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};