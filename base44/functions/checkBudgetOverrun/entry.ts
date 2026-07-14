import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    const budgets = await base44.asServiceRole.entities.Budget.filter({ status: 'معتمدة' });
    const alerts = [];

    for (const b of budgets) {
      const budgeted = b.total_budgeted || 0;
      if (budgeted <= 0) continue;

      let entries = [];
      if (b.cost_center_id) {
        entries = await base44.asServiceRole.entities.CostEntry.filter({ cost_center_id: b.cost_center_id }).catch(() => []);
      }
      const actual = entries
        .filter(e => ((e.period || '').includes(currentYear)) || ((e.date || '').startsWith(currentYear)))
        .reduce((s, e) => s + (e.total_cost || 0), 0);

      const pct = (actual / budgeted) * 100;
      if (pct < 80) continue;

      const existing = await base44.asServiceRole.entities.Notification.filter({
        related_id: b.id, type: 'تجاوز ميزانية'
      }).catch(() => []);
      const alreadyToday = existing.some(n => (n.trigger_date || '') === today);
      if (alreadyToday) continue;

      await base44.asServiceRole.entities.Notification.create({
        title: 'تنبيه تجاوز ميزانية',
        message: `الميزانية "${b.name}" بلغت ${pct.toFixed(0)}% من الميزانية المعتمدة (الفعلي ${actual.toLocaleString()} من ${budgeted.toLocaleString()})${b.cost_center_name ? ' — مركز التكلفة: ' + b.cost_center_name : ''}.`,
        type: 'تجاوز ميزانية',
        related_module: 'Budget',
        related_id: b.id,
        trigger_date: today,
      });
      alerts.push({ budget: b.name, pct: Number(pct.toFixed(0)), actual, budgeted });
    }

    return Response.json({ status: 'ok', checked: budgets.length, alerts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});