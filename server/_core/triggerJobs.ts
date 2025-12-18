/**
 * Trigger Evaluation Scheduled Jobs
 * 
 * Periodic jobs that check for events and execute triggers automatically
 */

import * as triggerEval from '../services/triggerEvaluation';
import * as db from '../db';

/**
 * Check all materials for low stock and critical stock levels
 * Runs every hour
 */
export async function checkAllMaterialStockLevels(): Promise<void> {
  try {
    console.log('[TriggerJobs] Checking all material stock levels...');
    
    const materials = await db.getMaterials();
    
    for (const material of materials) {
      // Check if stock is below minimum or critical threshold
      if (material.quantity < material.minStock || 
          (material.criticalThreshold && material.quantity < material.criticalThreshold)) {
        await triggerEval.checkStockLevelTriggers(material.id);
      }
    }
    
    console.log(`[TriggerJobs] Checked ${materials.length} materials for stock levels`);
  } catch (error) {
    console.error('[TriggerJobs] Error checking material stock levels:', error);
  }
}

/**
 * Check for overdue tasks for all users
 * Runs every day at 9 AM
 */
export async function checkAllOverdueTasks(): Promise<void> {
  try {
    console.log('[TriggerJobs] Checking for overdue tasks...');
    
    // Get all admin users (they manage tasks)
    const users = await db.getAdminUsersWithSMS();
    
    for (const user of users) {
      const overdueTasks = await db.getOverdueTasks(user.id);
      
      if (overdueTasks.length > 0) {
        await triggerEval.checkOverdueTaskTriggers(user.id);
      }
    }
    
    console.log(`[TriggerJobs] Checked overdue tasks for ${users.length} users`);
  } catch (error) {
    console.error('[TriggerJobs] Error checking overdue tasks:', error);
  }
}

/**
 * Check for delayed deliveries
 * Runs every 30 minutes
 */
export async function checkDelayedDeliveries(): Promise<void> {
  try {
    console.log('[TriggerJobs] Checking for delayed deliveries...');
    
    const deliveries = await db.getDeliveries();
    const now = Date.now();
    
    for (const delivery of deliveries) {
      // Check if delivery is delayed (scheduled time has passed but not completed)
      if (delivery.status !== 'completed' && delivery.status !== 'cancelled') {
        const scheduledTime = new Date(delivery.scheduledTime).getTime();
        
        if (now > scheduledTime) {
          await triggerEval.checkDeliveryStatusTriggers(delivery.id);
        }
      }
    }
    
    console.log(`[TriggerJobs] Checked ${deliveries.length} deliveries for delays`);
  } catch (error) {
    console.error('[TriggerJobs] Error checking delayed deliveries:', error);
  }
}

/**
 * Check for failed quality tests
 * Runs every 2 hours
 */
export async function checkFailedQualityTests(): Promise<void> {
  try {
    console.log('[TriggerJobs] Checking for failed quality tests...');
    
    const tests = await db.getQualityTests();
    
    for (const test of tests) {
      if (test.status === 'fail') {
        await triggerEval.checkQualityTestTriggers(test.id);
      }
    }
    
    console.log(`[TriggerJobs] Checked ${tests.length} quality tests`);
  } catch (error) {
    console.error('[TriggerJobs] Error checking failed quality tests:', error);
  }
}

/**
 * Initialize all trigger jobs
 * This should be called when the server starts
 */
export function initializeTriggerJobs(): void {
  console.log('[TriggerJobs] Initializing trigger evaluation jobs...');
  
  // Check material stock levels every hour
  setInterval(checkAllMaterialStockLevels, 60 * 60 * 1000);
  
  // Check overdue tasks every day at 9 AM
  // Calculate milliseconds until next 9 AM
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0);
  
  if (now.getHours() >= 9) {
    // If it's already past 9 AM today, schedule for tomorrow
    next9AM.setDate(next9AM.getDate() + 1);
  }
  
  const msUntil9AM = next9AM.getTime() - now.getTime();
  
  setTimeout(() => {
    checkAllOverdueTasks();
    // Then repeat every 24 hours
    setInterval(checkAllOverdueTasks, 24 * 60 * 60 * 1000);
  }, msUntil9AM);
  
  // Check delayed deliveries every 30 minutes
  setInterval(checkDelayedDeliveries, 30 * 60 * 1000);
  
  // Check failed quality tests every 2 hours
  setInterval(checkFailedQualityTests, 2 * 60 * 60 * 1000);
  
  // Run initial checks after 1 minute (give server time to fully start)
  setTimeout(() => {
    checkAllMaterialStockLevels();
    checkDelayedDeliveries();
    checkFailedQualityTests();
  }, 60 * 1000);
  
  console.log('[TriggerJobs] Trigger evaluation jobs initialized');
  console.log('  - Material stock levels: every hour');
  console.log('  - Overdue tasks: daily at 9 AM');
  console.log('  - Delayed deliveries: every 30 minutes');
  console.log('  - Failed quality tests: every 2 hours');
}
