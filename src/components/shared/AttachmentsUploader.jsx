import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Paperclip, Trash2, ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AttachmentsUploader({ attachments = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return { name: file.name, url: file_url, uploaded_at: new Date().toISOString() };
        })
      );
      onChange([...attachments, ...results]);
      toast.success(`تم رفع ${results.length} مرفق`);
    } catch {
      toast.error("فشل رفع المرفق");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAttachment(idx) {
    onChange(attachments.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">المرفقات</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 mr-auto"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "جاري الرفع..." : "رفع مستند"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded-md text-sm">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate text-foreground">{att.name}</span>
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}