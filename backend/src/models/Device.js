import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    macAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "Unknown Device",
    },
    status: {
      type: String,
      enum: ["online", "offline", "pending"],
      default: "pending",
    },
    lastSeen: {
      type: Date,
      default: null,
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
      enum: ["standalone", "root", "node", "leaf", "coordinator", "router", "end_device"],
      default: "standalone",
    },
    rssi: {
      type: Number,
      default: null,
    },
    parentMac: {
      type: String,
      required: false,
      default: null,
      sparse: true,
    },
    connectionType: { 
      type: String, 
      enum: ['direct', 'mesh'], 
      default: 'direct'
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },

    deviceId: { type: String, unique: true, sparse: true },
    sharedSecret: { 
      type: String, 
      required: false,
      default: null 
    },
    hashedId: { 
      type: String, 
      required: false,
      default: null 
    },
    serverPublicKey: { 
      type: String, 
      required: false,
      default: null 
    },
    serverPrivateKey: { 
      type: String, 
      required: false,
      default: null 
    },
    devicePublicKey: { 
      type: String, 
      required: false,
      default: null 
    },
    provisioned: { 
      type: Boolean, 
      default: false
    },
    provisioningToken: { 
      type: String, 
      required: false,
      default: null 
    },
    provisioningTokenExpiry: { 
      type: Date, 
      required: false, 
      default: null 
    }
  },
  { timestamps: true }
);

deviceSchema.index({ organizationId: 1, connectionType: 1 });
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ macAddress: 1 });

deviceSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (update && (update.status === 'offline' || (update.$set && update.$set.status === 'offline'))) {
    console.log('[Device][DIAG] STATUS SET TO OFFLINE via findOneAndUpdate — stack:');
    console.trace();
  }
});

deviceSchema.pre('save', function () {
  if (this.isModified('status') && this.status === 'offline') {
    console.log('[Device][DIAG] STATUS SAVED AS OFFLINE via save() — stack:');
    console.trace();
  }
});

const Device = mongoose.model("Device", deviceSchema);

export default Device;
