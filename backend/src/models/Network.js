import mongoose from "mongoose";

const networkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    status: {
      type: String,
      enum: ["online", "offline", "degraded"],
      default: "online",
    },
  },
  { timestamps: true }
);

const Network = mongoose.model("Network", networkSchema);
export default Network;
