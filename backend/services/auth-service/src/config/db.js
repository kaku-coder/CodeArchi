import mongoose from "mongoose";

export default async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be set in the auth-service .env file.");
  }

  await mongoose.connect(uri);
  console.log("Auth service connected to MongoDB.");
}