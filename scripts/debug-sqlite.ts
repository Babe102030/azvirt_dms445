import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
    const client = createClient({
        url: process.env.DATABASE_URL
    });

    try {
        const docColumns = await client.execute("PRAGMA table_info(documents)");
        console.log('Document Columns:', docColumns.rows.map(r => r.name));

        const matColumns = await client.execute("PRAGMA table_info(materials)");
        console.log('Material Columns:', matColumns.rows.map(r => r.name));

    } catch (e) {
        console.error(e);
    }
}

debug();
