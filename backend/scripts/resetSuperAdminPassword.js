/**
 * Recover Super Admin when password (or email) is forgotten.
 * Finds the Super Admin by email and sets a new password. Does NOT delete any users.
 *
 * Usage:
 *   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=YourNewPassword npm run reset-super-admin-password
 *
 * Optional: update name
 *   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=YourNewPassword ADMIN_NAME="Your Name" npm run reset-super-admin-password
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME;

async function resetSuperAdminPassword() {
  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) {
    console.error("❌ Set ADMIN_EMAIL (the Super Admin's email, e.g. yourname@gmail.com).");
    process.exit(1);
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
    console.error("❌ ADMIN_PASSWORD must be at least 6 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({
    email: ADMIN_EMAIL.toLowerCase().trim(),
    role: "FACTORY_ADMIN",
  });

  if (!user) {
    console.error("❌ No Super Admin found with email:", ADMIN_EMAIL);
    console.error("   Check ADMIN_EMAIL or create a Super Admin with: npm run create-admin");
    process.exit(1);
  }

  await user.setPassword(ADMIN_PASSWORD);
  if (ADMIN_NAME && ADMIN_NAME.trim()) {
    user.name = ADMIN_NAME.trim();
  }
  await user.save();

  console.log("✅ Super Admin password updated.");
  console.log("   Email:", user.email);
  console.log("   Name:", user.name);
  console.log("   You can now log in with this email and the new password.");
  process.exit(0);
}

resetSuperAdminPassword().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
