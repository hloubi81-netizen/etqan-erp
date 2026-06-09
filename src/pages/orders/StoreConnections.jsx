import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Link2, Unlink, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WIX_CONNECTOR_ID = "6a28780b122f1605de605504";

export default function StoreConnections() {
  const [connections, setConnections] = useState([]);
  const [wixConnected, setWixConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Shopify form state
  const [shopifyUrl, setShopifyUrl] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  
  // WooCommerce form state
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");

  useEffect(() => {
    loadConnections();
    checkWixConnection();
  }, []);

  async function checkWixConnection() {
    try {
      const res = await base44.functions.invoke("checkWixConnection", {});
      setWixConnected(res.data?.connected || false);
    } catch (error) {
      setWixConnected(false);
    }
  }

  async function loadConnections() {
    try {
      const data = await base44.entities.StoreConnection.list();
      setConnections(data);
      
      const shopify = data.find(c => c.platform === "Shopify");
      if (shopify) {
        setShopifyUrl(shopify.store_url || "");
        setShopifyToken(shopify.access_token || "");
      }
      
      const woo = data.find(c => c.platform === "WooCommerce");
      if (woo) {
        setWooUrl(woo.store_url || "");
        setWooKey(woo.api_key || "");
        setWooSecret(woo.api_secret || "");
      }
    } catch (error) {
      toast.error("فشل في تحميل بيانات المتاجر");
    } finally {
      setLoading(false);
    }
  }

  const handleWixConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(WIX_CONNECTOR_ID);
      const popup = window.open(url, "_blank", "width=600,height=700");
      
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkWixConnection();
          toast.success("تم التحقق من حالة ربط Wix");
        }
      }, 500);
    } catch (error) {
      toast.error("فشل في بدء عملية الربط");
    }
  };

  const handleWixDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(WIX_CONNECTOR_ID);
      setWixConnected(false);
      toast.success("تم إلغاء ربط متجر Wix");
    } catch (error) {
      toast.error("فشل في إلغاء الربط");
    }
  };

  const handleSaveShopify = async () => {
    if (!shopifyUrl || !shopifyToken) {
      toast.error("يرجى إدخال جميع بيانات Shopify");
      return;
    }

    try {
      const existing = connections.find(c => c.platform === "Shopify");
      const data = {
        platform: "Shopify",
        store_url: shopifyUrl,
        access_token: shopifyToken,
        status: "متصل"
      };

      if (existing) {
        await base44.entities.StoreConnection.update(existing.id, data);
      } else {
        await base44.entities.StoreConnection.create(data);
      }
      toast.success("تم حفظ بيانات Shopify بنجاح");
      loadConnections();
    } catch (error) {
      toast.error("فشل في حفظ البيانات");
    }
  };

  const handleSaveWoo = async () => {
    if (!wooUrl || !wooKey || !wooSecret) {
      toast.error("يرجى إدخال جميع بيانات WooCommerce");
      return;
    }

    try {
      const existing = connections.find(c => c.platform === "WooCommerce");
      const data = {
        platform: "WooCommerce",
        store_url: wooUrl,
        api_key: wooKey,
        api_secret: wooSecret,
        status: "متصل"
      };

      if (existing) {
        await base44.entities.StoreConnection.update(existing.id, data);
      } else {
        await base44.entities.StoreConnection.create(data);
      }
      toast.success("تم حفظ بيانات WooCommerce بنجاح");
      loadConnections();
    } catch (error) {
      toast.error("فشل في حفظ البيانات");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader 
        title="ربط المتاجر الإلكترونية" 
        subtitle="قم بإدارة حساباتك وربط متاجرك لجلب الطلبات تلقائياً"
      />

      <Tabs defaultValue="wix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wix">Wix</TabsTrigger>
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
          <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
        </TabsList>

        <TabsContent value="wix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded font-bold">W</span>
                ربط متجر Wix
              </CardTitle>
              <CardDescription>اربط متجرك المبني على منصة Wix بضغطة زر</CardDescription>
            </CardHeader>
            <CardContent>
              {wixConnected ? (
                <div className="space-y-4">
                  <Alert className="bg-success/10 border-success/20 text-success-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>المتجر متصل</AlertTitle>
                    <AlertDescription>
                      تم ربط متجر Wix الخاص بك بنجاح. سيتم جلب الطلبات منه تلقائياً.
                    </AlertDescription>
                  </Alert>
                  <Button variant="destructive" onClick={handleWixDisconnect} className="gap-2">
                    <Unlink className="h-4 w-4" />
                    إلغاء الربط
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-center py-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg">لم تقم بربط متجر Wix بعد</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                    اضغط على الزر أدناه للسماح لنا بالوصول الآمن لطلبات متجرك وجلبها إلى النظام.
                  </p>
                  <Button onClick={handleWixConnect} className="gap-2 min-w-48 bg-blue-600 hover:bg-blue-700">
                    <Link2 className="h-4 w-4" />
                    ربط حساب Wix
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopify">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded font-bold">S</span>
                إعدادات Shopify
              </CardTitle>
              <CardDescription>قم بإدخال بيانات تطبيق Shopify المخصص للربط</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopify-url">رابط المتجر</Label>
                <Input 
                  id="shopify-url" 
                  placeholder="مثال: mystore.myshopify.com" 
                  value={shopifyUrl}
                  onChange={e => setShopifyUrl(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopify-token">رمز الوصول (Admin API Access Token)</Label>
                <Input 
                  id="shopify-token" 
                  type="password"
                  placeholder="shpat_..." 
                  value={shopifyToken}
                  onChange={e => setShopifyToken(e.target.value)}
                  dir="ltr"
                />
              </div>
              <Button onClick={handleSaveShopify} className="gap-2 bg-green-600 hover:bg-green-700 w-full mt-4">
                <Save className="h-4 w-4" />
                حفظ بيانات Shopify
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="woocommerce">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded font-bold">W</span>
                إعدادات WooCommerce
              </CardTitle>
              <CardDescription>قم بإنشاء مفاتيح API من إعدادات WooCommerce</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="woo-url">رابط الموقع (الرئيسي)</Label>
                <Input 
                  id="woo-url" 
                  placeholder="https://mystore.com" 
                  value={wooUrl}
                  onChange={e => setWooUrl(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-key">مفتاح المستهلك (Consumer Key)</Label>
                <Input 
                  id="woo-key" 
                  placeholder="ck_..." 
                  value={wooKey}
                  onChange={e => setWooKey(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-secret">السر الخاص بالمستهلك (Consumer Secret)</Label>
                <Input 
                  id="woo-secret" 
                  type="password"
                  placeholder="cs_..." 
                  value={wooSecret}
                  onChange={e => setWooSecret(e.target.value)}
                  dir="ltr"
                />
              </div>
              <Button onClick={handleSaveWoo} className="gap-2 bg-purple-600 hover:bg-purple-700 w-full mt-4">
                <Save className="h-4 w-4" />
                حفظ بيانات WooCommerce
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}