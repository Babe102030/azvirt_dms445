import driver, { getSession, recordToNative } from '../db/neo4j';

const recordToObj = recordToNative;

/**
 * Get all pending timesheets for approval by a manager
 */
export async function getPendingTimesheets(approverId: number) {
  const session = getSession();
  try {
    // Assuming approverId is stored on the approval request or we filter by something else
    // If timesheetApprovals has approverId property:
    const query = `
      MATCH (ta:TimesheetApproval {status: 'pending'})
      WHERE ta.approverId = $approverId OR ta.approverId IS NULL
      MATCH (ta)<-[:HAS_APPROVAL_REQUEST]-(s:Shift)
      MATCH (u:User)-[:HAS_SHIFT]->(s)
      RETURN ta, s, u
    `;

    // Note: Drizzle code joined workHours (shifts?) and users.
    // Here we return checks.

    const result = await session.run(query, { approverId });
    return result.records.map(r => {
      const approval = recordToObj(r, 'ta');
      const shift = recordToObj(r, 's');
      const user = recordToObj(r, 'u');

      return {
        id: shift.id, // Drizzle return structure mapped workHours.id to id
        employeeId: user.id,
        employeeName: user.name,
        date: shift.startTime, // mapping shift start to date
        hoursWorked: shift.duration, // mapping duration
        status: shift.status,
        notes: shift.notes, // assuming notes on shift
        approvalStatus: approval.status,
        approvalId: approval.id
      };
    });
  } catch (error) {
    console.error("Failed to get pending timesheets:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get all timesheets for an employee
 */
export async function getEmployeeTimesheets(employeeId: number) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      OPTIONAL MATCH (s)-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      RETURN s, ta
      ORDER BY s.startTime DESC
    `;

    const result = await session.run(query, { employeeId });
    return result.records.map(r => {
      const shift = recordToObj(r, 's');
      const approval = recordToObj(r, 'ta');

      return {
        id: shift.id,
        date: shift.startTime,
        hoursWorked: shift.duration,
        status: shift.status,
        notes: shift.notes,
        approvalStatus: approval ? approval.status : null,
        approvalComments: approval ? approval.comments : null,
        rejectionReason: approval ? approval.rejectionReason : null
      };
    });
  } catch (error) {
    console.error("Failed to get employee timesheets:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Approve a timesheet
 */
export async function approveTimesheet(
  timesheetId: number,
  approverId: number,
  comments?: string
) {
  const session = getSession();
  try {
    // timesheetId in Drizzle was likely Shift ID or WorkHour ID.
    // In db.ts I assumed Shift ID was linked to Approval.
    // Drizzle usage: eq(timesheetApprovals.timesheetId, timesheetId)

    const query = `
      MATCH (s:Shift {id: $timesheetId})-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      MATCH (u:User {id: $approverId})
      SET ta.status = 'approved', 
          ta.approvedBy = $approverId, 
          ta.approvedAt = datetime(), 
          ta.comments = $comments
      SET s.status = 'approved'
      MERGE (ta)-[:APPROVED_BY]->(u)
    `;

    await session.run(query, { timesheetId, approverId, comments: comments || null });

    return { success: true, message: "Timesheet approved" };
  } catch (error) {
    console.error("Failed to approve timesheet:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}

/**
 * Reject a timesheet
 */
export async function rejectTimesheet(
  timesheetId: number,
  approverId: number,
  rejectionReason: string
) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $timesheetId})-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      MATCH (u:User {id: $approverId})
      SET ta.status = 'rejected', 
          ta.rejectedBy = $approverId, 
          ta.rejectedAt = datetime(), 
          ta.rejectionReason = $rejectionReason
      SET s.status = 'rejected'
      MERGE (ta)-[:REJECTED_BY]->(u)
    `;

    await session.run(query, { timesheetId, approverId, rejectionReason });

    return { success: true, message: "Timesheet rejected" };
  } catch (error) {
    console.error("Failed to reject timesheet:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}

/**
 * Create approval record for a new timesheet
 */
export async function createTimesheetApproval(
  timesheetId: number,
  approverId: number
) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $timesheetId})
      CREATE (ta:TimesheetApproval {
        id: toInteger(timestamp()),
        timesheetId: $timesheetId,
        approverId: $approverId,
        status: 'pending',
        createdAt: datetime()
      })
      MERGE (s)-[:HAS_APPROVAL_REQUEST]->(ta)
      RETURN ta.id as id
    `;

    const result = await session.run(query, { timesheetId, approverId });
    // Drizzle returns result object, typically insertId. 
    // We return similar structure if needed or just result.
    // The Drizzle code returned 'result' which is [ResultSetHeader].
    // Returning object with insertId matches typical expectation.
    return { insertId: result.records[0]?.get('id').toNumber() };
  } catch (error) {
    console.error("Failed to create timesheet approval:", error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Get approval details for a timesheet
 */
export async function getTimesheetApprovalDetails(timesheetId: number) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $timesheetId})-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      OPTIONAL MATCH (ta)-[:APPROVED_BY]->(approver:User)
      RETURN ta, approver
    `;

    const result = await session.run(query, { timesheetId });
    if (result.records.length === 0) return null;

    const record = result.records[0];
    const ta = recordToObj(record, 'ta');
    const approver = recordToObj(record, 'approver');

    return {
      id: ta.id,
      status: ta.status,
      comments: ta.comments,
      rejectionReason: ta.rejectionReason,
      approvedAt: ta.approvedAt, // Note: Neo4j datetime needs conversion if consuming code expects Date
      approverName: approver ? approver.name : null,
      approverEmail: approver ? approver.email : null
    };
  } catch (error) {
    console.error("Failed to get approval details:", error);
    return null;
  } finally {
    await session.close();
  }
}
