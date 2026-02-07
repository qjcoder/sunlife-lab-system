import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sunlife.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";
const ADMIN_NAME = process.env.ADMIN_NAME || "Factory Admin";

async function resetUsersAndCreateSuperAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) {
    console.error("❌ Set ADMIN_EMAIL (e.g. yourname@gmail.com).");
    process.exit(1);
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
    console.error("❌ ADMIN_PASSWORD must be at least 6 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const deleted = await User.deleteMany({});
  console.log("✅ Removed", deleted.deletedCount, "user(s) from MongoDB.");

  const user = new User({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase().trim(),
    role: "FACTORY_ADMIN",
    active: true,
  });
  await user.setPassword(ADMIN_PASSWORD);
  await user.save();

  console.log("✅ Super Admin created.");
  console.log("   Name:", user.name);
  console.log("   Email:", user.email);
  console.log("   Password: (value from ADMIN_PASSWORD)");
  console.log("");
  console.log("   Run with custom values:");
  console.log("   ADMIN_NAME=\"Your Name\" ADMIN_EMAIL=you@gmail.com ADMIN_PASSWORD=YourPass node scripts/resetUsersAndCreateSuperAdmin.js");
  process.exit(0);
}

resetUsersAndCreateSuperAdmin().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
