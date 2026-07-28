import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, FolderTree, Phone, GitBranch, Coins } from "lucide-react";

function DetailRow({ label, value, icon, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-muted-foreground whitespace-nowrap">{label}: </span>
      <span className={highlight || "font-medium"}>{value}</span>
    </div>
  );
}

export default function AccountCardDialog({ open, onClose, account, allAccounts }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !account) return;
    setLoading(true);
    base44.entities.Voucher.list("-created_date", 200).then((vouchers) => {
      const moves = [];
      vouchers.forEach((v) => {
        (v.entries || []).forEach((e) => {
          if (e.account_id === account.id) {
            moves.push({
              voucher_number: v.voucher_number,
              date: v.date,
              type: v.type,
              notes: e.notes || v.notes || "",
              debit: e.debit || 0,
              credit: e.credit || 0,
            });
          }
        });
      });
      moves.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setMovements(moves.slice(0, 20));
      setLoading(false);
    });
  }, [open, account]);

  if (!account) return null;

  const parent = allAccounts?.find((a) => a.id === account.parent_account_id);
  const totalDebit = movements.reduce((s, m) => s + m.debit, 0);
  const totalCredit = movements.reduce((s, m) => s + m.credit, 0);
  const balance = account.balance || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            بطاقة حساب
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="text-xs text-muted-foreground">رقم الحساب</div>
                <div className="text-lg font-bold">{account.account_number}</div>
                <div className="text-base font-medium mt-1">{account.name}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-muted-foreground">الرصيد الحالي</div>
                <div className={`text-xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.abs(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {account.final_account && <Badge variant="secondary">{account.final_account}</Badge>}
              {account.account_nature && <Badge variant="outline">{account.account_nature}</Badge>}
              {account.financial_statement && <Badge variant="outline">{account.financial_statement}</Badge>}
              {account.branch_name && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  <GitBranch className="h-3 w-3 ml-1" />{account.branch_name}
                </Badge>
              )}
              {account.currency && (
                <Badge variant="outline"><Coins className="h-3 w-3 ml-1" />{account.currency}</Badge>
              )}
              {account.is_parent && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">حساب رئيسي</Badge>
              )}
              {account.is_active === false && (
                <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50">غير نشط</Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold">تفاصيل الحساب</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm p-3">
                <DetailRow label="الحساب الختامي" value={account.final_account} />
                <DetailRow label="طبيعة الحساب" value={account.account_nature} />
                <DetailRow label="القائمة المالية" value={account.financial_statement} />
                <DetailRow label="الفرع" value={account.branch_name} />
                <DetailRow label="العملة" value={account.currency} />
                <DetailRow label="المستوى" value={account.level != null ? String(account.level) : ""} />
                <DetailRow label="الحساب الرئيسي" value={parent?.name || account.parent_account_name} />
                <DetailRow label="مصدر الدليل" value={account.chart_source} />
                <DetailRow
                  label="الهاتف / واتساب"
                  value={account.phone}
                  icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                />
                <DetailRow
                  label="رصيد مدين"
                  value={account.debit_balance != null ? account.debit_balance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                />
                <DetailRow
                  label="رصيد دائن"
                  value={account.credit_balance != null ? account.credit_balance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                />
                <DetailRow
                  label="الرصيد الصافي"
                  value={balance != null ? Math.abs(balance).toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                  highlight={balance >= 0 ? "text-emerald-600" : "text-red-600"}
                />
                <div className="col-span-2">
                  <span className="text-muted-foreground">الوصف: </span>
                  {account.description || "—"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">آخر الحركات (20)</div>
              {loading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">جاري التحميل...</div>
              ) : movements.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">لا توجد حركات على هذا الحساب</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs">
                      <tr>
                        <th className="text-right p-2">التاريخ</th>
                        <th className="text-right p-2">السند</th>
                        <th className="text-right p-2">البيان</th>
                        <th className="text-right p-2">مدين</th>
                        <th className="text-right p-2">دائن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {movements.map((m, i) => (
                        <tr key={i}>
                          <td className="p-2 whitespace-nowrap">{m.date}</td>
                          <td className="p-2">{m.voucher_number}</td>
                          <td className="p-2 max-w-[200px] truncate">{m.notes || m.type}</td>
                          <td className="p-2 text-emerald-600">{m.debit ? m.debit.toLocaleString() : ""}</td>
                          <td className="p-2 text-red-600">{m.credit ? m.credit.toLocaleString() : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-bold text-xs">
                      <tr>
                        <td className="p-2" colSpan={3}>الإجمالي</td>
                        <td className="p-2 text-emerald-600">{totalDebit.toLocaleString()}</td>
                        <td className="p-2 text-red-600">{totalCredit.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 ml-1" />طباعة
          </Button>
          <Button onClick={onClose}>إغلاق</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}