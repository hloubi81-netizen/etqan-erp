import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, BookOpen, ChevronDown, ChevronRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SECTIONS = [
  {
    id: "intro",
    title: "مقدمة عن النظام",
    icon: "🏢",
    content: [
      {
        subtitle: "ما هو نظام ETQAN ERP؟",
        text: "نظام ETQAN ERP هو نظام متكامل لإدارة الأعمال يغطي جميع احتياجات المؤسسات التجارية من محاسبة ومخزون ومبيعات ومشتريات وموارد بشرية وإدارة علاقات العملاء.",
      },
      {
        subtitle: "متطلبات الاستخدام",
        text: "يعمل النظام عبر المتصفح ولا يحتاج تثبيتاً. يُنصح باستخدام متصفح Chrome أو Edge بأحدث إصدار، وسرعة إنترنت لا تقل عن 5 ميغابت.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "لوحة التحكم الرئيسية",
    icon: "📊",
    content: [
      {
        subtitle: "نظرة عامة",
        text: "تعرض لوحة التحكم ملخصاً فورياً لأداء الشركة: إجمالي المبيعات، المشتريات، الأرباح، عدد المنتجات، والمستحقات.",
      },
      {
        subtitle: "بطاقات الإحصاء",
        text: "كل بطاقة في الصفحة الرئيسية قابلة للنقر لفتح التقرير التفصيلي المقابل. يمكنك تحديث البيانات بالضغط على زر التحديث.",
      },
      {
        subtitle: "التنقل السريع",
        text: "يوجد في أسفل الصفحة الرئيسية روابط وصول سريع لأبرز الوحدات: الفواتير، المستودع، التقارير، نقطة البيع.",
      },
    ],
  },
  {
    id: "inventory",
    title: "المخزون والمنتجات",
    icon: "📦",
    content: [
      {
        subtitle: "إضافة منتج جديد",
        text: "من القائمة الجانبية: المخزون والمنتجات ← المنتجات ← إضافة منتج. أدخل رمز الصنف، الاسم، السعر، والوحدات. يمكن إضافة وحدات متعددة بمعاملات تحويل (مثل كرتون = 12 قطعة). لمطاعم نقاط البيع، حدد قسم الطباعة لكل منتج.",
      },
      {
        subtitle: "المجموعات",
        text: "قبل إضافة المنتجات، أنشئ مجموعات لتصنيف الأصناف (مثل: مشروبات، وجبات، مواد خام). يمكن إنشاء مجموعات فرعية متعددة المستويات.",
      },
      {
        subtitle: "المستودعات",
        text: "أنشئ مستودعاً أو أكثر من: المخزون ← المستودعات. كل مستودع مستقل في تتبع الكميات. يمكن ربط مستودع بفرع معين.",
      },
      {
        subtitle: "جرد المخزون",
        text: "من المخزون ← جرد المخزون، يمكن إنشاء جلسة جرد جديدة، إدخال الكميات الفعلية، ومطابقتها مع الكميات المسجلة في النظام.",
      },
      {
        subtitle: "تنبيهات المخزون",
        text: "حدد حداً أدنى لكل منتج في كل مستودع. سيُنبّهك النظام تلقائياً عند انخفاض الكمية عن الحد المحدد.",
      },
      {
        subtitle: "مناقلات المخزون",
        text: "لنقل كميات بين مستودعين: المخزون ← مناقلات المخزون ← إنشاء مناقلة. حدد المستودع المصدر والوجهة والمنتجات والكميات.",
      },
    ],
  },
  {
    id: "invoices",
    title: "الفواتير والمستندات",
    icon: "🧾",
    content: [
      {
        subtitle: "أنواع الفواتير",
        text: "يدعم النظام: فواتير المبيعات، فواتير المشتريات، مرتجع مبيعات، مرتجع مشتريات، رصيد أول المدة. كل نوع له نمط (Pattern) يحدد الحسابات المحاسبية والإعدادات.",
      },
      {
        subtitle: "إنشاء فاتورة مبيعات",
        text: "المبيعات ← فواتير المبيعات ← إضافة فاتورة. اختر العميل، المستودع، النمط، أضف البنود، حدد طريقة الدفع، ثم احفظ أو اعتمد الفاتورة. الفاتورة المعتمدة تؤثر على المخزون والحسابات تلقائياً.",
      },
      {
        subtitle: "أنماط الفواتير",
        text: "من المحاسبة ← أنماط الفواتير، أنشئ نمطاً لكل نوع فاتورة يحدد: حساب المبيعات/المشتريات، حساب الخصم، المستودع الافتراضي، نسبة الضريبة، مركز التكلفة.",
      },
    ],
  },
  {
    id: "accounting",
    title: "المحاسبة والقيود",
    icon: "📒",
    content: [
      {
        subtitle: "دليل الحسابات",
        text: "من المحاسبة ← دليل الحسابات، يمكن إنشاء شجرة حسابات متعددة المستويات. كل حساب له: رقم، اسم، طبيعة (مدين/دائن)، الحساب الختامي، والقائمة المالية.",
      },
      {
        subtitle: "السندات",
        text: "السند يُسجّل حركة مالية مباشرة في دفتر اليومية. الأنواع: سند قبض (استلام مبالغ)، سند صرف (دفع مبالغ)، قيد يومية (حركات محاسبية معقدة).",
      },
      {
        subtitle: "قواعد اليومية التلقائية",
        text: "من المحاسبة ← قواعد اليومية التلقائية، حدد قواعد لترحيل القيود تلقائياً عند حفظ الفواتير، مما يوفر الوقت ويضمن الدقة المحاسبية.",
      },
      {
        subtitle: "التسوية البنكية",
        text: "من المحاسبة ← التسويات البنكية، قابل بين كشف الحساب البنكي والقيود المسجلة في النظام لضمان التطابق.",
      },
    ],
  },
  {
    id: "financial",
    title: "القوائم المالية",
    icon: "📈",
    content: [
      {
        subtitle: "لوحة التحكم المالية",
        text: "تعرض ملخصاً تفاعلياً للأداء المالي مع رسوم بيانية للمبيعات والمصاريف والأرباح خلال فترة زمنية محددة.",
      },
      {
        subtitle: "قائمة الدخل",
        text: "تُظهر الإيرادات، تكلفة المبيعات، المصاريف التشغيلية، وصافي الربح أو الخسارة لفترة محددة.",
      },
      {
        subtitle: "الميزانية العمومية",
        text: "تُظهر الأصول (المتداولة وغير المتداولة)، الخصوم، وحقوق الملكية في تاريخ محدد.",
      },
      {
        subtitle: "التدفقات النقدية",
        text: "تتتبع حركات النقد من الأنشطة التشغيلية والاستثمارية والتمويلية.",
      },
    ],
  },
  {
    id: "pos",
    title: "نقطة البيع (POS)",
    icon: "🛒",
    content: [
      {
        subtitle: "فتح شاشة البيع",
        text: "من المبيعات ← شاشة البيع. ابحث عن المنتج بالاسم أو الكود أو امسح الباركود. انقر على المنتج لإضافته للسلة.",
      },
      {
        subtitle: "ماسح الباركود",
        text: "انقر على أيقونة الماسح في خانة البحث لتفعيل وضع المسح، ثم امسح الباركود مباشرة. سيُضاف المنتج تلقائياً.",
      },
      {
        subtitle: "إتمام البيع",
        text: "بعد إضافة المنتجات: أدخل اسم العميل (اختياري)، الخصم، طريقة الدفع، المبلغ المدفوع، ثم اضغط 'إتمام البيع'.",
      },
      {
        subtitle: "الطباعة على الأقسام",
        text: "عند إتمام الطلب، يطبع النظام تلقائياً ورقة طلب لكل قسم (مثل: المطبخ، البار) وإيصالاً كاملاً للعميل. أعدّ الطابعات من الإعدادات ← نقطة البيع.",
      },
      {
        subtitle: "إعداد طابعات الأقسام",
        text: "من الإعدادات ← نقطة البيع ← إدارة طابعات الأقسام: أضف طابعة لكل قسم بإدخال عنوان IP والمنفذ واسم القسم. حدد لكل منتج قسم الطباعة الخاص به من صفحة المنتجات.",
      },
    ],
  },
  {
    id: "hr",
    title: "الموارد البشرية",
    icon: "👥",
    content: [
      {
        subtitle: "إضافة موظف",
        text: "من الموارد البشرية ← الموظفون ← إضافة موظف. أدخل البيانات الأساسية: الاسم، الرقم الوظيفي، القسم، الراتب الأساسي، البدلات، الاستقطاعات الثابتة.",
      },
      {
        subtitle: "الحضور والغياب",
        text: "سجّل الحضور اليومي من الموارد البشرية ← الحضور والغياب. يمكن تسجيل الوقت الإضافي وأيام الغياب لكل موظف.",
      },
      {
        subtitle: "الرواتب",
        text: "من الموارد البشرية ← الرواتب: توليد الرواتب تلقائياً بناءً على بيانات الحضور والبدلات والاستقطاعات. يمكن مراجعة كل راتب قبل الاعتماد.",
      },
      {
        subtitle: "طلبات الإجازات",
        text: "يتقدم الموظف بطلب إجازة، يمر بمراحل الموافقة قبل التسجيل الرسمي. يتوفر تقرير بأرصدة الإجازات لكل موظف.",
      },
    ],
  },
  {
    id: "reports",
    title: "التقارير والتحليلات",
    icon: "📋",
    content: [
      {
        subtitle: "تقارير الحركة",
        text: "تشمل: حركة المنتجات (مبيعات، مشتريات، إرجاع)، حركة العملاء، حركة الموردين. يمكن التصفية بالتاريخ والمستودع والمنتج.",
      },
      {
        subtitle: "كشف الحساب",
        text: "من التقارير ← كشف حساب عميل/مورد: اختر الحساب والفترة لعرض جميع الحركات والرصيد الحالي.",
      },
      {
        subtitle: "ميزان المراجعة",
        text: "يُظهر أرصدة جميع الحسابات في فترة محددة. أداة أساسية للتحقق من توازن القيود المحاسبية.",
      },
      {
        subtitle: "التقرير الضريبي",
        text: "يحسب ضريبة القيمة المضافة (VAT) مع دعم متطلبات ZATCA السعودية و ETA المصرية. يتضمن ملخص ضريبي شهري وجدول تفصيلي للفواتير.",
      },
      {
        subtitle: "التقارير المخصصة",
        text: "من التقارير ← التقارير المخصصة: أنشئ تقارير مخصصة باختيار الجدول، الحقول، الفلاتر، وترتيب البيانات.",
      },
      {
        subtitle: "تصدير التقارير",
        text: "جميع التقارير قابلة للتصدير بصيغ Excel وPDF عبر أزرار التصدير في كل صفحة.",
      },
    ],
  },
  {
    id: "crm",
    title: "إدارة علاقات العملاء",
    icon: "🤝",
    content: [
      {
        subtitle: "جهات الاتصال",
        text: "سجّل بيانات العملاء والموردين مع معلومات الاتصال الكاملة وتاريخ التعاملات.",
      },
      {
        subtitle: "الفرص التجارية",
        text: "تتبع الفرص التجارية المحتملة عبر مراحل: تواصل أولي ← عرض سعر ← تفاوض ← مكسوبة/خسارة. كل فرصة لها قيمة متوقعة ونسبة احتمال.",
      },
    ],
  },
  {
    id: "loyalty",
    title: "نظام النقاط والعروض",
    icon: "⭐",
    content: [
      {
        subtitle: "برنامج الولاء",
        text: "يمنح العملاء نقاطاً مقابل كل عملية شراء. الأوزان: برونزي → فضي → ذهبي → بلاتيني. يمكن استبدال النقاط بخصومات على الفواتير.",
      },
      {
        subtitle: "إعداد النقاط",
        text: "من النقاط والعروض ← إعدادات النقاط: حدد عدد النقاط لكل وحدة عملة، قيمة النقطة، الحد الأدنى للاستبدال، وحدود كل مستوى.",
      },
      {
        subtitle: "العروض الترويجية",
        text: "أنشئ عروضاً بأنواع متعددة: خصم بنسبة، خصم بمبلغ ثابت، اشترِ X واحصل على Y مجاناً. يمكن تحديد فترة العرض والمنتجات المشمولة.",
      },
    ],
  },
  {
    id: "settings",
    title: "الإعدادات",
    icon: "⚙️",
    content: [
      {
        subtitle: "بيانات الشركة",
        text: "من الإعدادات ← بيانات الشركة: أدخل اسم الشركة، الهاتف، البريد، الرقم الضريبي، السجل التجاري، والعنوان.",
      },
      {
        subtitle: "إعدادات نقطة البيع",
        text: "من الإعدادات ← نقطة البيع: حدد اسم الكاشير، نسبة الضريبة، أقصى خصم مسموح، وملاحظة الإيصال. كذلك إعداد طابعات الأقسام.",
      },
      {
        subtitle: "الفاتورة الإلكترونية",
        text: "من الإعدادات ← الفاتورة الإلكترونية: فعّل الربط بهيئة الضرائب (ZATCA للسعودية أو ETA لمصر) وأدخل بيانات الاعتماد.",
      },
      {
        subtitle: "النسخ الاحتياطي",
        text: "من الإعدادات ← النسخ الاحتياطي: صدّر جميع بيانات النظام كملف JSON للاحتفاظ بنسخة احتياطية أو نقل البيانات.",
      },
    ],
  },
  {
    id: "tips",
    title: "نصائح وأفضل الممارسات",
    icon: "💡",
    content: [
      {
        subtitle: "البدء السليم",
        text: "الترتيب الموصى به لإعداد النظام: (1) بيانات الشركة، (2) دليل الحسابات، (3) مراكز التكلفة، (4) المستودعات، (5) المجموعات، (6) المنتجات، (7) الحسابات (عملاء/موردين)، (8) رصيد أول المدة.",
      },
      {
        subtitle: "الاختصارات المفيدة",
        text: "في نقطة البيع: مسح الباركود بماسح USB يُضيف المنتج فوراً. في الفواتير: اضغط Enter بعد إدخال كمية لالتقاط السطر التالي تلقائياً.",
      },
      {
        subtitle: "الصلاحيات",
        text: "المدير (Admin) يملك صلاحية كاملة. المستخدم العادي يمكن تخصيص صلاحياته من إدارة المستخدمين. يُنصح بعدم مشاركة كلمات المرور.",
      },
      {
        subtitle: "الأداء",
        text: "لضمان سرعة النظام: فعّل الفلاتر عند البحث في قوائم كبيرة. أرشف الفواتير القديمة بشكل دوري. استخدم متصفحاً محدثاً.",
      },
    ],
  },
];

function Section({ section }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-muted/40 hover:bg-muted/70 transition-colors text-right"
      >
        <span className="text-xl">{section.icon}</span>
        <span className="flex-1 font-bold text-sm">{section.title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 py-4 space-y-4 bg-card">
          {section.content.map((item, i) => (
            <div key={i}>
              <h4 className="font-semibold text-sm text-primary mb-1">{item.subtitle}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserGuide() {
  const contentRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  async function exportToPDF() {
    setExporting(true);
    try {
      const el = contentRef.current;
      // توسيع جميع الأقسام مؤقتاً عبر clone
      const clone = el.cloneNode(true);
      clone.style.width = "900px";
      clone.style.position = "absolute";
      clone.style.top = "-9999px";
      clone.style.background = "#fff";
      clone.style.padding = "32px";
      // إزالة أزرار التبديل من النسخة
      clone.querySelectorAll("button").forEach(btn => { btn.style.pointerEvents = "none"; });
      // إظهار جميع المحتويات
      clone.querySelectorAll("[class*='hidden']").forEach(e => { e.style.display = "block"; });
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 10;
      let remaining = imgH;

      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 10, y, imgW, imgH);
        remaining -= (pageH - 20);
        if (remaining > 0) { pdf.addPage(); y = 10 - (imgH - remaining); }
      }

      pdf.save("دليل_استخدام_ETQAN_ERP.pdf");
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  }

  function printGuide() {
    window.print();
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            دليل استخدام النظام
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            ETQAN ERP — الدليل الشامل لجميع وحدات ومزايا النظام
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="secondary">الإصدار v2.0</Badge>
            <Badge variant="outline">آخر تحديث: مايو 2026</Badge>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={printGuide} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button onClick={exportToPDF} disabled={exporting} className="gap-2">
            <FileDown className="h-4 w-4" />
            {exporting ? "جاري التصدير..." : "تصدير PDF"}
          </Button>
        </div>
      </div>

      {/* فهرس المحتويات */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-muted/20">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>📑</span> فهرس المحتويات
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* المحتوى */}
      <div ref={contentRef}>
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id}>
            <Section section={section} />
          </div>
        ))}
      </div>

      {/* تذييل */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <p className="text-sm text-muted-foreground">
          لأي استفسار أو دعم فني، تواصل معنا عبر صفحة{" "}
          <a href="/contact" className="text-primary font-medium hover:underline">تواصل معنا</a>
        </p>
        <p className="text-xs text-muted-foreground mt-1">ETQAN ERP © 2026 — جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}