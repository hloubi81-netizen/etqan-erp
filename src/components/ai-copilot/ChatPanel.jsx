import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في نظام ETQAN للمحاسبة والإدارة المالية. تجيب بالعربية بإجابات دقيقة وواضحة.
يمكنك مساعدة المستخدم في: المحاسبة العامة، القيود، الفواتير، المخزون، الرواتب، التقارير المالية، وكل ميزات النظام.
عندما يطلب المستخدم تنفيذ أمر (مثل إنشاء فاتورة أو إضافة موظف)، اشرح له الخطوات بوضوح.`;

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "مرحباً! أنا مساعد ETQAN الذكي 🤖\n\nاكتب لي أي سؤال أو أمر بالعربية أو الإنجليزية — يمكنني مساعدتك في المحاسبة، الفواتير، المخزون، الرواتب، التقارير، وكل ميزات النظام." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.map(m => `${m.role === "user" ? "المستخدم" : "المساعد"}: ${m.content}`).join("\n\n");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\n---\nمحادثة سابقة:\n${history}\n\nأجب على آخر رسالة للمستخدم:`
      });
      setMessages(prev => [...prev, { role: "assistant", content: result }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl border border-gray-200 overflow-hidden" dir="rtl">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              m.role === "user" ? "bg-blue-600" : "bg-gray-200")}>
              {m.role === "user" ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-gray-600" />}
            </div>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-blue-600 text-white rounded-tl-sm"
                : "bg-white text-gray-800 border border-gray-200 rounded-tr-sm shadow-sm")}>
              {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <ReactMarkdown className="prose prose-sm max-w-none">{m.content}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center"><Bot className="h-4 w-4 text-gray-600" /></div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-blue-500" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="اكتب سؤالك أو أمرك هنا..." rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" style={{ maxHeight: 80 }} />
        <button onClick={send} disabled={!input.trim() || loading}
          className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center shrink-0 self-end transition-colors">
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}