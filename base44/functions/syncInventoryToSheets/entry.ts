import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = "6a2c415b525a77504f309883";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { spreadsheetId, action } = body;

    // Get user's Google Sheets access token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    if (action === "export") {
      // Fetch all products
      const products = await base44.asServiceRole.entities.Product.list();

      // Prepare rows
      const headers = [
        "رمز الصنف", "اسم الصنف", "المجموعة", "الكمية المتاحة",
        "سعر التكلفة", "سعر الجملة", "سعر المستهلك", "الباركود", "المنشأ"
      ];
      const rows = products.map(p => [
        p.item_code || "",
        p.name || "",
        p.group_id || "",
        p.available_qty ?? 0,
        p.cost_price ?? 0,
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

    return Response.json({ error: "action غير صحيح. استخدم export أو import" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});