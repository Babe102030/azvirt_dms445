import { getSession, closeDriver } from '../server/db/neo4j';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    console.log('Testing Neo4j connection...');
    console.log(`URI: ${process.env.NEO4J_URI}`);
    console.log(`User: ${process.env.NEO4J_USER}`);

    const session = getSession();
    try {
        const result = await session.run('RETURN 1 as n');
        const singleRecord = result.records[0];
        const n = singleRecord.get('n');

        if (n.toNumber() === 1) {
            console.log('✅ Connection successful!');
        } else {
            console.error('❌ Connection test returned unexpected result.');
        }
    } catch (error) {
        console.error('❌ Connection failed:', error);
    } finally {
        await session.close();
        await closeDriver();
    }
}

testConnection();
