import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stage_id } = await req.json();
    if (!stage_id) return Response.json({ error: 'stage_id is required' }, { status: 400 });

    const stage = await base44.asServiceRole.entities.ProductionStage.get(stage_id);
    if (!stage) return Response.json({ error: 'المرحلة غير موجودة' }, { status: 404 });

    // Idempotency: don't deduct twice
    if (stage.materials_deducted) {
      return Response.json({ error: 'تم خصم المواد من قبل لهذه المرحلة', already_deducted: true }, { status: 409 });
    }

    const materials = stage.materials_consumed || [];
    if (!materials.length) {
      // No materials to deduct — just start the stage
      await base44.asServiceRole.entities.ProductionStage.update(stage_id, {
        status: 'جاري',
        start_time: stage.start_time || new Date().toISOString(),
      });
      return Response.json({ success: true, message: 'لا توجد مواد للخصم — تم بدء المرحلة', deducted: 0 });
    }

    // Validate stock availability for all materials first
    const productIds = [...new Set(materials.map(m => m.product_id))];
    const products = await base44.asServiceRole.entities.Product.filter({ id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const insufficient = [];
    for (const m of materials) {
      const product = productMap[m.product_id];
      if (!product) { insufficient.push({ name: m.product_name, reason: 'المنتج غير موجود' }); continue; }
      const available = product.available_qty || 0;
      if (available < m.quantity) {
        insufficient.push({ name: m.product_name, available, needed: m.quantity, reason: `الرصيد ${available} < المطلوب ${m.quantity}` });
      }
    }
    if (insufficient.length) {
      return Response.json({ error: 'رصيد غير كافٍ', insufficient }, { status: 400 });
    }

    // Deduct each material from Product.available_qty and compute cost
    let totalMaterialCost = 0;
    const deductedItems = [];
    for (const m of materials) {
      const product = productMap[m.product_id];
      const unitCost = m.unit_cost || product.avg_purchase_price || product.cost_price || 0;
      const lineCost = unitCost * m.quantity;
      totalMaterialCost += lineCost;

      const newQty = Math.max(0, (product.available_qty || 0) - m.quantity);
      const newCostValue = Math.max(0, (product.total_cost_value || 0) - lineCost);
      await base44.asServiceRole.entities.Product.update(m.product_id, {
        available_qty: newQty,
        total_cost_value: newCostValue,
        last_stock_update: new Date().toISOString(),
        last_stock_warehouse_id: m.warehouse_id || product.last_stock_warehouse_id,
      });

      deductedItems.push({
        product_id: m.product_id,
        product_name: m.product_name,
        quantity: m.quantity,
        unit_cost: unitCost,
        total_cost: lineCost,
        previous_qty: product.available_qty || 0,
        new_qty: newQty,
      });
    }

    // Update stage: set material_cost from actual deduction, mark as deducted, start stage
    const newTotal = totalMaterialCost + (stage.labor_cost || 0) + (stage.overhead_cost || 0);
    await base44.asServiceRole.entities.ProductionStage.update(stage_id, {
      status: 'جاري',
      start_time: stage.start_time || new Date().toISOString(),
      material_cost: totalMaterialCost,
      total_cost: newTotal,
      materials_deducted: true,
    });

    // Create a CostEntry for the material consumption (linked to stage + order)
    if (stage.cost_center_id && totalMaterialCost > 0) {
      await base44.asServiceRole.entities.CostEntry.create({
        entry_number: `CE-${stage.order_number || stage_id.slice(-6)}-MAT`,
        date: new Date().toISOString().slice(0, 10),
        cost_center_id: stage.cost_center_id,
        cost_center_name: stage.cost_center_name,
        cost_type: 'مواد مباشرة',
        description: `استهلاك مواد خام — مرحلة "${stage.stage_name}" (${stage.order_number || ''})`,
        total_cost: totalMaterialCost,
        production_order_id: stage.order_id,
        production_order_number: stage.order_number,
        production_stage_id: stage_id,
        production_stage_name: stage.stage_name,
        status: 'مرحّل',
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      stage_id,
      deducted: deductedItems.length,
      total_material_cost: totalMaterialCost,
      items: deductedItems,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});