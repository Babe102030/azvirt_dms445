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

        // 4. Projects
        console.log('Migrating Projects...');
        const projRes = await client.execute("SELECT * FROM projects");
        for (const row of projRes.rows) {
            await session.run(`
                MERGE (p:Project {id: toString($id)})
                SET p.name = $name,
                    p.description = $description,
                    p.status = $status,
                    p.startDate = datetime($startDate),
                    p.endDate = datetime($endDate),
                    p.location = $location,
                    p.createdAt = $createdAt
             `, {
                id: row.id,
                name: row.name,
                description: row.description || '',
                status: row.status,
                startDate: row.startDate ? new Date(row.startDate as string).toISOString() : null,
                endDate: row.endDate ? new Date(row.endDate as string).toISOString() : null,
                location: row.location || '',
                createdAt: row.createdAt
            });

            if (row.createdById) {
                await session.run(`
                    MATCH (u:User {id: toString($uid)}), (p:Project {id: toString($pid)})
                    MERGE (u)-[:CREATED]->(p)
                 `, { uid: row.createdById, pid: row.id });
            }
        }
        console.log(`✅ Migrated ${projRes.rows.length} projects`);

        // 5. Deliveries
        console.log('Migrating Deliveries...');
        const delRes = await client.execute("SELECT * FROM deliveries");
        for (const row of delRes.rows) {
            await session.run(`
                MERGE (d:Delivery {id: toString($id)})
                SET d.concreteType = $concreteType,
                    d.volume = toInteger($volume),
                    d.scheduledTime = datetime($scheduledTime),
                    d.status = $status,
                    d.projectName = $projectName,
                    d.location = $location,
                    d.createdAt = $createdAt
            `, {
                id: row.id,
                concreteType: row.concreteType || '',
                volume: row.volume || 0,
                scheduledTime: row.scheduledTime ? new Date(row.scheduledTime as string).toISOString() : null,
                status: row.status,
                projectName: row.projectName || '',
                location: row.deliveryLocation || '',
                createdAt: row.createdAt
            });

            if (row.projectId) {
                await session.run(`
                    MATCH (p:Project {id: toString($pid)}), (d:Delivery {id: toString($did)})
                    MERGE (d)-[:DELIVERED_TO]->(p)
                `, { pid: row.projectId, did: row.id });
            }
        }
        console.log(`✅ Migrated ${delRes.rows.length} deliveries`);

        // 6. Employees (ensure User nodes exist and have role)
        // Check if employees table has extra info not in users
        // For now assuming 1:1 map with users table, but let's migrate any specific employee fields if needed.
        // Skipping specific 'employees' table migration if it just links to users, relying on Users migration.

        // 7. Shifts
        console.log('Migrating Shifts...');
        const shiftRes = await client.execute("SELECT * FROM shifts");
        for (const row of shiftRes.rows) {
            await session.run(`
                MERGE (s:Shift {id: toString($id)})
                SET s.startTime = datetime($startTime),
                    s.endTime = datetime($endTime),
                    s.status = $status,
                    s.type = $shiftType,
                    s.notes = $notes,
                    s.createdAt = $createdAt
            `, {
                id: row.id,
                startTime: row.startTime ? new Date(row.startTime as string).toISOString() : null,
                endTime: row.endTime ? new Date(row.endTime as string).toISOString() : null,
                status: row.status || 'scheduled',
                shiftType: row.shiftType || 'regular',
                notes: row.notes || '',
                createdAt: row.createdAt
            });

            if (row.employeeId) {
                await session.run(`
                    MATCH (u:User {id: toString($uid)}), (s:Shift {id: toString($sid)})
                    MERGE (u)-[:HAS_SHIFT]->(s)
                `, { uid: row.employeeId, sid: row.id });
            }
        }
        console.log(`✅ Migrated ${shiftRes.rows.length} shifts`);

        // 8. Recipes
        console.log('Migrating Recipes...');
        const recipeRes = await client.execute("SELECT * FROM concrete_recipes");
        for (const row of recipeRes.rows) {
            await session.run(`
                MERGE (r:ConcreteRecipe {id: toString($id)})
                SET r.name = $name,
                    r.description = $description,
                    r.targetStrength = $targetStrength,
                    r.wcr = toFloat($wcr),
                    r.createdAt = $createdAt
            `, {
                id: row.id,
                name: row.name,
                description: row.description || '',
                targetStrength: row.targetStrength || '',
                wcr: row.waterCeamentRatio || 0,
                createdAt: row.createdAt
            });
        }
        // Recipe Ingredients
        const ingRes = await client.execute("SELECT * FROM recipe_ingredients");
        for (const row of ingRes.rows) {
            await session.run(`
                MATCH (r:ConcreteRecipe {id: toString($rid)}), (m:Material {id: toString($mid)})
                MERGE (r)-[req:REQUIRES]->(m)
                SET req.quantity = toFloat($quantity),
                    req.unit = $unit
            `, {
                rid: row.recipeId,
                mid: row.materialId,
                quantity: row.quantity,
                unit: row.unit || 'kg'
            });
        }
        console.log(`✅ Migrated ${recipeRes.rows.length} recipes`);

        // 9. Mixing Logs
        console.log('Migrating Mixing Logs...');
        const mixRes = await client.execute("SELECT * FROM mixing_logs");
        for (const row of mixRes.rows) {
            await session.run(`
                MERGE (m:MixingLog {id: toString($id)})
                SET m.batchNumber = $batchNumber,
                    m.volume = toFloat($volume),
                    m.status = $status,
                    m.startTime = datetime($startTime),
                    m.endTime = datetime($endTime),
                    m.createdAt = $createdAt
            `, {
                id: row.id,
                batchNumber: row.batchNumber,
                volume: row.volume || 0,
                status: row.status,
                startTime: row.startTime ? new Date(row.startTime as string).toISOString() : null,
                endTime: row.endTime ? new Date(row.endTime as string).toISOString() : null,
                createdAt: row.createdAt
            });

            if (row.recipeId) {
                await session.run(`
                    MATCH (m:MixingLog {id: toString($mid)}), (r:ConcreteRecipe {id: toString($rid)})
                    MERGE (m)-[:BASED_ON]->(r)
                `, { mid: row.id, rid: row.recipeId });
            }
        }
        console.log(`✅ Migrated ${mixRes.rows.length} mixing logs`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

migrate();
