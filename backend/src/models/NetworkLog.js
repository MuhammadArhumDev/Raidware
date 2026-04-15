import mongoose from 'mongoose';

const networkLogSchema = new mongoose.Schema({
  orgId: {
    type: String,
    required: true,
    index: true
  },
  macAddress: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    default: 'Unknown'
  },
  srcIp: {
    type: String,
    default: '0.0.0.0'
  },
  dstIp: {
    type: String,
    default: '0.0.0.0'
  },
  protocol: {
    type: String,
    default: 'TCP'
  },
  srcPort: {
    type: Number,
    default: 0
  },
  dstPort: {
    type: Number,
    default: 0
  },
  flowDuration: {
    type: Number,
    default: 0
  },
  packetCount: {
    type: Number,
    default: 0
  },
  byteCount: {
    type: Number,
    default: 0
  },
  features: {
    type: [Number],
    default: []
  },
  prediction: {
    type: String,
    default: 'BENIGN'
  },
  confidence: {
    type: Number,
    default: 0
  },
  action: {
    type: String,
    enum: ['ALLOW', 'FLAG', 'BLOCK'],
    default: 'ALLOW'
  },
  rawFeatures: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for fast dashboard queries
networkLogSchema.index({ orgId: 1, timestamp: -1 });

// TTL index to expire logs after 7 days (604800 seconds)
networkLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model('NetworkLog', networkLogSchema);
