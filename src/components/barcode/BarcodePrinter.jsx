import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodePrinter({ barcode, productName, quantity = 1 }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && barcode) {
      JsBarcode(barcodeRef.current, barcode, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
      });
    }
  }, [barcode]);

  return (
    <div className="border p-4 bg-white text-center min-w-[150px]">
      <svg ref={barcodeRef} />
      <p className="text-xs mt-2 font-semibold truncate">{productName}</p>
      {quantity > 1 && <p className="text-xs text-muted-foreground">عدد: {quantity}</p>}
    </div>
  );
}