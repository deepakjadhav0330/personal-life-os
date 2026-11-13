/**
 * ReceiptScanner
 * ──────────────
 * Camera → Tesseract.js OCR → pre-filled expense form.
 *
 * Tesseract.js runs entirely in-browser (WebAssembly).
 * Language data is loaded from CDN on first use (~4MB) then cached
 * by the service worker — identical to how iOS Siri dictation works.
 *
 * Supported: iOS Safari 14.5+, Chrome, Firefox.
 */
import { useState, useRef } from 'react';
import { Camera, RotateCcw, Check, AlertTriangle, Loader2, X } from 'lucide-react';
import { Button, Input, Select } from '../ui';
import { parseReceiptText, type ReceiptData } from '../../utils/receiptParser';

interface ReceiptScannerProps {
  currency: string;
  onResult: (data: { amount: number; description: string; category: string }) => void;
  onClose: () => void;
}

type Phase = 'idle' | 'scanning' | 'done' | 'error';

const EXPENSE_CATEGORIES = [
  { value: 'food',          label: 'Food' },
  { value: 'groceries',     label: 'Groceries' },
  { value: 'transport',     label: 'Transport' },
  { value: 'shopping',      label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'healthcare',    label: 'Healthcare' },
  { value: 'bills',         label: 'Bills' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'fitness',       label: 'Fitness' },
  { value: 'other',         label: 'Other' },
];

export function ReceiptScanner({ currency, onResult, onClose }: ReceiptScannerProps) {
  const [phase,       setPhase]       = useState<Phase>('idle');
  const [progress,    setProgress]    = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [imageUrl,    setImageUrl]    = useState<string | null>(null);
  const [result,      setResult]      = useState<ReceiptData | null>(null);
  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('food');
  const fileRef = useRef<HTMLInputElement>(null);

  const symbol = currency === 'INR' ? '₹' : '$';

  // ── Handle photo selected ───────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setPhase('scanning');
    setProgress(0);
    setProgressMsg('Loading OCR engine…');

    try {
      // Lazy load Tesseract.js so it doesn't affect initial bundle size
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker('eng', 1, {
        // Load from CDN — cached by service worker after first use
        workerPath:   'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js',
        langPath:     'https://tessdata.projectnaptha.com/4.0.0',
        corePath:     'https://cdn.jsdelivr.net/npm/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'loading tesseract core') {
            setProgressMsg('Loading OCR engine…');
            setProgress(10);
          } else if (m.status === 'initializing api') {
            setProgressMsg('Initialising…');
            setProgress(20);
          } else if (m.status === 'loading language traineddata') {
            setProgressMsg('Loading language data…');
            setProgress(30 + (m.progress * 20));
          } else if (m.status === 'recognizing text') {
            setProgressMsg('Reading receipt…');
            setProgress(50 + (m.progress * 50));
          }
        },
      } as any);

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseReceiptText(text);
      setResult(parsed);
      setAmount(parsed.amount ? String(parsed.amount) : '');
      setDescription(parsed.merchant ?? '');
      setCategory(parsed.category);
      setPhase('done');

    } catch (err) {
      console.error('[ReceiptScanner]', err);
      setPhase('error');
    }

    // Reset file input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const reset = () => {
    setPhase('idle');
    setImageUrl(null);
    setResult(null);
    setAmount('');
    setDescription('');
    setCategory('food');
    setProgress(0);
  };

  const confirm = () => {
    const n = parseFloat(amount);
    if (!n || isNaN(n)) return;
    onResult({ amount: n, description: description.trim(), category });
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Hidden file input — triggers camera on iOS */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {/* ── IDLE: prompt to take photo ── */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 rounded-2xl glass-2 flex items-center justify-center">
            <Camera size={36} className="text-accent opacity-80" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-content-primary mb-1">
              Scan a receipt
            </p>
            <p className="text-sm text-content-secondary leading-relaxed max-w-[260px]">
              Point your camera at any printed receipt. The amount and merchant will be detected automatically.
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Camera size={16} />}
            onClick={() => fileRef.current?.click()}
            fullWidth
          >
            Take Photo
          </Button>
          <p className="text-[11px] text-content-muted text-center max-w-[240px] leading-relaxed">
            OCR runs on your device. No photo is sent to any server.
          </p>
        </div>
      )}

      {/* ── SCANNING: progress ── */}
      {phase === 'scanning' && (
        <div className="flex flex-col items-center gap-4 py-4">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Receipt"
              className="w-full max-h-48 object-contain rounded-card glass-1"
            />
          )}
          <div className="flex items-center gap-3 w-full">
            <Loader2 size={18} className="text-accent animate-spin shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-content-muted mb-1.5">
                <span>{progressMsg}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full accent-gradient transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-content-muted text-center">
            First scan downloads ~4MB of language data (cached after that).
          </p>
        </div>
      )}

      {/* ── DONE: review and confirm ── */}
      {phase === 'done' && result && (
        <div className="flex flex-col gap-4">
          {/* Photo + confidence badge */}
          <div className="relative">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Receipt"
                className="w-full max-h-40 object-contain rounded-card glass-1"
              />
            )}
            {result.confidence === 'high' && (
              <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-success bg-success/15 border border-success/30 px-2 py-0.5 rounded-full">
                <Check size={10} /> High confidence
              </span>
            )}
            {result.confidence === 'low' && (
              <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/15 border border-warning/30 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} /> Low confidence — please review
              </span>
            )}
          </div>

          {/* Editable fields */}
          <Input
            label={`Amount (${symbol}) *`}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount"
            leftElement={<span className="text-xs">{symbol}</span>}
          />
          <Input
            label="Merchant / Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. McDonald's"
          />
          <Select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={EXPENSE_CATEGORIES}
          />

          <div className="flex gap-3">
            <Button
              variant="ghost"
              leftIcon={<RotateCcw size={14} />}
              onClick={reset}
            >
              Scan again
            </Button>
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Check size={14} />}
              onClick={confirm}
              disabled={!amount || isNaN(parseFloat(amount))}
            >
              Add Expense
            </Button>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/15 border border-danger/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-danger" />
          </div>
          <div>
            <p className="text-base font-semibold text-content-primary mb-1">Scan failed</p>
            <p className="text-sm text-content-secondary">
              Could not read the receipt. Try better lighting or a flatter surface.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="ghost" leftIcon={<X size={14} />} onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" leftIcon={<RotateCcw size={14} />} onClick={reset} fullWidth>
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
