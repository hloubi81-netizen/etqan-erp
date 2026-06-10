import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pen } from "lucide-react";

/**
 * SignaturePad — لوحة رسم التوقيع الإلكتروني
 * Props:
 *  - value: base64 string (التوقيع الحالي)
 *  - onChange: (base64 | null) => void
 *  - width, height
 */
export default function SignaturePad({ value, onChange, width = 380, height = 130 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  // رسم التوقيع الموجود عند التحميل
  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
      setHasSignature(true);
    }
  }, []);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a5f";
    const { x, y } = getPos(e, canvasRef.current);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw(e) {
    if (!drawing.current) return;
    drawing.current = false;
    setHasSignature(true);
    onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clearPad() {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    setHasSignature(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Pen className="h-3 w-3" /> ارسم توقيعك هنا
        </span>
        {hasSignature && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={clearPad}>
            <Eraser className="h-3 w-3 ml-1" /> مسح
          </Button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-dashed border-primary/30 rounded-lg bg-white cursor-crosshair w-full touch-none"
        style={{ maxHeight: height }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      {!hasSignature && (
        <p className="text-[10px] text-center text-muted-foreground">يمكنك الرسم بالماوس أو باللمس</p>
      )}
    </div>
  );
}