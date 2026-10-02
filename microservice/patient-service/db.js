const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://admin:devpassword@localhost:27017/cims_patients?authSource=admin';

let client;
let db;

async function connectDB() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  return db;
}

async function getCollection(name) {
  const database = await connectDB();
  return database.collection(name);
}

async function closeDB() {
  if (client) await client.close();
}

module.exports = { connectDB, getCollection, closeDB };