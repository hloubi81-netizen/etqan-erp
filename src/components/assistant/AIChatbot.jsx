import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في برنامج ETQAN المحاسبي. تجيب بالعربية فقط بإجابات واضحة وخطوات عملية.

معلوماتك عن البرنامج:

**القيود اليومية:** من القائمة الجانبية > السندات > "سند قيد" > اختر نوع القيد > أدخل التاريخ والحسابات (مدين/دائن) > أدخل المبالغ > احفظ أو أرحّل.

**فاتورة المبيعات:** من القائمة > الفواتير > مبيعات > إضافة جديدة > اختر نمط الفاتورة > أضف العميل والمنتجات والكميات والأسعار > احفظ أو أرحّل.

**فاتورة المشتريات:** من القائمة > الفواتير > مشتريات > إضافة جديدة > اختر المورد والمنتجات > أدخل الكميات والأسعار > احفظ.

**شجرة الحسابات:** من القائمة > الحسابات > يمكنك إضافة حسابات رئيسية وفرعية > حدد طبيعة الحساب (مدين/دائن) والحساب الختامي.

**المخازن والمنتجات:** من القائمة > المخازن لإدارة المخازن، ومن المنتجات لإضافة المنتجات وتحديد المجموعات والأسعار ووحدات القياس.

**التقارير المالية:** من القائمة > التقارير > ستجد ميزان المراجعة، قائمة الدخل، الميزانية العمومية، التدفقات النقدية، وتقارير الحركة.

**الرواتب والموظفين:** من القائمة > الموارد البشرية > الموظفون لإدارة بيانات الموظفين، والرواتب لإنشاء كشوف الرواتب الشهرية.

**الأصول الثابتة:** من القائمة > الأصول > إضافة أصل جديد > أدخل التكلفة وطريقة الإهلاك والعمر الإنتاجي ليحسب النظام الإهلاك تلقائياً.

**مراكز التكلفة:** من القائمة > مراكز التكلفة > يمكنك ربط الفواتير والسندات بمراكز تكلفة لمتابعة أداء الأقسام.

**العملاء والموردون (CRM):** من القائمة > CRM > إدارة جهات الاتصال والفرص والأنشطة مع العملاء والموردين.

**الفروع:** من القائمة > الفروع > إضافة فروع جديدة وتعيين المستخدمين لكل فرع لضمان عزل البيانات.

أجب بشكل موجز ومفيد ومنظم. استخدم نقاط ومراحل واضحة.`;

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "مرحباً! أنا مساعد ETQAN الذكي 🤖\n\nيمكنني مساعدتك في:\n• إنشاء الفواتير والقيود\n• إدارة الحسابات والمخازن\n• استخراج التقارير المالية\n• إدارة الموظفين والرواتب\n\nكيف يمكنني مساعدتك اليوم؟"
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