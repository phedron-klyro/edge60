import mongoose from "mongoose";

const settlementInfoSchema = new mongoose.Schema({
  status: { type: String, required: true },
  txHash: { type: String },
  blockNumber: { type: Number },
  grossAmount: { type: String },
  rake: { type: String },
  netPayout: { type: String },
  error: { type: String },
  explorerUrl: { type: String },
}, { _id: false });

const matchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  playerA: { type: String, required: true, index: true },
  playerB: { type: String, index: true },
  stake: { type: Number, required: true },
  status: { type: String, required: true, index: true },
  startTime: { type: Number },
  endTime: { type: Number },
  duration: { type: Number, default: 60 },
  winner: { type: String },
  predictionA: { type: String },
  predictionB: { type: String },
  asset: { type: String, required: true },
  startPrice: { type: Number },
  endPrice: { type: Number },
  settlement: { type: settlementInfoSchema },
}, {
  timestamps: true,
});

export const MatchModel = mongoose.model("Match", matchSchema);
