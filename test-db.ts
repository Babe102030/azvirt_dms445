import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function testTables() {
    try {
        console.log('Testing database connection and tables...');

        // Test if deliveries table exists by trying to select from it
        const deliveriesResult = await db.execute(sql`SELECT 1 FROM deliveries LIMIT 1`);
        console.log('✓ deliveries table exists');

        // Test if quality_tests table exists
        const qualityTestsResult = await db.execute(sql`SELECT 1 FROM quality_tests LIMIT 1`);
        console.log('✓ quality_tests table exists');

        console.log('All required tables exist!');
    } catch (error) {
        console.error('Database test failed:', error);
    } finally {
        process.exit(0);
    }
}

testTables();
