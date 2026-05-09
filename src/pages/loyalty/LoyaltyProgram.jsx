import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoyaltyClients from "@/components/loyalty/LoyaltyClients";
import PromotionsManager from "@/components/loyalty/PromotionsManager";
import PointsSettings from "@/components/loyalty/PointsSettings";
import { Star, Tag, Settings } from "lucide-react";

export default function LoyaltyProgram() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">نظام النقاط والعروض الخاصة</h1>
        <p className="text-sm text-muted-foreground mt-0.5">إدارة نقاط الولاء للعملاء والعروض الترويجية</p>
      </div>

      <Tabs defaultValue="clients" dir="rtl">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="clients" className="gap-1.5">
            <Star className="h-4 w-4" /> نقاط العملاء
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-1.5">
            <Tag className="h-4 w-4" /> العروض الخاصة
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" /> الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <LoyaltyClients />
        </TabsContent>
        <TabsContent value="promotions" className="mt-4">
          <PromotionsManager />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <PointsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}