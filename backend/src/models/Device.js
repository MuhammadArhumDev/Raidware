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
    // ── New fields for multi-tenant mesh support ──
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    firmwareVersion: {
      type: String,
      default: "1.0.0",
    },
    meshRole: {
      type: String,
      enum: ["root", "node", "leaf"],
      default: "node",
    },
    rssi: {
      type: Number,
      default: null,
    },
    parentMac: {
      type: String,
      default: null, // MAC of parent node in mesh — null if root
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

const Device = mongoose.model("Device", deviceSchema);

export default Device;
