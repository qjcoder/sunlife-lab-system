import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["FACTORY_ADMIN", "SERVICE_CENTER"],
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔐 Password helpers
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("User", userSchema);