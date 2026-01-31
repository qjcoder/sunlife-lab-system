import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * User Schema
 * Handles authentication & role-based access
 */
const userSchema = new mongoose.Schema(
  {
    // Display name (used for service center matching)
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Login email (unique)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // 🔐 Hashed password (bcrypt)
    passwordHash: {
      type: String,
      required: true,
    },

    // User role in system
    role: {
      type: String,
      enum: ["FACTORY_ADMIN", "SERVICE_CENTER"],
      required: true,
    },

    // Soft enable/disable login
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

/**
 * Hash and store password
 */
userSchema.methods.setPassword = async function (password) {
  if (!password) {
    throw new Error("Password is required");
  }
  this.passwordHash = await bcrypt.hash(password, 10);
};

/**
 * Verify plain password against stored hash
 */
userSchema.methods.verifyPassword = async function (password) {
  if (!password || !this.passwordHash) {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("User", userSchema);