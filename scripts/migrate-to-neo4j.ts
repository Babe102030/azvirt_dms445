import { createClient } from '@libsql/client';
import driver from '../server/db/neo4j';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    console.log('🚀 Starting migration...');

    const client = createClient({
        url: process.env.DATABASE_URL
    });

    const session = driver.session();

    try {
        // 1. Users
        console.log('Migrating Users...');
        const usersRes = await client.execute("SELECT * FROM users");
        for (const row of usersRes.rows) {
            // Use string IDs since source is TEXT
            await session.run(`
        MERGE (u:User {id: toString($id)})
        SET u.name = $name,
            u.email = $email,
            u.role = $role,
            u.phoneNumber = $phone,
            u.department = $department,
            u.isActive = $isActive,
            u.createdAt = $createdAt
      `, {
                id: row.id,
                name: row.name || '',
                email: row.email || '',
                role: row.role || 'user',
                phone: row.phone || '',
                department: row.department || '',
                isActive: row.isActive ? true : false,
                createdAt: row.createdAt
            });
        }
        console.log(`✅ Migrated ${usersRes.rows.length} users`);

        // 2. Documents
        console.log('Migrating Documents...');
        const docRes = await client.execute("SELECT * FROM documents");
        for (const row of docRes.rows) {
            await session.run(`
        MERGE (d:Document {id: toString($id)})
        SET d.name = $title,
            d.description = $description,
            d.fileUrl = $filePath,
            d.mimeType = $mimeType,
            d.fileSize = toInteger($fileSize),
            d.category = $documentType,
            d.createdAt = $createdAt
      `, {
                id: row.id,
                title: row.title || 'Untitled',
                description: row.description || '',
                filePath: row.filePath || '',
                mimeType: row.mimeType || '',
                fileSize: row.fileSize || 0,
                documentType: row.documentType || 'other',
                createdAt: row.createdAt
            });

            // User -> Document
            if (row.createdById) {
                await session.run(`
          MATCH (u:User {id: toString($userId)}), (d:Document {id: toString($docId)})
          MERGE (u)-[:UPLOADED]->(d)
        `, {
                    userId: row.createdById,
                    docId: row.id
                });
            }
        }
        console.log(`✅ Migrated ${docRes.rows.length} documents`);

        // 3. Materials
        console.log('Migrating Materials...');
        const matRes = await client.execute("SELECT * FROM materials");
        for (const row of matRes.rows) {
            await session.run(`
        MERGE (m:Material {id: toString($id)})
        SET m.name = $name,
            m.sku = $sku,
            m.category = $category,
            m.quantity = toInteger($currentQuantity),
            m.unit = $unitOfMeasure,
            m.unitPrice = toInteger($unitCost),
            m.minStock = toInteger($reorderPoint)
      `, {
                id: row.id,
                name: row.name,
                sku: row.sku || '',
                category: row.category || 'other',
                currentQuantity: row.currentQuantity || 0,
                unitOfMeasure: row.unitOfMeasure || '',
                unitCost: row.unitCost || 0,
                reorderPoint: row.reorderPoint || 0
            });
        }
        console.log(`✅ Migrated ${matRes.rows.length} materials`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

migrate();
