import mongoose from "mongoose";

const threatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    networkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Network",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Threat = mongoose.model("Threat", threatSchema);
export default Threat;
