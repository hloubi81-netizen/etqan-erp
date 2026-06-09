import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return Response.json({ 
            success: false, 
            error: "تم إعداد الشاشات بنجاح. يرجى توفير الصلاحيات والمفاتيح الخاصة بالمنصات في الإعدادات لتفعيل جلب الطلبات الحقيقية." 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});