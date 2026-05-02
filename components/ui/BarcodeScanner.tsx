'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine, X, Timer } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import type { BarcodePreview, PantryItem } from '@/lib/types';

export default function BarcodeScanner({ onAdd }: { onAdd: (item: PantryItem) => void }) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<BarcodePreview | null>(null);
  const scannerRef = useRef<any>(null);
  const scanLockRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          if (scanLockRef.current) {
            return;
          }

          scanLockRef.current = true;
          await stopScanner();
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
    if (!barcode || processing) {
      return;
    }

    setError('');
    setProcessing(true);
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const supabase = createBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke('process-barcode', {
        body: {
          barcode,
          mode: 'preview'
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to process barcode.');
      }

      setPreview(data as BarcodePreview);
      setScanning(false);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Failed to process barcode. Please try again.');
      scanLockRef.current = false;
    } finally {
      setProcessing(false);
      setCountdown(0);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    }
  }

  async function confirmAdd() {
    if (!preview) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const supabase = createBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke('process-barcode', {
        body: {
          mode: 'add',
          ...preview
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to add pantry item.');
      }

      onAdd(data as PantryItem);
      window.dispatchEvent(new Event('fridgechef:profile-refresh'));
      setPreview(null);
      scanLockRef.current = false;
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Failed to add pantry item.');
    } finally {
      setProcessing(false);
    }
  }

  function closePreview() {
    setPreview(null);
    setProcessing(false);
    setError('');
    setCountdown(0);
    scanLockRef.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  }

  return (
    <div className={preview ? 'pointer-events-none' : ''}>
      {scanning ? (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-yellow-400/20 bg-black/50">
          <div className="scanner-grid absolute inset-0 z-10" />
          <div className="scanner-line absolute left-6 right-6 top-6 z-20 h-0.5 rounded-full bg-yellow-300 shadow-[0_0_22px_rgba(255,215,0,0.7)]" />
          <div id="reader" className="relative z-0 h-72 w-full bg-zinc-950" />
          <div className="pointer-events-none absolute inset-6 z-20 rounded-[1.5rem] border border-yellow-300/40" />
          <button
            onClick={async () => {
              setScanning(false);
              scanLockRef.current = false;
              await stopScanner();
            }}
            className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setScanning(true);
            setError('');
            scanLockRef.current = false;
          }}
          className="glow-button w-full gap-2"
        >
          <ScanLine className="h-4 w-4" />
          Start Scanning
        </button>
      )}

       {processing && !preview ? (
         <div className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
           <Timer className="h-4 w-4 animate-spin" />
           {countdown > 0 ? `Processing in ${countdown}...` : 'Processing barcode...'}
         </div>
       ) : null}
       {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}

       {preview ? (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm pointer-events-auto">
           <div className="panel w-full max-w-md overflow-hidden p-0 pointer-events-auto">
            <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
              {preview.image_url ? (
                <img src={preview.image_url} alt={preview.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),_transparent_35%)]">
                  <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-6">
                    <ScanLine className="h-10 w-10 text-yellow-300" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-yellow-300/75">Barcode Found</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{preview.name}</h3>
                <p className="mt-2 text-sm text-zinc-400">{preview.kcal ?? 0} kcal per 100g</p>
              </div>

              <div className="flex gap-3">
                <button onClick={confirmAdd} disabled={processing} className="glow-button w-full disabled:opacity-60">
                  {processing ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={closePreview}
                  className="w-full rounded-2xl border border-white/10 px-4 py-3 font-medium text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
