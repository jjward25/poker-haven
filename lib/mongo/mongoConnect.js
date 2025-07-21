//lib/mongo/mongoConnect.js
import { MongoClient } from 'mongodb';

// Ensure the MongoDB URI is defined
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  try {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection error');
  }
}
clientPromise = global._mongoClientPromise;

export default clientPromise; 