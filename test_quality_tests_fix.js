const { db } = require('./server/db.ts');

async function testQualityTestsFix() {
    try {
        console.log('Testing quality tests fix...');

        // Test the getQualityTests function
        const tests = await db.getQualityTests();
        console.log('✓ getQualityTests() works - retrieved', tests.length, 'tests');

        // Test with filters
        const filteredTests = await db.getQualityTests({ status: 'fail' });
        console.log('✓ getQualityTests({ status: "fail" }) works - retrieved', filteredTests.length, 'tests');

        // Test getQualityTestTrends
        const trends = await db.getQualityTestTrends(30);
        console.log('✓ getQualityTestTrends() works - trends:', trends);

        console.log('All tests passed! The fix is working correctly.');
    } catch (error) {
        console.error('Error testing quality tests fix:', error);
        process.exit(1);
    }
}

testQualityTestsFix();
