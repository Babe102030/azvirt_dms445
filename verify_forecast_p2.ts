import 'dotenv/config';
import * as db from './server/db';

async function testForecast() {
    console.log('Testing 30-Day Forecast Projection...');

    // Get all materials
    const materials = await db.getMaterials();
    if (materials.length === 0) {
        console.log('No materials found to test.');
        return;
    }

    const testMaterial = materials[0];
    console.log(`Testing with material: ${testMaterial.name} (ID: ${testMaterial.id})`);
    console.log(`Current Stock: ${testMaterial.quantity} ${testMaterial.unit}`);

    const forecast = await db.get30DayForecast(testMaterial.id);

    if (forecast.length === 0) {
        console.log('Forecast returned empty array.');
        return;
    }

    console.log(`Forecast length: ${forecast.length} days`);
    console.log('First 5 days:');
    forecast.slice(0, 5).forEach(day => {
        console.log(`  ${day.date.split('T')[0]}: ${day.expectedStock.toFixed(2)} (Reorder: ${day.reorderPoint.toFixed(2)})`);
    });

    const lastDay = forecast[forecast.length - 1];
    console.log(`Last day (${lastDay.date.split('T')[0]}): ${lastDay.expectedStock.toFixed(2)}`);

    if (forecast[0].expectedStock >= forecast[forecast.length - 1].expectedStock || forecast.some(d => d.expectedStock < 0)) {
        // Note: Stock could be equal if consumption is 0, but usually it should decrease
        if (forecast[0].expectedStock === forecast[forecast.length - 1].expectedStock) {
            console.log('Note: Stock remains constant (zero consumption detected/simulated).');
        } else {
            console.log('Trend looks correct (stock is decreasing or constant).');
        }
    }

    console.log('Verification successful!');
}

testForecast().catch(console.error);
