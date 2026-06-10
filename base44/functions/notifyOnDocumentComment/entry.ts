import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only handle new comments
    if (event?.type !== 'create' || !data) {
      return Response.json({ ok: true });
    }

    const comment = data;
    const { document_type, document_id, document_number, author_email, author_name, comment: commentText } = comment;

    if (!document_id) return Response.json({ ok: true });

    // Find all users who have interacted with this document (commented on it),
    // excluding the comment author — notify them
    const existingComments = await base44.asServiceRole.entities.DocumentComment.filter({
      document_id: document_id,
    });

    // Collect unique emails that commented on this doc (excluding author of current comment)
    const notifyEmails = new Set();
    for (const c of existingComments) {
      if (c.author_email && c.author_email !== author_email && c.id !== comment.id) {
        notifyEmails.add(c.author_email);
      }
    }

    // Also notify the creator of the document if we can find them
    // Try to find in Invoice or InventoryCount by document_id
    let docCreatorEmail = null;
    try {
      if (document_type === 'فاتورة') {
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: document_id });
        if (invoices.length > 0 && invoices[0].created_by_id) {
          const creator = await base44.asServiceRole.entities.User.filter({ id: invoices[0].created_by_id });
          if (creator.length > 0) docCreatorEmail = creator[0].email;
        }
      } else if (document_type === 'جرد') {
        const counts = await base44.asServiceRole.entities.InventoryCount.filter({ id: document_id });
        if (counts.length > 0 && counts[0].created_by_id) {
          const creator = await base44.asServiceRole.entities.User.filter({ id: counts[0].created_by_id });
          if (creator.length > 0) docCreatorEmail = creator[0].email;
        }
      }
    } catch (_) { /* ignore */ }

    if (docCreatorEmail && docCreatorEmail !== author_email) {
      notifyEmails.add(docCreatorEmail);
    }

    // Create a notification for each target user
    const docLabel = `${document_type} ${document_number ? '#' + document_number : ''}`.trim();
    for (const email of notifyEmails) {
      await base44.asServiceRole.entities.Notification.create({
        title: `تعليق جديد على ${docLabel}`,
        message: `${author_name || author_email} علّق: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
        type: 'تذكير',
        related_module: document_type === 'فاتورة' ? 'الفواتير' : 'الجرد',
        related_id: document_id,
        is_read: false,
        trigger_date: new Date().toISOString().split('T')[0],
        target_user: email,
      });
    }

    return Response.json({ ok: true, notified: notifyEmails.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});