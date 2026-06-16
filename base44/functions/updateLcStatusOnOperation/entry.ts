import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Read the payload from the automation
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const lcId = data.lc_id;
    if (!lcId) {
      return Response.json({ error: 'Missing lc_id' }, { status: 400 });
    }

    // Get the LC record
    const lcRecord = await base44.asServiceRole.entities.LetterOfCredit.get(lcId);
    if (!lcRecord) {
      return Response.json({ error: 'LC not found' }, { status: 404 });
    }

    // Get all operations for this LC
    const operations = await base44.asServiceRole.entities.LcOperation.filter(
      { lc_id: lcId },
      '-created_date',
      500
    );

    // Calculate total used amount from all non-cancelled operations
    const totalUsed = operations
      .filter(op => op.status !== 'ملغاة')
      .reduce((sum, op) => sum + (op.amount || 0), 0);

    const lcAmount = lcRecord.amount || 0;
    const remaining = lcAmount - totalUsed;

    // Determine new status
    let newStatus = lcRecord.status;
    if (lcRecord.status !== 'منتهي' && lcRecord.status !== 'ملغي') {
      if (totalUsed <= 0) {
        newStatus = 'مفتوح';
      } else if (totalUsed >= lcAmount) {
        newStatus = 'مستخدم كلياً';
      } else {
        newStatus = 'مستخدم جزئياً';
      }
    }

    // Update LC
    await base44.asServiceRole.entities.LetterOfCredit.update(lcId, {
      used_amount: totalUsed,
      remaining_amount: remaining,
      status: newStatus,
    });

    return Response.json({
      success: true,
      lc_number: lcRecord.lc_number,
      used_amount: totalUsed,
      remaining_amount: remaining,
      status: newStatus,
      operations_count: operations.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});