import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const runSeed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB for user seeding");

  // Factory Admin
  const factoryAdmin = new User({
    name: "Factory Admin",
    email: "admin@sunlife.com",
    role: "FACTORY_ADMIN",
  });
  await factoryAdmin.setPassword("admin123");
  await factoryAdmin.save();

  // Service Center User
  const serviceCenter = new User({
    name: "Lahore Service Center",
    email: "service@sunlife.com",
    role: "SERVICE_CENTER",
  });
  await serviceCenter.setPassword("service123");
  await serviceCenter.save();

  console.log("Users seeded:");
  console.log({
    factoryAdmin: factoryAdmin.email,
    serviceCenter: serviceCenter.email,
  });

  process.exit();
};

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});