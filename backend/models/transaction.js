const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    hash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    blockNumber: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
    from: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: String,
      default: "0",
    },
    gas: {
      type: String,
    },
    gasPrice: {
      type: String,
    },
    gasUsed: {
      type: String,
    },
    input: {
      type: String,
    },
    isError: {
      type: Boolean,
      default: false,
    },
    methodId: {
      type: String,
      trim: true,
    },
    functionName: {
      type: String,
      trim: true,
    },
    anomalyScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    anomalyType: {
      type: String,
      enum: [
        "none",
        "large_value",
        "unusual_pattern",
        "high_frequency",
        "suspicious_contract",
        "other",
      ],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ from: 1, timestamp: -1 });
transactionSchema.index({ to: 1, timestamp: -1 });
transactionSchema.index({ blockNumber: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
