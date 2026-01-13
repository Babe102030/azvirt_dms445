
import { db, createMaterial, createDelivery, createQualityTest, getMaterials, getDeliveries, getQualityTests } from './server/db';
import * as schema from './drizzle/schema';

async function testBackend() {
    console.log('--- Testing Backend Creation ---');

    try {
        // 1. Test Material Creation
        console.log('Testing Material Creation...');
        const materialId = await createMaterial({
            name: 'Test Cement ' + Date.now(),
            category: 'cement',
            unit: 'kg',
            quantity: 1000,
            minStock: 100,
            criticalThreshold: 50,
        });
        console.log('Material created with ID:', materialId);

        // 2. Test Delivery Creation
        console.log('Testing Delivery Creation...');
        const deliveryId = await createDelivery({
            projectId: 1, // Assuming project 1 exists or schema allows null
            projectName: 'Test Project',
            concreteType: 'C25/30',
            volume: 10.5,
            scheduledTime: new Date(),
            status: 'scheduled',
            driverName: 'Test Driver',
            vehicleNumber: 'TRUCK-001',
        });
        console.log('Delivery created with ID:', deliveryId);

        // 3. Test Quality Test Creation
        console.log('Testing Quality Test Creation...');
        const testId = await createQualityTest({
            deliveryId: deliveryId,
            testName: 'Slump Test',
            testType: 'slump',
            result: '180mm',
            status: 'pass',
            testedBy: 'Test Inspector',
        });
        console.log('Quality Test created with ID:', testId);

        console.log('--- Verification ---');
        const materials = await getMaterials();
        console.log('Materials count:', materials.length);

        const deliveries = await getDeliveries();
        console.log('Deliveries count:', deliveries.length);

        const qualityTests = await getQualityTests();
        console.log('Quality Tests count:', qualityTests.length);

        console.log('All tests passed!');
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        process.exit();
    }
}

testBackend();
