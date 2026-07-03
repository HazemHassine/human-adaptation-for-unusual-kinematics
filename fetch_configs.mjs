import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://hazemhassine:iGwfceTk84jRTNIg@srmcluster.4mtoyv9.mongodb.net/?appName=srmcluster";

async function getConfigs() {
  await mongoose.connect(MONGODB_URI);
  const configs = await mongoose.connection.collection("configs").find({}).toArray();
  console.log(JSON.stringify(configs, null, 2));
  await mongoose.disconnect();
}

getConfigs().catch(console.error);
