
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        if (!uri) throw new Error("Please add your Mongo URI to .env.local");
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise!;
} else {
    if (uri) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    } else {
        // Fallback for build time where uri might be missing
        clientPromise = Promise.reject(new Error("MONGODB_URI is missing"));
    }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
    const client = await clientPromise;
    const db = client.db();
    return { client, db };
}
