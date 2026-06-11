import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * ZKTeco Sync Function
 *
 * Supports two modes:
 * 1. Direct ZK Protocol — connects to device via IP:4370 using TCP binary protocol (ZKLib via npm)
 * 2. Push (webhook/bridge) — receives logs pushed by a local bridge agent
 *
 * Actions:
 *   test         — ping the function
 *   push_logs    — receive logs from bridge/webhook
 *   sync         — receive logs (alias for push_logs)
 *   direct_sync  — connect directly to device via ZK Protocol (requires ip + port in body)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, logs = [], device_id, ip, port = 4370 } = body;

    // ── PING ──────────────────────────────────────────────────────────────────
    if (action === "test") {
      return Response.json({ success: true, message: "ZKTeco bridge connected", timestamp: new Date().toISOString() });
    }

    // ── DIRECT ZK PROTOCOL SYNC ───────────────────────────────────────────────
    if (action === "direct_sync") {
      if (!ip) return Response.json({ error: "يجب تحديد عنوان IP للجهاز" }, { status: 400 });

      let zkLogs = [];
      try {
        // Use zklib — a pure-JS ZKTeco protocol implementation
        const { ZKLib } = await import("npm:zklib@1.0.6");
        const zk = new ZKLib(ip, Number(port), 5200, 5000);

        await zk.createSocket();
        const { data: rawLogs } = await zk.getAttendances();
        await zk.disconnect();

        if (!rawLogs || rawLogs.length === 0) {
          return Response.json({ success: true, processed: 0, created: 0, updated: 0, skipped: 0, message: "لا توجد سجلات جديدة في الجهاز" });
        }

        // Normalize zklib log format → our format
        zkLogs = rawLogs.map(l => ({
          user_id: String(l.deviceUserId || l.uid || ""),
          timestamp: l.recordTime instanceof Date
            ? l.recordTime.toISOString()
            : new Date(l.recordTime).toISOString(),
          punch_type: l.type === 1 ? 1 : 0, // 0=in, 1=out
        }));

      } catch (zkErr) {
        return Response.json({ error: `فشل الاتصال بالجهاز (${ip}:${port}): ${zkErr.message}` }, { status: 502 });
      }

      return await processLogs(base44, zkLogs, device_id || ip);
    }

    // ── PUSH / WEBHOOK ────────────────────────────────────────────────────────
    if (action !== "push_logs" && action !== "sync") {
      return Response.json({ error: "Invalid action. Use: push_logs, sync, direct_sync, or test" }, { status: 400 });
    }

    if (!logs || logs.length === 0) {
      return Response.json({ success: true, processed: 0, message: "No logs to process" });
    }

    return await processLogs(base44, logs, device_id);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Shared log-processing logic ──────────────────────────────────────────────
async function processLogs(base44, logs, device_id) {
  const employees = await base44.asServiceRole.entities.Employee.list("-created_date", 500);
  const empMap = {};
  employees.forEach(emp => {
    if (emp.employee_number) empMap[String(emp.employee_number)] = emp;
    if (emp.zkteco_user_id) empMap[String(emp.zkteco_user_id)] = emp;
  });

  const dates = [...new Set(logs.map(l => (l.timestamp || "").split("T")[0]).filter(Boolean))];
  const existingRecords = [];
  for (const date of dates.slice(0, 30)) {
    const recs = await base44.asServiceRole.entities.Attendance.filter({ date }, "-created_date", 500);
    existingRecords.push(...recs);
  }

  const existingMap = {};
  existingRecords.forEach(r => { existingMap[`${r.employee_id}_${r.date}`] = r; });

  let created = 0, updated = 0, skipped = 0;
  const errors = [];

  for (const log of logs) {
    try {
      const userId = String(log.user_id || log.uid || "");
      const employee = empMap[userId];
      if (!employee) { skipped++; continue; }

      const ts = new Date(log.timestamp);
      const date = ts.toISOString().split("T")[0];
      const time = ts.toTimeString().substring(0, 5);
      const isCheckIn  = log.punch_type === 0 || log.punch_type === 4;
      const isCheckOut = log.punch_type === 1 || log.punch_type === 5;

      const key = `${employee.id}_${date}`;
      const existing = existingMap[key];

      if (existing) {
        const updates = { source: "zkteco", device_id: device_id || "unknown" };
        if (isCheckIn  && !existing.check_in)  { updates.check_in = time; updates.type = "حضور"; }
        if (isCheckOut) {
          updates.check_out = time;
          const checkIn = updates.check_in || existing.check_in;
          if (checkIn) {
            const [inH, inM]   = checkIn.split(":").map(Number);
            const [outH, outM] = time.split(":").map(Number);
            const hrs = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 10) / 10;
            if (hrs > 0) updates.hours = hrs;
          }
        }
        if (Object.keys(updates).length > 2) {
          await base44.asServiceRole.entities.Attendance.update(existing.id, { ...existing, ...updates });
          existingMap[key] = { ...existing, ...updates };
          updated++;
        } else { skipped++; }
      } else {
        const rec = {
          employee_id: employee.id,
          employee_name: employee.name,
          date,
          type: "حضور",
          check_in: isCheckIn ? time : "",
          check_out: isCheckOut ? time : "",
          hours: 0,
          notes: `مزامنة تلقائية من جهاز البصمة ${device_id || ""}`.trim(),
          source: "zkteco",
          device_id: device_id || "unknown",
          subscription_id: employee.subscription_id || "",
        };
        const created_rec = await base44.asServiceRole.entities.Attendance.create(rec);
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
    created, updated, skipped,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
  });
}