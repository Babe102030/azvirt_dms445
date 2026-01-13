
import 'dotenv/config';
import { db, upsertUser, createMaterial } from './server/db.js';
import * as schema from './drizzle/schema.js';

async function testConnection() {
    console.log('Testing DB connectivity...');
    try {
        const testUser = {
            openId: 'test_id_' + Date.now(),
            name: 'Test User',
            email: 'test@example.com',
            loginMethod: 'test',
        };

        console.log('Testing upsertUser...');
        await upsertUser(testUser);
        console.log('upsertUser success!');

        console.log('Testing createMaterial...');
        const id = await createMaterial({
            name: 'Test Material ' + Date.now(),
            category: 'other',
            unit: 'kg',
            quantity: 10,
        });
        console.log('createMaterial success, ID:', id);

    } catch (err: any) {
        console.error('DB Operation Failed:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        process.exit();
    }
}

testConnection();
