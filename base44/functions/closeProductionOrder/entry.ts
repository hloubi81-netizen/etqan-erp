import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });

    // Load the order and its stages (service role to read all)
    const order = await base44.asServiceRole.entities.ProductionOrder.get(order_id);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.cost_center_id) return Response.json({ error: 'الأمر غير مرتبط بمركز تكلفة' }, { status: 400 });

    const stages = await base44.asServiceRole.entities.ProductionStage.filter({ order_id });

    // Aggregate actual costs from stages
    const materialCost = stages.reduce((a, s) => a + (s.material_cost || 0), 0);
    const laborCost = stages.reduce((a, s) => a + (s.labor_cost || 0), 0);
    const overheadCost = stages.reduce((a, s) => a + (s.overhead_cost || 0), 0);
    const totalCost = materialCost + laborCost + overheadCost;

    if (totalCost <= 0) return Response.json({ error: 'لا توجد تكاليف مرحّلة على المراحل' }, { status: 400 });

    // ---- Compute Variances (Standard/Planned vs Actual) ----
    // Positive variance = favorable (under budget), Negative = unfavorable (over budget)
    const plannedMaterial = order.planned_material_cost || 0;
    const plannedLabor = order.planned_labor_cost || 0;
    const plannedOverhead = order.planned_overhead_cost || 0;
    const totalPlanned = plannedMaterial + plannedLabor + plannedOverhead;

    const materialVariance = plannedMaterial - materialCost;
    const laborVariance = plannedLabor - laborCost;
    const overheadVariance = plannedOverhead - overheadCost;
    const totalVariance = totalPlanned - totalCost;
    const variancePct = totalPlanned > 0 ? (totalVariance / totalPlanned) * 100 : 0;

    const today = new Date().toISOString().slice(0, 10);
    const period = today.slice(0, 7);

    // Check if cost entries already posted for this order (idempotency)
    const existing = await base44.asServiceRole.entities.CostEntry.filter({
      production_order_id: order_id, status: 'مرحّل'
    });
    if (existing.length > 0) {
      return Response.json({ error: 'تم ترحيل تكاليف هذا الأمر مسبقًا', already_posted: true }, { status: 409 });
    }

    // Create CostEntry records per cost type
    const costEntries = [];
    const types = [
      { type: 'مواد مباشرة', amount: materialCost },
      { type: 'عمالة مباشرة', amount: laborCost },
      { type: 'تكاليف صناعية غير مباشرة', amount: overheadCost },
    ].filter(t => t.amount > 0);

    for (const t of types) {
      const entry = await base44.asServiceRole.entities.CostEntry.create({
        entry_number: `CE-${order.order_number}-${t.type.slice(0, 2)}`,
        date: today,
        cost_center_id: order.cost_center_id,
        cost_center_name: order.cost_center_name,
        cost_type: t.type,
        description: `تكاليف ${t.type} — أمر إنتاج ${order.order_number} (${order.product_name})`,
        total_cost: t.amount,
        branch_id: order.branch_id,
        branch_name: order.branch_name,
        period,
        production_order_id: order_id,
        production_order_number: order.order_number,
        status: 'مرحّل',
      });
      costEntries.push(entry.id);
    }

    // Create a JournalEntry (debit cost center, credit inventory/WIP)
    await base44.asServiceRole.entities.JournalEntry.create({
      entry_number: `JE-${order.order_number}`,
      date: today,
      source_type: 'سند قيد',
      source_id: order_id,
      source_number: order.order_number,
      debit_account_name: `مركز التكلفة: ${order.cost_center_name}`,
      credit_account_name: 'مخزون إنتاج تحت التشغيل',
      amount: totalCost,
      cost_center_id: order.cost_center_id,
      notes: `قيد تكاليف إنتاج — ${order.order_number} — ${order.product_name}`,
    });

    // Mark order as completed, posted, and store variance analysis
    await base44.asServiceRole.entities.ProductionOrder.update(order_id, {
      status: 'مكتمل',
      end_date: today,
      actual_material_cost: materialCost,
      actual_labor_cost: laborCost,
      actual_overhead_cost: overheadCost,
      total_actual_cost: totalCost,
      actual_unit_cost: (order.completed_quantity || 0) > 0 ? totalCost / order.completed_quantity : 0,
      material_variance: materialVariance,
      labor_variance: laborVariance,
      overhead_variance: overheadVariance,
      total_variance: totalVariance,
      variance_pct: variancePct,
      completed_stages: stages.filter(s => s.status === 'مكتمل').length,
      stages_count: stages.length,
    });

    return Response.json({
      success: true,
      order_id,
      material_cost: materialCost,
      labor_cost: laborCost,
      overhead_cost: overheadCost,
      total_cost: totalCost,
      total_planned: totalPlanned,
      variances: {
        material: materialVariance,
        labor: laborVariance,
        overhead: overheadVariance,
        total: totalVariance,
        pct: variancePct,
      },
      cost_entries_created: costEntries.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});