import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const user = new User({
    name: "Factory Admin",
    email: "admin@sunlife.com",
    role: "FACTORY_ADMIN",
    active: true,
  });

  // ✅ ONLY THIS — hashes ONCE
  await user.setPassword("password");

  await user.save();

  console.log("✅ Factory Admin created correctly");
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});