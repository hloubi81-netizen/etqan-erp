import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Search } from "lucide-react";
import LoyaltyCardDialog from "@/components/loyalty/LoyaltyCardDialog";

export default function LoyaltyCardScanner({ open, clients, onClose }) {
  const [value, setValue] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [matched, setMatched] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setNotFound(false);
      setMatched(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const lookup = () => {
    const term = value.trim();
    if (!term) return;
    const m = clients.find(c => c.card_number === term);
    if (m) {
      setMatched(m);
      setNotFound(false);
    } else {
      setNotFound(true);
      setMatched(null);
    }
  };

  return (
    <>
      <Dialog open={open && !matched} onOpenChange={onClose}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5"><ScanBarcode className="h-4 w-4" /> مسح بطاقة ولاء</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">وجّه الماسح نحو الباركود أو أدخل رقم البطاقة يدوياً ثم اضغط Enter.</p>
            <div className="relative">
              <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input ref={inputRef} className="pr-9 font-mono" placeholder="LOY000001" value={value} onChange={e => { setValue(e.target.value); setNotFound(false); }} onKeyDown={e => { if (e.key === "Enter") lookup(); }} />
            </div>
            {notFound && <p className="text-xs text-red-600">لم يتم العثور على عميل بهذا الرقم</p>}
            <Button className="w-full gap-1.5" onClick={lookup}><Search className="h-4 w-4" /> بحث</Button>
          </div>
        </DialogContent>
      </Dialog>

      {matched && (
        <LoyaltyCardDialog client={matched} onClose={() => { setMatched(null); onClose(); }} />
      )}
    </>
  );
}