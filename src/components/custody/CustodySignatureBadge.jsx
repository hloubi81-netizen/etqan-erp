import { ShieldCheck, ShieldOff, Clock } from "lucide-react";

/**
 * يعرض حالة التوقيع الرقمي للعهدة
 */
export default function CustodySignatureBadge({ custody, onClick, showButton = true }) {
  const isSigned = !!custody?.approval_signature;

  if (isSigned) {
    const meta = (() => {
      try { return JSON.parse(custody.signature_meta || "{}"); } catch { return {}; }
    })();
    const signedAt = custody.approved_at
      ? new Date(custody.approved_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })
      : "";

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-1.5 text-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>معتمد من: <strong>{custody.approved_by}</strong>
            {meta.signer_title && <span className="text-green-500"> — {meta.signer_title}</span>}
          </span>
          {signedAt && <span className="text-green-500 mr-1">| {signedAt}</span>}
        </div>
        {custody.approval_signature && (
          <div className="border border-green-200 rounded-lg overflow-hidden bg-white">
            <img
              src={custody.approval_signature}
              alt="التوقيع"
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg px-3 py-1.5 text-xs">
        <Clock className="h-3.5 w-3.5" />
        <span>بانتظار الاعتماد</span>
      </div>
      {showButton && onClick && (
        <button
          onClick={onClick}
          className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          اعتماد بالتوقيع
        </button>
      )}
    </div>
  );
}