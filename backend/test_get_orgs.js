import mongoose from "mongoose";
import Organization from "./src/models/Organization.js";
import Network from "./src/models/Network.js";
import Threat from "./src/models/Threat.js";
import Device from "./src/models/Device.js";
import dotenv from "dotenv";

dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const organizations = await Organization.find().sort({ createdAt: -1 });

    const orgsWithMetrics = await Promise.all(
      organizations.map(async (org) => {
        const network = await Network.findOne({ organizationId: org._id });
        const threatCount = await Threat.countDocuments({
          organizationId: org._id,
          status: "active",
        });

        const deviceCount = await Device.countDocuments({ organizationId: org._id });

        return {
          id: org._id,
          name: org.name,
          email: org.email,
          status: org.status,
          network: network
            ? { id: network._id, name: network.name, status: network.status }
            : null,
          devices: deviceCount,
          threats: threatCount,
          joinedDate: org.createdAt,
        };
      })
    );

    console.log(orgsWithMetrics);
  } catch (error) {
    console.error("ERROR CAUGHT:");
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
};

test();
