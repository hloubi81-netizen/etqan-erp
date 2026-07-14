import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Gift, Crown, TrendingUp, Receipt, Phone, User } from "lucide-react";

const TIER_COLORS = {
  "برونزي": "bg-amber-100 text-amber-800",
  "فضي": "bg-gray-100 text-gray-700",
  "ذهبي": "bg-yellow-100 text-yellow-800",
  "بلاتيني": "bg-purple-100 text-purple-800",
};

export default function CustomerPortal() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [searched, setSearched] = useState(false);

  const lookup = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(false);
    setData(null);
    try {
      const res = await base44.functions.invoke("customerLoyaltyLookup", { phone: phone.trim() });
      setData(res.data);
      setSearched(true);
    } catch (e) {
      setData({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> بوابة العميل الذاتية</h1>
        <p className="text-sm text-muted-foreground mt-0.5">استعلام عن رصيد النقاط والمستوى والفوائد برقم الهاتف</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pr-9" placeholder="أدخل رقم الهاتف..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && lookup()} />
            </div>
            <Button onClick={lookup} disabled={loading} className="gap-1.5">
              <Search className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> استعلام
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="h-40 rounded-lg bg-muted animate-pulse" />}

      {data?.error && <Card><CardContent className="p-4 text-sm text-destructive">تعذر الاستعلام: {data.error}</CardContent></Card>}

      {searched && data && !data.found && !data.error && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">لا يوجد عميل مسجّل بهذا الرقم</CardContent></Card>
      )}

      {data?.found && (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-lg font-bold">{data.client.client_name}</p>
                  <p className="text-sm text-muted-foreground">{data.client.client_phone || "—"}</p>
                  {data.nextTier && (
                    <p className="text-xs text-muted-foreground mt-1">يبقى {data.pointsToNext.toLocaleString()} نقطة للترقية إلى <span className="font-medium">{data.nextTier.name}</span></p>
                  )}
                </div>
                <Badge className={`${TIER_COLORS[data.tier] || TIER_COLORS["برونزي"]} text-sm px-3 py-1`}>
                  <Crown className="h-3.5 w-3.5 ml-1" /> مستوى {data.tier}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-muted/40 text-center">
                  <Star className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                  <p className="text-xs text-muted-foreground">إجمالي النقاط</p>
                  <p className="text-lg font-bold">{(data.client.total_points || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-center">
                  <Gift className="h-4 w-4 mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-muted-foreground">النقاط المتاحة</p>
                  <p className="text-lg font-bold text-green-700">{(data.client.available_points || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-muted-foreground">خصم المستوى</p>
                  <p className="text-lg font-bold text-blue-700">{data.tierDiscount}%</p>
                </div>
              </div>

              {data.currencyPerPoint > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  قيمة النقطة المتاحة: {data.currencyPerPoint} — يمكن استرداد ما يعادل {((data.client.available_points || 0) * data.currencyPerPoint).toLocaleString()} من المشتريات.
                </p>
              )}
            </CardContent>
          </Card>

          {data.transactions?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">آخر عمليات النقاط</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="font-medium">{t.type}</p>
                        <p className="text-xs text-muted-foreground">{t.notes || "—"}</p>
                      </div>
                      <span className={`font-semibold ${t.type === "استخدام" ? "text-red-600" : "text-green-600"}`}>
                        {t.type === "استخدام" ? "−" : "+"}{(t.points || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.recentInvoices?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><Receipt className="h-4 w-4" /> آخر المشتريات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.recentInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{inv.date ? new Date(inv.date).toLocaleDateString("ar-EG") : "—"}</p>
                      </div>
                      <span className="font-semibold">{(inv.total || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}