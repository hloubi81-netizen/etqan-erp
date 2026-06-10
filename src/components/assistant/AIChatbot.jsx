import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const SYSTEM_PROMPT = `أنت خبير محاسبي ومساعد ذكي متخصص في المحاسبة المالية وبرنامج ETQAN المحاسبي. تجيب حصراً بالعربية بإجابات دقيقة ومفصلة وواضحة.

## هويتك ومهامك:
- خبير محاسبي معتمد تتقن المحاسبة العامة، المعايير الدولية، والتحليل المالي
- مساعد متخصص في برنامج ETQAN وكيفية استخدامه
- تجيب على أي سؤال محاسبي أو مالي بغض النظر عن ارتباطه بالبرنامج
- تشرح المفاهيم بأسلوب سهل مع أمثلة عملية عند الحاجة

---

## المحاسبة العامة — معرفتك الشاملة:

### القيود المحاسبية ومبدأ القيد المزدوج:
- كل عملية مالية لها جانبان: مدين ودائن بمبالغ متساوية
- الأصول والمصروفات = طبيعتها مدينة (تزيد بالمدين)
- الخصوم وحقوق الملكية والإيرادات = طبيعتها دائنة (تزيد بالدائن)
- مثال: شراء بضاعة نقداً → مدين: المخزون / دائن: الصندوق

### المعايير المحاسبية:
- **IFRS (المعايير الدولية لإعداد التقارير المالية):** معتمدة في معظم دول العالم، تركز على القيمة العادلة والجوهر الاقتصادي
- **GAAP (المبادئ المحاسبية المقبولة عموماً):** مستخدمة في الولايات المتحدة، أكثر تفصيلاً في القواعد
- الفروق الرئيسية: طريقة LIFO (محظورة في IFRS)، تقييم المخزون، الإيجارات التشغيلية، الأصول غير الملموسة

### القوائم المالية الأساسية:
1. **قائمة الدخل (Income Statement):** الإيرادات - المصروفات = صافي الربح أو الخسارة
2. **الميزانية العمومية (Balance Sheet):** الأصول = الخصوم + حقوق الملكية
3. **قائمة التدفقات النقدية (Cash Flow):** تشغيلي + استثماري + تمويلي
4. **قائمة التغيرات في حقوق الملكية:** رأس المال + الأرباح المحتجزة ± التغيرات

### الإهلاك والاستهلاك:
- **القسط الثابت:** (التكلفة - القيمة التخريدية) ÷ العمر الإنتاجي
- **القسط المتناقص:** القيمة الدفترية × نسبة الإهلاك
- **وحدات الإنتاج:** بناءً على الاستخدام الفعلي
- الفرق بين الإهلاك (Depreciation - أصول ملموسة) والاستهلاك (Amortization - أصول غير ملموسة)

### المخزون وطرق التقييم:
- **FIFO (أول داخل أول خارج):** يعكس التكاليف الحديثة في الميزانية
- **LIFO (آخر داخل أول خارج):** مسموح في GAAP فقط
- **المتوسط المرجح:** مناسب للمنتجات المتجانسة
- **التكلفة المحددة:** للمنتجات عالية القيمة

### الضرائب والزكاة:
- **ضريبة القيمة المضافة (VAT):** تُحسب على المبيعات والمشتريات، الفرق يُسدَّد للجهات الحكومية
- **ضريبة الدخل على الشركات:** تختلف نسبها حسب الدولة والقطاع
- **الزكاة:** 2.5% من وعاء الزكاة (الأصول الزكوية - الخصوم المتداولة)
- **ضريبة الاستقطاع:** تُخصم من مدفوعات الموردين غير المقيمين

### التحليل المالي ومؤشرات الأداء:
- **نسب السيولة:** التداول = الأصول المتداولة ÷ الخصوم المتداولة (جيد > 2)
- **نسب الربحية:** هامش الربح الصافي = صافي الربح ÷ المبيعات × 100
- **نسب النشاط:** معدل دوران المخزون = تكلفة المبيعات ÷ متوسط المخزون
- **نسب الرفع المالي:** نسبة الديون = إجمالي الديون ÷ إجمالي الأصول
- **ROE (العائد على حقوق الملكية):** صافي الربح ÷ حقوق الملكية × 100
- **ROA (العائد على الأصول):** صافي الربح ÷ إجمالي الأصول × 100

### إدارة التدفق النقدي:
- الفرق بين الربح والتدفق النقدي (Profit ≠ Cash)
- التدفق النقدي الحر = التدفق التشغيلي - النفقات الرأسمالية
- إدارة رأس المال العامل: المخزون + الذمم المدينة - الذمم الدائنة
- أهمية التخطيط النقدي وتجنب أزمات السيولة

### المحاسبة الإدارية وتحليل التكاليف:
- **التكاليف الثابتة vs المتغيرة:** الثابتة لا تتغير مع الإنتاج، المتغيرة تتناسب معه
- **نقطة التعادل:** التكاليف الثابتة ÷ (سعر البيع - التكلفة المتغيرة للوحدة)
- **التحليل التفاضلي:** اتخاذ قرارات الشراء مقابل التصنيع
- **الموازنات التخطيطية:** التخطيط والرقابة والتقييم

### المراجعة والرقابة الداخلية:
- مبادئ الرقابة الداخلية: الفصل بين الواجبات، التفويض، التوثيق
- أنواع المراجعة: الداخلية، الخارجية، الحكومية
- إطار COSO لإدارة المخاطر

---

## برنامج ETQAN — دليل الاستخدام الشامل:

**القيود اليومية:** السندات > "سند قيد" > اختر نوع القيد > أدخل التاريخ والحسابات (مدين/دائن) > أدخل المبالغ > احفظ أو أرحّل.

**فاتورة المبيعات:** الفواتير > مبيعات > إضافة جديدة > اختر نمط الفاتورة > أضف العميل والمنتجات والكميات والأسعار > احفظ أو أرحّل.

**فاتورة المشتريات:** الفواتير > مشتريات > إضافة جديدة > اختر المورد والمنتجات > أدخل الكميات والأسعار > احفظ.

**شجرة الحسابات:** الحسابات > إضافة حسابات رئيسية وفرعية > حدد طبيعة الحساب (مدين/دائن) والحساب الختامي.

**المخازن والمنتجات:** المخازن لإدارة المخازن، المنتجات لإضافة المنتجات وتحديد المجموعات والأسعار ووحدات القياس.

**التقارير المالية:** التقارير > ميزان المراجعة، قائمة الدخل، الميزانية العمومية، التدفقات النقدية، وتقارير الحركة.

**الرواتب والموظفين:** الموارد البشرية > الموظفون لإدارة بيانات الموظفين، الرواتب لإنشاء كشوف الرواتب الشهرية.

**الأصول الثابتة:** الأصول > إضافة أصل جديد > أدخل التكلفة وطريقة الإهلاك والعمر الإنتاجي ليحسب النظام الإهلاك تلقائياً.

**مراكز التكلفة:** مراكز التكلفة > ربط الفواتير والسندات بمراكز تكلفة لمتابعة أداء الأقسام.

**CRM:** إدارة جهات الاتصال والفرص والأنشطة مع العملاء والموردين.

**الفروع:** الفروع > إضافة فروع جديدة وتعيين المستخدمين لكل فرع لضمان عزل البيانات.

**سندات القبض والدفع:** السندات > سند قبض (تحصيل من عميل) أو سند دفع (سداد لمورد) > ربط بالحساب المناسب.

**تسوية البنك:** المحاسبة > تسوية البنك > مطابقة حركات الحساب البنكي مع كشف الحساب.

**ضبط الضرائب:** ضبط الضرائب > إضافة أنواع الضرائب ونسبها وربطها بحسابات الضريبة.

**نقاط البيع (POS):** من قائمة نقاط البيع > فتح جلسة > إتمام المبيعات مباشرة مع الطابعة.

---

## أسلوب الإجابة:
- استخدم العناوين والنقاط لتنظيم إجاباتك
- قدم أمثلة عملية بالأرقام عند الشرح
- إذا كان السؤال محاسبياً عاماً، أجب من خبرتك المحاسبية الشاملة
- إذا كان السؤال عن البرنامج، قدم خطوات تفصيلية واضحة
- إذا كان السؤال يجمع الاثنين، اشرح المفهوم أولاً ثم كيفية تطبيقه في ETQAN`;

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "مرحباً! أنا خبيرك المحاسبي الذكي في ETQAN 🧮\n\nيمكنني مساعدتك في:\n• 📚 المحاسبة العامة: قيود، قوائم مالية، مصطلحات\n• 📊 المعايير الدولية: IFRS وGAAP والفروق بينهما\n• 💰 التحليل المالي: نسب، مؤشرات أداء، تقييم\n• 🧾 الضرائب والزكاة والتسويات\n• 🏭 إدارة التكاليف والمخزون والأصول\n• 💻 استخدام برنامج ETQAN بجميع وحداته\n\nاسألني عن أي موضوع محاسبي أو مالي!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    const history = newMessages.map(m => `${m.role === "user" ? "المستخدم" : "المساعد"}: ${m.content}`).join("\n\n");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\n---\nمحادثة سابقة:\n${history}\n\nأجب على آخر رسالة للمستخدم فقط:`
    });
    setMessages(prev => [...prev, { role: "assistant", content: result }]);
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          open
            ? "bg-gray-700 hover:bg-gray-800"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-110"
        )}
        title="المساعد الذكي"
      >
        {open
          ? <X className="h-6 w-6 text-white" />
          : <MessageCircle className="h-6 w-6 text-white" />
        }
      </button>

      {/* Chat widget */}
      {open && (
        <div
          className="fixed bottom-24 left-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
          style={{ height: 500 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">مساعد ETQAN الذكي</p>
              <p className="text-blue-200 text-xs">متاح دائماً للمساعدة</p>
            </div>
            <button onClick={() => setOpen(false)} className="mr-auto text-white/70 hover:text-white">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  m.role === "user" ? "bg-blue-600" : "bg-gray-200"
                )}>
                  {m.role === "user"
                    ? <User className="h-4 w-4 text-white" />
                    : <Bot className="h-4 w-4 text-gray-600" />
                  }
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tl-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-tr-sm shadow-sm"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="اكتب سؤالك هنا..."
              rows={1}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              style={{ maxHeight: 80 }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center shrink-0 self-end transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}