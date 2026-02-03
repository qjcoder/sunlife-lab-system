import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  // ✅ Prevent duplicate admin
  const exists = await User.findOne({
    email: "admin@sunlife.com",
  });

  if (exists) {
    console.log("⚠️ Factory Admin already exists");
    console.log("You can login with:");
    console.log("  Email: admin@sunlife.com");
    console.log("  Password: password");
    process.exit(0);
  }

  const user = new User({
    name: "Factory Admin",
    email: "admin@sunlife.com",
    role: "FACTORY_ADMIN",
    active: true,
  });

  // ✅ Hash password using the method
  await user.setPassword("password");
  await user.save();

  console.log("✅ Factory Admin created correctly");
  console.log("You can login with:");
  console.log("  Email: admin@sunlife.com");
  console.log("  Password: password");
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("❌ Admin creation failed:", err);
  process.exit(1);
});
