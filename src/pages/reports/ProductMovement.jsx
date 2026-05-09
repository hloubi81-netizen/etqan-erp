import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import ExportButtons from "../../components/shared/ExportButtons";

export default function ProductMovement() {
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [filters, setFilters] = useState({ product_id: "", group_id: "", warehouse_id: "", date_from: "", date_to: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInLocal, setShowInLocal] = useState(false);
  const [hasForeignCurrency, setHasForeignCurrency] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [p, g, w, inv, tr, curs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.ProductGroup.list(),
      base44.entities.Warehouse.list(),
      base44.entities.Invoice.list(),
      base44.entities.StockTransfer.list(),
      base44.entities.Currency.list(),
    ]);
    setProducts(p); setGroups(g); setWarehouses(w); setInvoices(inv); setTransfers(tr); setCurrencies(curs);
    setLoading(false);
  }

  function getExchangeRate(currencyName) {
    if (!currencyName) return 1;
    const localCur = currencies.find(c => c.is_local);
    if (localCur && currencyName === localCur.name) return 1;
    const cur = currencies.find(c => c.name === currencyName);
    return cur?.exchange_rate || 1;
  }

  function generateReport() {
    const movements = [];
    const localCur = currencies.find(c => c.is_local);
    let foundForeign = false;

    invoices.forEach((inv) => {
      if (filters.date_from && inv.date < filters.date_from) return;
      if (filters.date_to && inv.date > filters.date_to) return;
      if (filters.warehouse_id && inv.warehouse_id !== filters.warehouse_id) return;

      const isForeign = inv.currency && localCur && inv.currency !== localCur.name;
      if (isForeign) foundForeign = true;
      const rate = isForeign ? getExchangeRate(inv.currency) : 1;

      (inv.items || []).forEach((item) => {
        if (filters.product_id && item.product_id !== filters.product_id) return;
        if (filters.group_id) {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod && prod.group_id !== filters.group_id) return;
        }
        movements.push({
          date: inv.date,
          number: inv.invoice_number,
          type: inv.pattern_type,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          priceLocal: typeof item.price === "number" ? item.price * rate : item.price,
          currency: inv.currency,
          warehouse: inv.warehouse_name || "-",
        });
      });
    });

    // Process transfers
    transfers.forEach((tr) => {
      if (filters.date_from && tr.date < filters.date_from) return;
      if (filters.date_to && tr.date > filters.date_to) return;

      (tr.items || []).forEach((item) => {
        if (filters.product_id && item.product_id !== filters.product_id) return;
        movements.push({
          date: tr.date,
          number: tr.transfer_number,
          type: "مناقلة",
          product_name: item.product_name,
          quantity: item.quantity,
          price: "-",
          warehouse: `${tr.from_warehouse_name} → ${tr.to_warehouse_name}`,
        });
      });
    });

    setHasForeignCurrency(foundForeign);
    movements.sort((a, b) => (a.date > b.date ? -1 : 1));
    setResults(movements);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="حركة المواد" subtitle="تقرير حركة المواد والأصناف" />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">الصنف</Label>
              <Select value={filters.product_id} onValueChange={(v) => setFilters({ ...filters, product_id: v === "all" ? "" : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">المجموعة</Label>
              <Select value={filters.group_id} onValueChange={(v) => setFilters({ ...filters, group_id: v === "all" ? "" : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">المستودع</Label>
              <Select value={filters.warehouse_id} onValueChange={(v) => setFilters({ ...filters, warehouse_id: v === "all" ? "" : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">من تاريخ</Label>
              <Input className="h-9" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input className="h-9" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
              </div>
              <Button size="sm" onClick={generateReport}><Search className="h-4 w-4 ml-1" /> بحث</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <>
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          {hasForeignCurrency && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-amber-700">عرض بالعملة المحلية</span>
              <button onClick={() => setShowInLocal(!showInLocal)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showInLocal ? "bg-primary" : "bg-muted-foreground/30"}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showInLocal ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
          )}
          <div className="mr-auto">
          <ExportButtons
            columns={[
              {key:"date",label:"التاريخ"},{key:"number",label:"الرقم"},{key:"type",label:"نوع العملية"},
              {key:"product_name",label:"الصنف"},{key:"quantity",label:"الكمية"},{key:"price",label:"السعر"},{key:"warehouse",label:"المستودع"}
            ]}
            data={results} title="حركة المواد" filename="product-movement" printId="product-movement-table"
          />
          </div>
        </div>
        <div id="product-movement-table" className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right text-xs">التاريخ</TableHead>
                <TableHead className="text-right text-xs">الرقم</TableHead>
                <TableHead className="text-right text-xs">نوع العملية</TableHead>
                <TableHead className="text-right text-xs">الصنف</TableHead>
                <TableHead className="text-right text-xs">الكمية</TableHead>
                {!showInLocal && hasForeignCurrency && <TableHead className="text-right text-xs">العملة</TableHead>}
                <TableHead className="text-right text-xs">{showInLocal && hasForeignCurrency ? "السعر (محلي)" : "السعر"}</TableHead>
                <TableHead className="text-right text-xs">المستودع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.date}</TableCell>
                  <TableCell className="text-sm">{r.number}</TableCell>
                  <TableCell className="text-sm">{r.type}</TableCell>
                  <TableCell className="text-sm font-medium">{r.product_name}</TableCell>
                  <TableCell className="text-sm">{r.quantity}</TableCell>
                  {!showInLocal && hasForeignCurrency && <TableCell className="text-sm text-muted-foreground">{r.currency || "-"}</TableCell>}
                  <TableCell className="text-sm">
                    {(() => { const p = showInLocal && hasForeignCurrency ? r.priceLocal : r.price; return typeof p === "number" ? p.toLocaleString() : p; })()}
                  </TableCell>
                  <TableCell className="text-sm">{r.warehouse}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      ) : (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          حدد معايير البحث واضغط بحث لعرض التقرير
        </div>
      )}
    </div>
  );
}