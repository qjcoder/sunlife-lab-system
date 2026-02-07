import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * USER SCHEMA
 *
 * Represents all authenticated actors:
 * - FACTORY_ADMIN
 * - DEALER
 * - SUB_DEALER
 * - SERVICE_CENTER
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /** Login: Admin uses email (Gmail, Outlook); other roles use username. Index: sparse unique so multiple users can omit email. */
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["FACTORY_ADMIN", "DEALER", "SUB_DEALER", "SERVICE_CENTER", "DATA_ENTRY_OPERATOR", "INSTALLER_PROGRAM_MANAGER", "INSTALLER"],
      required: true,
    },

    /**
     * Parent dealer reference
     * - NULL → main dealer
     * - ObjectId → sub-dealer
     */
    parentDealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* --------------------------------------------------
 * Sparse unique index: allow multiple docs without email.
 * (MongoDB unique index treats null as a value; omit field instead.)
 * -------------------------------------------------- */
userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.pre("save", async function () {
  if (this.email === null || this.email === "") {
    this.$unset("email"); // omit from document so sparse unique index allows multiple users without email
  }
});

/* --------------------------------------------------
 * Password helpers
 * -------------------------------------------------- */
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("User", userSchema);