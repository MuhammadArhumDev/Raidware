import mongoose from "mongoose";
import config from "../config/index.js";
import Organization from "../models/Organization.js";
import Network from "../models/Network.js";
import Threat from "../models/Threat.js";

// Helper to get random item from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Helper to get random number between min and max
const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
// Helper to get random date within last X days
const getRandomDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - getRandomInt(0, daysAgo));
  date.setHours(getRandomInt(0, 23), getRandomInt(0, 59), 0, 0);
  return date;
};

const seedData = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");

    // Clear existing data
    console.log("Clearing existing data...");
    await Organization.deleteMany({});
    await Network.deleteMany({});
    await Threat.deleteMany({});

    // 1. Create Organizations
    const organizations = [];
    const orgNames = [
      "Acme Corp",
      "Cyberdyne Systems",
      "Massive Dynamic",
      "Wayne Enterprises",
      "Stark Industries",
      "Umbrella Corp",
      "Globex",
      "Initech",
      "Hooli",
      "Soylent Corp",
    ];

    console.log("Creating organizations...");
    for (const name of orgNames) {
      const createdAt = getRandomDate(30);
      const org = await Organization.create({
        name,
        email: `admin@${name.replace(/\s+/g, "").toLowerCase()}.com`,
        status: getRandom(["active", "active", "active", "suspended"]), // Mostly active
        createdAt,
      });
      organizations.push(org);
    }

    // 2. Create Networks (One per Organization)
    const networks = [];
    console.log("Creating networks...");
    for (const org of organizations) {
      const createdAt = new Date(org.createdAt);
      createdAt.setHours(createdAt.getHours() + 1); // Created shortly after org

      const network = await Network.create({
        name: `${org.name} Network`,
        organizationId: org._id,
        status: getRandom(["online", "online", "online", "degraded"]),
        createdAt,
      });
      networks.push(network);
    }

    // 3. Create Threats (Few threats)
    const threatTypes = [
      { type: "Rogue AP Detected", severity: "critical" },
      { type: "ARP Spoofing", severity: "high" },
      { type: "Unauthorized Access", severity: "medium" },
      { type: "Weak Encryption", severity: "medium" },
    ];

    console.log("Creating threats...");
    let threatCount = 0;
    // Generate minimal threats
    for (const net of networks) {
      // 0 to 2 threats per network
      const numThreats = getRandomInt(0, 2);
      for (let i = 0; i < numThreats; i++) {
        const threatMeta = getRandom(threatTypes);
        const createdAt = getRandomDate(10); // Recent threats

        await Threat.create({
          type: threatMeta.type,
          severity: threatMeta.severity,
          organizationId: net.organizationId,
          networkId: net._id,
          status: getRandom(["active", "resolved"]),
          description: `Security alert on ${net.name}: ${threatMeta.type}`,
          createdAt,
        });
        threatCount++;
      }
    }

    console.log("\n✅ Seed completed successfully!");
    console.log(`   - ${organizations.length} Organizations created`);
    console.log(`   - ${networks.length} Networks created`);
    console.log(`   - ${threatCount} Threats created`);

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

seedData();
