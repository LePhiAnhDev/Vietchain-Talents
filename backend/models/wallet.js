const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    balance: {
      type: String,
      default: "0",
    },
    firstSeen: {
      type: Date,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isContract: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lastAnalyzed: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wallet", walletSchema);
