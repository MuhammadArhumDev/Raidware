import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    macAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // The secure hashed ID (derived from eFuse) provided during registration
    hashedId: {
      type: String,
      required: true,
      unique: true,
    },
    // Shared secret for HMAC challenge-response
    sharedSecret: {
      type: String,
      required: true,
      select: false, // Do not return by default
    },
    name: {
      type: String,
      default: "Unknown Device",
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Device = mongoose.model("Device", deviceSchema);

export default Device;
