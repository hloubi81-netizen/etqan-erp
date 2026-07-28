import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SHEET_TITLE = "سجل تفعيل الفترات التجريبية - ETQAN";
const SHEET_TAB = "التجارب";
const STATE_PROVIDER = "trial_log_sheet";
const HEADERS = [
  "اسم المستخدم",
  "تاريخ الانتهاء",
  "تاريخ التفعيل",
  "معرّف الاشتراك",
  "الخطة",
];

async function getAccessToken(base44) {
  try {
    const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection("6a2c415b525a77504f309883");
    if (conn?.accessToken) return conn.accessToken;
  } catch { /* fall back to shared */ }
  const conn = await base44.asServiceRole.connectors.getConnection("googlesheets");
  return conn.accessToken;
}

async function getOrCreateSpreadsheetId(base44, accessToken) {
  // Look for a stored spreadsheet id in SyncState
  const states = await base44.asServiceRole.entities.SyncState.filter({ provider: STATE_PROVIDER });
  if (states && states.length > 0 && states[0].sync_token) {
    return states[0].sync_token;
  }

  // Create a new spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `${SHEET_TITLE} ${new Date().toISOString().split("T")[0]}` },
      sheets: [{ properties: { title: SHEET_TAB } }],
    }),
  });
  const created = await createRes.json();
  if (created.error) throw new Error(created.error.message);
  const spreadsheetId = created.spreadsheetId;

  // Write headers
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_TAB}'!A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [HEADERS] }),
    }
  );

  // Persist the id
  await base44.asServiceRole.entities.SyncState.create({
    sync_token: spreadsheetId,
    provider: STATE_PROVIDER,
  });

  return spreadsheetId;
}

async function appendRow(accessToken, spreadsheetId, row) {
  // Find the next empty row by appending to the sheet
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_TAB}'!A:E:append?insertDataOption=INSERT_ROWS&valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error.message);
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Support two call modes:
    // 1) Entity automation payload: { event, data }
    // 2) Direct invoke: { user_name, end_date, activation_date, subscription_id, plan }
    let record;
    if (body?.event?.type === "create" && body?.data) {
      const d = body.data;
      if (d.plan !== "free_trial") {
        return Response.json({ skipped: true, reason: "not_free_trial" });
      }
      record = {
        user_name: d.client_name || "",
        end_date: d.end_date || "",
        activation_date: d.start_date || (d.created_date ? d.created_date.split("T")[0] : new Date().toISOString().split("T")[0]),
        subscription_id: d.id || body.event?.entity_id || "",
        plan: d.plan,
      };
    } else {
      if (!body?.user_name || !body?.end_date) {
        return Response.json({ error: "user_name و end_date مطلوبان" }, { status: 400 });
      }
      record = {
        user_name: body.user_name,
        end_date: body.end_date,
        activation_date: body.activation_date || new Date().toISOString().split("T")[0],
        subscription_id: body.subscription_id || "",
        plan: body.plan || "free_trial",
      };
    }

    const accessToken = await getAccessToken(base44);
    if (!accessToken) {
      return Response.json({ error: "لا يوجد اتصال بـ Google Sheets. اربط الحساب أولاً." }, { status: 401 });
    }

    const spreadsheetId = await getOrCreateSpreadsheetId(base44, accessToken);

    const row = [
      record.user_name,
      record.end_date,
      record.activation_date,
      record.subscription_id,
      record.plan,
    ];

    await appendRow(accessToken, spreadsheetId, row);

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      record,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});