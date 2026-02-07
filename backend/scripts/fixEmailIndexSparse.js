/**
 * One-time fix: drop the users collection's email_1 index so Mongoose can recreate it as sparse.
 * Run: node scripts/fixEmailIndexSparse.js
 * Required when you see: E11000 duplicate key error ... index: email_1 dup key: { email: null }
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const coll = mongoose.connection.collection("users");
  try {
    await coll.dropIndex("email_1");
    console.log("Dropped index email_1. Restart the server so Mongoose can recreate it as sparse.");
  } catch (err) {
    if (err.code === 27 || err.message?.includes("index not found")) {
      console.log("Index email_1 does not exist or already dropped. Nothing to do.");
    } else {
      throw err;
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
