import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * ZKTeco Sync Function
 * 
 * Since ZKTeco uses a proprietary binary TCP protocol (port 4370) that requires
 * a native TCP socket connection, this function acts as a bridge:
 * 
 * 1. It receives attendance logs pushed via HTTP from a local bridge agent
 *    OR it fetches them if called with action="sync" from a configured webhook endpoint
 * 
 * The local bridge approach: A small script runs on the same network as the ZKTeco device
 * and POSTs attendance records to this function endpoint.
 * 
 * Payload format from bridge:
 * {
 *   action: "push_logs" | "sync" | "test",
 *   device_id: string,
 *   logs: [{ uid: string, user_id: string, timestamp: string, punch_type: 0|1|2|3|4 }]
 * }
 * punch_type: 0=check_in, 1=check_out, 4=overtime_in, 5=overtime_out
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { action, logs = [], device_id } = body;

    // For test/ping
    if (action === "test") {
      return Response.json({ success: true, message: "ZKTeco bridge connected", timestamp: new Date().toISOString() });
    }

    if (action !== "push_logs" && action !== "sync") {
      return Response.json({ error: "Invalid action. Use: push_logs, sync, or test" }, { status: 400 });
    }

    if (!logs || logs.length === 0) {
      return Response.json({ success: true, processed: 0, message: "No logs to process" });
    }

    // Fetch all employees to match by employee_number or zkteco_user_id
    const employees = await base44.asServiceRole.entities.Employee.list("-created_date", 500);
    const empMap = {};
    employees.forEach(emp => {
      if (emp.employee_number) empMap[String(emp.employee_number)] = emp;
      if (emp.zkteco_user_id) empMap[String(emp.zkteco_user_id)] = emp;
    });

    // Fetch existing attendance records for the relevant dates to avoid duplicates
    const dates = [...new Set(logs.map(l => l.timestamp?.split("T")[0] || l.timestamp?.substring(0, 10)))];
    const existingRecords = [];
    for (const date of dates.slice(0, 10)) {
      const recs = await base44.asServiceRole.entities.Attendance.filter({ date }, "-created_date", 200);
      existingRecords.push(...recs);
    }

    // Build lookup: employee_id+date => record
    const existingMap = {};
    existingRecords.forEach(r => {
      existingMap[`${r.employee_id}_${r.date}`] = r;
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const log of logs) {
      try {
        const userId = String(log.user_id || log.uid || "");
        const employee = empMap[userId];

        if (!employee) {
          skipped++;
          continue;
        }

        // Parse timestamp
        const ts = new Date(log.timestamp);
        const date = ts.toISOString().split("T")[0];
        const time = ts.toTimeString().substring(0, 5); // HH:MM

        // punch_type: 0=check_in, 1=check_out
        const isCheckIn = log.punch_type === 0 || log.punch_type === 4;
        const isCheckOut = log.punch_type === 1 || log.punch_type === 5;

        const key = `${employee.id}_${date}`;
        const existing = existingMap[key];

        if (existing) {
          // Update existing record
          const updates = { source: "zkteco", device_id: device_id || "unknown" };
          if (isCheckIn && !existing.check_in) {
            updates.check_in = time;
            updates.type = "حضور";
          }
          if (isCheckOut) {
            updates.check_out = time;
            // Calculate hours
            if (existing.check_in || updates.check_in) {
              const checkIn = updates.check_in || existing.check_in;
              const [inH, inM] = checkIn.split(":").map(Number);
              const [outH, outM] = time.split(":").map(Number);
              const hours = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 10) / 10;
              if (hours > 0) updates.hours = hours;
            }
          }

          if (Object.keys(updates).length > 2) {
            await base44.asServiceRole.entities.Attendance.update(existing.id, { ...existing, ...updates });
            existingMap[key] = { ...existing, ...updates };
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new record
          const newRecord = {
            employee_id: employee.id,
            employee_name: employee.name,
            date,
            type: isCheckIn ? "حضور" : "حضور",
            check_in: isCheckIn ? time : "",
            check_out: isCheckOut ? time : "",
            hours: 0,
            notes: `مزامنة تلقائية من جهاز البصمة ${device_id || ""}`.trim(),
            source: "zkteco",
            device_id: device_id || "unknown",
            subscription_id: employee.subscription_id || "",
          };

          const created_rec = await base44.asServiceRole.entities.Attendance.create(newRecord);
          existingMap[key] = created_rec;
          created++;
        }
      } catch (logErr) {
        errors.push({ log, error: logErr.message });
      }
    }

    return Response.json({
      success: true,
      processed: logs.length,
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});