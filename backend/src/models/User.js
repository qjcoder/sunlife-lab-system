import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * USER SCHEMA
 *
 * Represents all authenticated actors in system:
 * - FACTORY_ADMIN
 * - DEALER
 * - SERVICE_CENTER
 */
const userSchema = new mongoose.Schema(
  {
    // Display name
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

    // Hashed password ONLY
    passwordHash: {
      type: String,
      required: true,
    },

    // Role-based access control
    role: {
      type: String,
      enum: ["FACTORY_ADMIN", "DEALER", "SERVICE_CENTER"],
      required: true,
    },

    // Soft-disable account
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * ----------------------------------------------------
 * PASSWORD HELPERS
 * ----------------------------------------------------
 */

/**
 * Hash and store password
 * ⚠️ MUST be called manually
 */
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

/**
 * Verify password during login
 */
userSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("User", userSchema);