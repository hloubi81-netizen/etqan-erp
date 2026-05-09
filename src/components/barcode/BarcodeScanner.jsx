import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.33,
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        onScan(decodedText);
        html5QrcodeScanner.clear();
        onClose();
      },
      (error) => {
        // تجاهل الأخطاء
      }
    );

    setScanner(html5QrcodeScanner);

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(() => {});
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">ماسح الباركود</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div id="qr-reader" className="w-full" />
        <Button onClick={onClose} variant="outline" className="w-full mt-4">
          إغلاق
        </Button>
      </div>
    </div>
  );
}