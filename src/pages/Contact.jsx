import { Mail, Phone, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Contact() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">تواصل معنا</h1>
      <p className="text-muted-foreground">
        نحن هنا للمساعدة. يمكنك التواصل معنا عبر أي من القنوات التالية وسنرد عليك في أقرب وقت ممكن.
      </p>

      <div className="grid gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">البريد الإلكتروني</p>
              <a href="mailto:support@etqan-erp.com" className="text-primary text-sm hover:underline">
                support@etqan-erp.com
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">الهاتف / واتساب</p>
              <a href="tel:+966500000000" className="text-green-600 text-sm hover:underline">
                +966 50 000 0000
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">الدعم الفني</p>
              <p className="text-muted-foreground text-sm">متاح من الأحد إلى الخميس، 9 صباحاً – 5 مساءً</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}