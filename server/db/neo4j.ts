import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.NEO4J_URI || 'neo4j+s://placeholder.databases.neo4j.io';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || '';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export const getSession = () => {
    return driver.session();
};

export const closeDriver = async () => {
    await driver.close();
};

// Recursive function to convert Neo4j types to native JS types
export const toNativeTypes = (v: any): any => {
    if (v === null || v === undefined) return v;

    if (neo4j.isInt(v)) {
        return v.toNumber();
    }

    // Check for Temporal types (Date, DateTime, etc.) which usually have a toString method and specific properties
    if (
        (neo4j.isDate(v) ||
            neo4j.isDateTime(v) ||
            neo4j.isLocalDateTime(v) ||
            neo4j.isTime(v) ||
            neo4j.isLocalTime(v) ||
            neo4j.isDuration(v))
    ) {
        return v.toString();
    }

    if (Array.isArray(v)) {
        return v.map(toNativeTypes);
    }

    if (typeof v === 'object') {
        // If it's a Neo4j Node or Relationship
        if (v.properties) {
            const obj: any = {};
            // Include id if it's a Node (Neo4j internal ID is usually 'identity', but we store our 'id' in properties)
            // However, our app uses 'id' property.
            // We'll just return properties converted.
            for (const key in v.properties) {
                obj[key] = toNativeTypes(v.properties[key]);
            }
            return obj;
        }

        // Plain object
        const obj: any = {};
        for (const key in v) {
            obj[key] = toNativeTypes(v[key]);
        }
        return obj;
    }

    return v;
};

// Helper to extract a Node/Relationship/Map from a Record and convert to native
export const recordToNative = (record: any, key: string = 'n') => {
    if (!record || !record.has(key)) return null;
    const item = record.get(key);
    return toNativeTypes(item);
};

export default driver;
