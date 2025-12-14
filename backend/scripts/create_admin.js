import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

console.log("Script started...");

import User from "../src/models/User.js";

// Setup paths for .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const createAdmin = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/multitenant_receptionist";

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected.");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@raidware.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";

    // Check if user exists
    let user = await User.findOne({ email: adminEmail });

    if (user) {
      console.log(`User ${adminEmail} found. Updating role to admin...`);
      user.role = "admin";
      // Only update password if needed, but for seed script, maybe force it?
      // user.password = adminPassword; // Triggers hash hook
      await user.save();
      console.log("User role updated to admin.");
    } else {
      console.log(`User ${adminEmail} not found. Creating new admin user...`);
      user = new User({
        name: "System Administrator",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      await user.save();
      console.log("Admin user created successfully.");
    }

    console.log("Done.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
