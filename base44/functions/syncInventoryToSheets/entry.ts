import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = "6a2c415b525a77504f309883";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { spreadsheetId, action } = body;

    let accessToken;

    // Try app-user connection first (when called from the UI with a user session);
    // fall back to the platform shared connection (used by scheduled automations).
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      const conn = await base44.asServiceRole.connectors.getConnection("googlesheets");
      accessToken = conn.accessToken;
    }

    if (!accessToken) {
      return Response.json({ error: 'لا يوجد اتصال بـ Google Sheets. اربط حسابك أولاً.' }, { status: 401 });
    }

    if (action === "export") {
      // Fetch all products
      const products = await base44.asServiceRole.entities.Product.list();

      // Prepare rows
      const headers = [
        "رمز الصنف", "اسم الصنف", "المجموعة", "الكمية المتاحة",
        "سعر التكلفة", "إجمالي قيمة التكلفة", "سعر الجملة", "سعر المستهلك", "الباركود", "المنشأ"
      ];
      const rows = products.map(p => [
        p.item_code || "",
        p.name || "",
        p.group_id || "",
        p.available_qty ?? 0,
        p.cost_price ?? 0,
        (p.available_qty ?? 0) * (p.cost_price ?? 0),
        p.wholesale_price ?? 0,
        p.retail_price ?? 0,
        p.barcode || "",
        p.origin || ""
      ]);

      let targetSpreadsheetId = spreadsheetId;

      // Create a new spreadsheet if none provided
      if (!targetSpreadsheetId) {
        const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            properties: { title: `مخزون ETQAN - ${new Date().toLocaleDateString('ar-EG')}` },
            sheets: [{ properties: { title: "المنتجات" } }]
          })
        });
        const created = await createRes.json();
        targetSpreadsheetId = created.spreadsheetId;
      }

      // Write headers + data
      const values = [headers, ...rows];
      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/A1?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values })
        }
      );
      const writeResult = await writeRes.json();
      if (writeResult.error) throw new Error(writeResult.error.message);

      return Response.json({
        success: true,
        spreadsheetId: targetSpreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`,
        rowsExported: rows.length
      });
    }

    if (action === "import") {
      if (!spreadsheetId) {
        return Response.json({ error: "spreadsheetId مطلوب للاستيراد" }, { status: 400 });
      }

      // Read data from sheet
      const readRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z10000`,
        {
          headers: { "Authorization": `Bearer ${accessToken}` }
        }
      );
      const sheetData = await readRes.json();
      if (sheetData.error) throw new Error(sheetData.error.message);

      const rows = sheetData.values || [];
      if (rows.length < 2) {
        return Response.json({ error: "لا توجد بيانات في الجدول" }, { status: 400 });
      }

      // rows[0] = headers, rows[1..] = data
      let updated = 0;
      const existing = await base44.asServiceRole.entities.Product.list();
      const productMap = {};
      existing.forEach(p => { productMap[p.item_code] = p; });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const item_code = row[0];
        if (!item_code) continue;

        const updates = {
          item_code: row[0] || "",
          name: row[1] || "",
          available_qty: parseFloat(row[3]) || 0,
          cost_price: parseFloat(row[4]) || 0,
          wholesale_price: parseFloat(row[5]) || 0,
          retail_price: parseFloat(row[6]) || 0,
          barcode: row[7] || "",
        };

        if (productMap[item_code]) {
          await base44.asServiceRole.entities.Product.update(productMap[item_code].id, updates);
          updated++;
        }
      }

      return Response.json({ success: true, rowsUpdated: updated });
    }

    if (action === "exportFinancialReport") {
      const products = await base44.asServiceRole.entities.Product.list();

      // Build financial report rows
      const headers = [
        "رمز الصنف", "اسم الصنف", "الكمية", "سعر التكلفة",
        "إجمالي قيمة التكلفة", "سعر المستهلك", "إجمالي قيمة البيع"
      ];

      let totalCostValue = 0;
      let totalRetailValue = 0;

      const rows = products.map(p => {
        const costVal = (p.available_qty ?? 0) * (p.cost_price ?? 0);
        const retailVal = (p.available_qty ?? 0) * (p.retail_price ?? 0);
        totalCostValue += costVal;
        totalRetailValue += retailVal;

        return [
          p.item_code || "",
          p.name || "",
          p.available_qty ?? 0,
          p.cost_price ?? 0,
          costVal,
          p.retail_price ?? 0,
          retailVal
        ];
      });

      // Add totals row
      rows.push([
        "", "المجموع الكلي", "", "",
        totalCostValue, "", totalRetailValue
      ]);

      // Add timestamp row
      const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
      rows.push([]);
      rows.push(["آخر تحديث:", now, "", "", "", "", ""]);

      let targetSpreadsheetId = spreadsheetId;

      if (!targetSpreadsheetId) {
        const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            properties: { title: `القيم المالية للمخزون - ETQAN` },
            sheets: [
              { properties: { title: "القيم المالية" } }
            ]
          })
        });
        const created = await createRes.json();
        if (created.error) throw new Error(created.error.message);
        targetSpreadsheetId = created.spreadsheetId;
      } else {
        // Ensure the financial sheet exists in existing spreadsheet
        const metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );
        const meta = await metaRes.json();
        const sheetExists = (meta.sheets || []).some(s => s.properties?.title === "القيم المالية");

        if (!sheetExists) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}:batchUpdate`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: "القيم المالية" } } }]
              })
            }
          );
        }
      }

      // Write to the "القيم المالية" sheet
      const values = [headers, ...rows];
      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/'القيم المالية'!A1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values })
        }
      );
      const writeResult = await writeRes.json();
      if (writeResult.error) throw new Error(writeResult.error.message);

      return Response.json({
        success: true,
        spreadsheetId: targetSpreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`,
        totalCostValue,
        totalRetailValue,
        itemsCount: products.length
      });
    }

    return Response.json({ error: "action غير صحيح. استخدم export، import، أو exportFinancialReport" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});