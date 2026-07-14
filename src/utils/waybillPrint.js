import { base44 } from "@/api/base44Client";

function esc(v) {
  return (v == null ? "" : String(v)).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export async function printShipmentWaybill(shipmentId) {
  const s = await base44.entities.Shipment.get(shipmentId);
  if (!s) return;

  let carrier = null, trip = null;
  if (s.carrier_id) { try { carrier = await base44.entities.ShippingCarrier.get(s.carrier_id); } catch (_) {} }
  if (s.trip_id) { try { trip = await base44.entities.ShippingTrip.get(s.trip_id); } catch (_) {} }

  const today = new Date().toLocaleDateString("ar-EG");
  const cod = s.cod_amount || 0;

  const html = `<!doctype html><html lang="ar" dir="rtl"><head>
  <meta charset="utf-8" />
  <title>بوليصة شحن - ${esc(s.tracking_number)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; color: #0f172a; margin: 0; padding: 18px; font-size: 12px; line-height: 1.5; }
    .sheet { border: 2px solid #1d4ed8; border-radius: 10px; overflow: hidden; max-width: 800px; margin: 0 auto; }
    .head { background: #1d4ed8; color: #fff; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
    .head h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
    .head .track { text-align: left; font-size: 11px; opacity: .9; }
    .head .track b { display: block; font-size: 18px; letter-spacing: 2px; }
    .bar { background: #eff6ff; padding: 10px 20px; text-align: center; font-family: monospace; font-size: 26px; letter-spacing: 6px; color: #1e293b; border-bottom: 1px solid #dbeafe; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .party { padding: 14px 20px; border-bottom: 1px solid #e2e8f0; }
    .party.left { border-right: 1px solid #e2e8f0; }
    .party h3 { margin: 0 0 6px; font-size: 12px; color: #1d4ed8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px dashed #cbd5e1; padding-bottom: 4px; }
    .party .row { margin: 3px 0; }
    .party .row b { color: #475569; display: inline-block; min-width: 70px; }
    .section { padding: 12px 20px; border-bottom: 1px solid #e2e8f0; }
    .section h3 { margin: 0 0 8px; font-size: 12px; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: right; font-size: 12px; }
    th { background: #f1f5f9; color: #1e293b; font-weight: 600; width: 33%; }
    .totals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .total-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center; background: #fff; }
    .total-box .lbl { font-size: 10px; color: #64748b; }
    .total-box .val { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .total-box.cod .val { color: #ea580c; }
    .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 24px 20px 30px; }
    .sign { text-align: center; }
    .sign .line { border-top: 1.5px solid #475569; margin-top: 36px; padding-top: 4px; font-size: 11px; color: #64748b; }
    .foot { text-align: center; font-size: 10px; color: #94a3b8; padding: 8px; border-top: 1px solid #e2e8f0; }
    @media print { body { padding: 0; } .sheet { border: none; max-width: 100%; } }
  </style></head>
  <body>
    <div class="sheet">
      <div class="head">
        <h1>بوليصة شحن</h1>
        <div class="track">رقم البوليصة<b>${esc(s.tracking_number)}</b></div>
      </div>
      <div class="bar">||| ${esc(s.tracking_number || "—")} |||</div>

      <div class="grid2">
        <div class="party left">
          <h3>المرسِل</h3>
          <div class="row"><b>من:</b> ${esc(s.origin_city || "—")}</div>
          <div class="row"><b>الشركة:</b> ${esc(s.carrier_name || "—")}</div>
          <div class="row"><b>تاريخ الشحن:</b> ${esc(s.ship_date || "—")}</div>
        </div>
        <div class="party">
          <h3>المرسَل إليه</h3>
          <div class="row"><b>الاسم:</b> ${esc(s.recipient_name || "—")}</div>
          <div class="row"><b>الهاتف:</b> ${esc(s.recipient_phone || "—")}</div>
          <div class="row"><b>إلى:</b> ${esc(s.destination_city || "—")}</div>
        </div>
      </div>

      <div class="section">
        <h3>تفاصيل الشحنة</h3>
        <table>
          <tr><th>الوزن (كغ)</th><td>${esc(s.weight ?? "—")}</td><th>القيمة المعلنة</th><td>${esc((s.declared_value ?? 0).toLocaleString())}</td></tr>
          <tr><th>الرحلة</th><td>${esc(trip?.trip_number || "—")}</td><th>المسار</th><td>${esc(trip ? `${trip.route_from || ""} ← ${trip.route_to || ""}` : "—")}</td></tr>
          <tr><th>السائق</th><td>${esc(trip?.driver_name || "—")}</td><th>المركبة</th><td>${esc(trip?.vehicle_plate || "—")}</td></tr>
          <tr><th>التسليم المتوقع</th><td>${esc(s.estimated_delivery || "—")}</td><th>الحالة</th><td>${esc(s.status || "—")}</td></tr>
        </table>
      </div>

      <div class="totals">
        <div class="total-box"><div class="lbl">تكلفة الشحن</div><div class="val">${esc((s.shipping_cost || 0).toLocaleString())}</div></div>
        <div class="total-box cod"><div class="lbl">الدفع عند الاستلام (COD)</div><div class="val">${esc(cod.toLocaleString())}</div></div>
        <div class="total-box"><div class="lbl">حالة التحصيل</div><div class="val" style="font-size:13px">${esc(s.cod_status || "غير محدد")}</div></div>
      </div>

      ${s.notes ? `<div class="section" style="border-bottom:1px solid #e2e8f0"><h3>ملاحظات</h3><div>${esc(s.notes)}</div></div>` : ""}

      <div class="signs">
        <div class="sign"><div class="line">توقيع المرسِل</div></div>
        <div class="sign"><div class="line">توقيع المستلم وختمه</div></div>
      </div>

      <div class="foot">تم إنشاء هذه البوليصة إلكترونيًا بتاريخ ${esc(today)} — ${esc(carrier?.name || "نظام الشحن")}</div>
    </div>
    <script>window.onload = () => { setTimeout(() => window.print(), 400); };</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("الرجاء السماح بالنوافذ المنبثقة لطباعة البوليصة."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}