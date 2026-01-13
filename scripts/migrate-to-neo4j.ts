import { getDb } from '../server/db';
import {
    users, projects, documents,
    materials, deliveries, employees,
    machines, concreteBases, mixingLogs
} from '../drizzle/schema';
import driver from '../server/db/neo4j';
import * as schema from '../drizzle/schema';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    console.log('🚀 Starting migration check...');

    const db = await getDb();
    if (!db) {
        console.error('❌ Failed to connect to SQLite source database');
        process.exit(1);
    }

    const session = driver.session();

    try {
        // 1. Users
        console.log('Migrating Users...');
        const allUsers = await db.select().from(users);
        for (const user of allUsers) {
            await session.run(`
        MERGE (u:User {id: $id})
        SET u.name = $name,
            u.email = $email,
            u.openId = $openId,
            u.role = $role,
            u.phoneNumber = $phoneNumber
      `, {
                id: user.id,
                name: user.name || '',
                email: user.email || '',
                openId: user.openId,
                role: user.role,
                phoneNumber: user.phoneNumber || ''
            });
        }
        console.log(`✅ Migrated ${allUsers.length} users`);

        // 2. Projects
        console.log('Migrating Projects...');
        const allProjects = await db.select().from(projects);
        for (const project of allProjects) {
            await session.run(`
        MERGE (p:Project {id: $id})
        SET p.name = $name,
            p.description = $description,
            p.status = $status,
            p.location = $location,
            p.startDate = $startDate,
            p.endDate = $endDate
      `, {
                id: project.id,
                name: project.name,
                description: project.description || '',
                status: project.status,
                location: project.location || '',
                startDate: project.startDate ? project.startDate.toISOString() : null,
                endDate: project.endDate ? project.endDate.toISOString() : null
            });

            // User -> Project (Created By)
            await session.run(`
        MATCH (u:User {id: $createdBy}), (p:Project {id: $projectId})
        MERGE (u)-[:CREATED]->(p)
      `, {
                createdBy: project.createdBy,
                projectId: project.id
            });
        }
        console.log(`✅ Migrated ${allProjects.length} projects`);

        // 3. Documents
        console.log('Migrating Documents...');
        const allDocs = await db.select().from(documents);
        for (const doc of allDocs) {
            await session.run(`
        MERGE (d:Document {id: $id})
        SET d.name = $name,
            d.fileUrl = $fileUrl,
            d.category = $category
      `, {
                id: doc.id,
                name: doc.name,
                fileUrl: doc.fileUrl,
                category: doc.category
            });

            // Project -> Document
            if (doc.projectId) {
                await session.run(`
          MATCH (p:Project {id: $projectId}), (d:Document {id: $docId})
          MERGE (p)-[:HAS_DOCUMENT]->(d)
        `, {
                    projectId: doc.projectId,
                    docId: doc.id
                });
            }

            // User -> Document (Uploaded By)
            await session.run(`
        MATCH (u:User {id: $uploadedBy}), (d:Document {id: $docId})
        MERGE (u)-[:UPLOADED]->(d)
      `, {
                uploadedBy: doc.uploadedBy,
                docId: doc.id
            });
        }
        console.log(`✅ Migrated ${allDocs.length} documents`);

        // 4. Employees
        console.log('Migrating Employees...');
        const allEmployees = await db.select().from(employees);
        for (const emp of allEmployees) {
            await session.run(`
        MERGE (e:Employee {id: $id})
        SET e.firstName = $firstName,
            e.lastName = $lastName,
            e.position = $position,
            e.department = $department
      `, {
                id: emp.id,
                firstName: emp.firstName,
                lastName: emp.lastName,
                position: emp.position,
                department: emp.department
            });
        }
        console.log(`✅ Migrated ${allEmployees.length} employees`);

        // 5. Machines
        console.log('Migrating Machines...');
        const allMachines = await db.select().from(machines);
        for (const machine of allMachines) {
            await session.run(`
        MERGE (m:Machine {id: $id})
        SET m.name = $name,
            m.type = $type,
            m.status = $status,
            m.model = $model
      `, {
                id: machine.id,
                name: machine.name,
                type: machine.type,
                status: machine.status,
                model: machine.model || ''
            });
        }
        console.log(`✅ Migrated ${allMachines.length} machines`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

migrate();
