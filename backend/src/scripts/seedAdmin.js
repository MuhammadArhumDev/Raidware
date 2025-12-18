import mongoose from "mongoose";
import config from "../config/index.js";
import Organization from "../models/Organization.js";
import Network from "../models/Network.js";
import Threat from "../models/Threat.js";

const seedData = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");

    // Clear existing data
    await Organization.deleteMany({});
    await Network.deleteMany({});
    await Threat.deleteMany({});
    console.log("Cleared existing data");

    // Create organizations with different creation dates
    const organizations = [];
    const orgData = [
      { name: "Acme Corporation", email: "admin@acme.com", daysAgo: 6 },
      { name: "Tech Industries", email: "contact@techind.com", daysAgo: 5 },
      { name: "Global Logistics", email: "info@globallog.com", daysAgo: 4 },
      { name: "Smart Systems Inc", email: "admin@smartsys.com", daysAgo: 2 },
      { name: "IoT Solutions Ltd", email: "support@iotsol.com", daysAgo: 1 },
    ];

    for (const data of orgData) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - data.daysAgo);

      const org = await Organization.create({
        name: data.name,
        email: data.email,
        status: "active",
        createdAt,
      });
      organizations.push(org);
      console.log(`Created organization: ${org.name}`);
    }

    // Create one network per organization
    const networks = [];
    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i];
      const createdAt = new Date(org.createdAt);
      createdAt.setHours(createdAt.getHours() + 2); // Network created 2 hours after org

      const network = await Network.create({
        name: `${org.name.split(" ")[0]} Main Network`,
        organizationId: org._id,
        status: i === 3 ? "degraded" : "online", // One degraded network
        createdAt,
      });
      networks.push(network);
      console.log(`Created network: ${network.name}`);
    }

    // Create some threats
    const threatTypes = [
      { type: "Rogue AP Detected", severity: "critical" },
      { type: "ARP Spoofing", severity: "high" },
      { type: "Unauthorized Access Attempt", severity: "medium" },
      { type: "DNS Spoofing", severity: "high" },
      { type: "MITM Attack Detected", severity: "critical" },
    ];

    // Add threats to some organizations
    const threatsToCreate = [
      { orgIndex: 1, netIndex: 1, threatIndex: 0, daysAgo: 0 }, // Tech Industries - Critical
      { orgIndex: 2, netIndex: 2, threatIndex: 1, daysAgo: 1 }, // Global Logistics - High
      { orgIndex: 2, netIndex: 2, threatIndex: 2, daysAgo: 2 }, // Global Logistics - Medium
    ];

    for (const t of threatsToCreate) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - t.daysAgo);

      await Threat.create({
        type: threatTypes[t.threatIndex].type,
        severity: threatTypes[t.threatIndex].severity,
        organizationId: organizations[t.orgIndex]._id,
        networkId: networks[t.netIndex]._id,
        status: "active",
        description: `Detected on ${networks[t.netIndex].name}`,
        createdAt,
      });
      console.log(`Created threat: ${threatTypes[t.threatIndex].type}`);
    }

    console.log("\n✅ Seed completed successfully!");
    console.log(`   - ${organizations.length} organizations`);
    console.log(`   - ${networks.length} networks`);
    console.log(`   - ${threatsToCreate.length} threats`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedData();
