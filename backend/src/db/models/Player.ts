import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, index: true },
  ensName: { type: String, default: null },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  duelsPlayed: { type: Number, default: 0 },
  totalVolume: { type: Number, default: 0 }, // Total USDC wagered
  lastSeen: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Calculate win rate virtual
playerSchema.virtual("winRate").get(function() {
  if (this.duelsPlayed === 0) return 0;
  return (this.wins / this.duelsPlayed) * 100;
});

// Ensure virtuals are included in toObject and toJSON
playerSchema.set("toObject", { virtuals: true });
playerSchema.set("toJSON", { virtuals: true });

export const PlayerModel = mongoose.model("Player", playerSchema);
