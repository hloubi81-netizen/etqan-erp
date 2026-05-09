import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { Printer, Download, RotateCcw } from 'lucide-react';
import BarcodePrinter from '@/components/barcode/BarcodePrinter';
import JsBarcode from 'jsbarcode';

export default function BarcodeManagement() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter((p) =>
      p.name.includes(search) || p.item_code.includes(search) || p.barcode?.includes(search)
    );
    setFilteredProducts(filtered);
  }, [search, products]);

  const fetchProducts = async () => {
    try {
      const data = await base44.entities.Product.list();
      setProducts(data || []);
    } catch (error) {
      console.error('خطأ في تحميل المنتجات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    let html = '<html><head><title>طباعة الباركود</title>';
    html += '<style>body { font-family: Arial; margin: 10px; direction: rtl; }';
    html += '.barcode-item { display: inline-block; margin: 10px; page-break-inside: avoid; }';
    html += 'svg { max-width: 100%; height: auto; }</style></head><body>';

    const selected = products.filter((p) => selectedProducts.has(p.id));
    selected.forEach((product) => {
      html += `<div class="barcode-item">`;
      html += `<svg id="barcode-${product.id}"></svg>`;
      html += `<p style="margin: 5px 0; font-size: 12px;"><strong>${product.name}</strong></p>`;
      html += `<p style="margin: 5px 0; font-size: 10px;">الكود: ${product.item_code}</p>`;
      html += `</div>`;
    });

    html += '</body></html>';
    printWindow.document.write(html);

    setTimeout(() => {
      selected.forEach((product) => {
        const barcode = product.barcode || product.item_code;
        JsBarcode(`#barcode-${product.id}`, barcode, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
        });
      });
      printWindow.print();
    }, 1000);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="إدارة الباركود"
        subtitle="توليد وطباعة ملصقات الباركود للمنتجات"
        onAdd={fetchProducts}
        addLabel="تحديث"
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>البحث والاختيار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>بحث عن منتج</Label>
            <Input
              placeholder="ابحث بالاسم أو الرمز أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              disabled={selectedProducts.size === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              طباعة ({selectedProducts.size})
            </Button>
            <Button
              onClick={() => setSelectedProducts(new Set())}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              مسح
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المنتجات ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد منتجات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
                          } else {
                            setSelectedProducts(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="text-right p-3">المنتج</th>
                    <th className="text-right p-3">الرمز</th>
                    <th className="text-right p-3">الباركود</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                        />
                      </td>
                      <td className="p-3">{product.name}</td>
                      <td className="p-3 text-sm">{product.item_code}</td>
                      <td className="p-3">
                        <code className="text-xs bg-muted p-1 rounded">
                          {product.barcode || product.item_code}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}