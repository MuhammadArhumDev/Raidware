import mongoose from "mongoose";
import config from "../config/index.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

async function linkOrgUsers() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected successfully.");

    console.log("Finding all organization users...");
    const orgUsers = await User.find({ role: "organization" });
    console.log(`Found ${orgUsers.length} organization users.`);

    let linkedCount = 0;

    for (const user of orgUsers) {
      let org = await Organization.findOne({ email: user.email });

      if (org) {
        user.organizationId = org._id;
        await user.save();
        console.log(`[Migration] Linked user ${user.email} → org ${org._id}`);
      } else {
        org = await Organization.create({
          name: user.name || user.email,
          email: user.email,
        });
        user.organizationId = org._id;
        await user.save();
        console.log(`[Migration] Created org and linked user ${user.email} → org ${org._id}`);
      }
      linkedCount++;
    }

    console.log(`\n[Migration Complete] Total users linked: ${linkedCount}`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    console.log("Closing database connection...");
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

linkOrgUsers();
