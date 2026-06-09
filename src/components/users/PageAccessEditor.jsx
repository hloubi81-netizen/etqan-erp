import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PAGE_GROUPS } from "@/lib/pageRegistry";
import { ROLE_DEFAULTS } from "@/hooks/usePermissions";
import { LayoutGrid } from "lucide-react";

// حساب الظهور الفعلي لصفحة: تخصيص صريح > صلاحية القسم المخصصة > افتراضي الدور
function effectiveVisible(page, editUser) {
  const perms = editUser.permissions || {};
  const pageKey = `page:${page.path}`;
  if (perms[pageKey] !== undefined) return !!perms[pageKey];
  if (!page.section) return true;
  const secKey = `${page.section}.view`;
  if (perms[secKey] !== undefined) return !!perms[secKey];
  return !!(ROLE_DEFAULTS[editUser.role] || {})[secKey];
}

export default function PageAccessEditor({ editUser, onChange }) {
  function togglePage(page) {
    const visible = effectiveVisible(page, editUser);
    onChange({ [`page:${page.path}`]: !visible });
  }

  function setGroup(group, value) {
    const updates = {};
    group.pages.forEach((p) => { updates[`page:${p.path}`] = value; });
    onChange(updates);
  }

  function clearOverrides() {
    const perms = { ...(editUser.permissions || {}) };
    Object.keys(perms).forEach((k) => { if (k.startsWith("page:")) delete perms[k]; });
    onChange(null, perms);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5" />
          صلاحيات عرض الصفحات (تخصيص الصفحات الظاهرة لهذا المستخدم):
        </p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={clearOverrides}>
          إعادة للافتراضي
        </Button>
      </div>
      <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
        {PAGE_GROUPS.map((group) => {
          const visibleCount = group.pages.filter((p) => effectiveVisible(p, editUser)).length;
          return (
            <div key={group.label} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">{group.label} <span className="text-muted-foreground font-normal">({visibleCount}/{group.pages.length})</span></p>
                <div className="flex gap-1">
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setGroup(group, true)}>إظهار الكل</button>
                  <span className="text-[10px] text-muted-foreground">|</span>
                  <button className="text-[10px] text-destructive hover:underline" onClick={() => setGroup(group, false)}>إخفاء الكل</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                {group.pages.map((page) => (
                  <label key={page.path} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={effectiveVisible(page, editUser)}
                      onCheckedChange={() => togglePage(page)}
                    />
                    <span className="leading-tight">{page.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        الصفحات غير المحددة تختفي من القائمة الجانبية ويُمنع الوصول إليها عبر الرابط مباشرة.
      </p>
    </div>
  );
}