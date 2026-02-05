import mongoose from "mongoose";

/**
 * MongoDB Connection Handler
 */
export async function connectDatabase() {
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/edge60";

  try {
    mongoose.connection.on("connected", () => {
      console.log("[Database] Connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("[Database] MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("[Database] Disconnected from MongoDB");
    });

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
    });
  } catch (error) {
    console.error("[Database] Failed to connect to MongoDB:", error);
    // Continue running anyway, but DB operations will fail
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
