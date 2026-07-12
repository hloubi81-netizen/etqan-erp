import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";

export default function AIChatbot() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/ai-copilot")}
      className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-blue-600 hover:bg-blue-700 hover:scale-110"
      title="مساعد ETQAN الذكي"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </button>
  );
}