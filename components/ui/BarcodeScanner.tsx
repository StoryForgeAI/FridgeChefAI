'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import type { PantryItem } from '@/lib/types';

export default function BarcodeScanner({ onAdd }: { onAdd: (item: PantryItem) => void }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!scanning) {
      return;
    }

    let isMounted = true;

    import('html5-qrcode').then((module) => {
      if (!isMounted) {
        return;
      }

      const Html5Qrcode = module.Html5Qrcode;
      scannerRef.current = new Html5Qrcode('reader');
      scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await handleScan(decodedText);
        },
        () => {}
      );
    });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [scanning]);

  async function stopScanner() {
    if (!scannerRef.current) {
      return;
    }

    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch {
      // Ignore cleanup errors from partially initialized scanners.
    } finally {
      scannerRef.current = null;
    }
  }

  async function handleScan(barcode: string) {
    if (!barcode) {
      return;
    }

    setError('');

    try {
      const supabase = createBrowserClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('You need to be logged in to scan.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-barcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ barcode })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to process barcode.');
      }

      onAdd(payload);
      setScanning(false);
      await stopScanner();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Failed to process barcode. Please try again.');
    }
  }

  return (
    <div>
      {scanning ? (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-yellow-400/20 bg-black/50">
          <div className="scanner-grid absolute inset-0 z-10" />
          <div className="scanner-line absolute left-6 right-6 top-6 z-20 h-0.5 rounded-full bg-yellow-300 shadow-[0_0_22px_rgba(255,215,0,0.7)]" />
          <div id="reader" className="relative z-0 h-72 w-full bg-zinc-950" />
          <div className="pointer-events-none absolute inset-6 z-20 rounded-[1.5rem] border border-yellow-300/40" />
          <button
            onClick={async () => {
              setScanning(false);
              await stopScanner();
            }}
            className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button onClick={() => setScanning(true)} className="glow-button w-full gap-2">
          <ScanLine className="h-4 w-4" />
          Start Scanning
        </button>
      )}
      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
