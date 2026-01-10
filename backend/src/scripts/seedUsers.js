import mongoose from "mongoose";
import config from "../config/index.js";
import User from "../models/User.js";

const seedUsers = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");

    // Clear existing users
    console.log("Clearing existing users...");
    await User.deleteMany({});

    // 1. Create Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@raidware.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";

    console.log(`Creating Admin User: ${adminEmail}`);
    await User.create({
      name: "System Administrator",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    // 2. Create Normal Users (Organization role)
    const usersToCreate = [
      {
        name: "Riphah IT",
        email: "one@raidware.com",
        password: "one@123",
        role: "organization",
      },
      {
        name: "NUST IT",
        email: "two@raidware.com",
        password: "two@123",
        role: "organization",
      },
    ];

    console.log("Creating Organization Users...");
    for (const u of usersToCreate) {
      await User.create(u);
      console.log(`Created user: ${u.email}`);
    }

    console.log("\n✅ Users seed completed successfully!");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedUsers();
