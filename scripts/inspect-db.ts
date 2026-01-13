import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
    console.log('Inspecting DB at', process.env.DATABASE_URL);
    const client = createClient({
        url: process.env.DATABASE_URL!
    });

    try {
        const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('Tables:', res.rows.map(r => r.name));
    } catch (e) {
        console.error(e);
    }
}

inspect();
