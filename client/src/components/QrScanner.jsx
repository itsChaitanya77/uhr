import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff } from 'lucide-react';
import { Button, Input, Modal } from './ui';

const READER_ID = 'uhr-qr-reader';

/** Camera-based QR scanner with a manual paste fallback (useful on desktops without a webcam / for the demo). */
export default function QrScanner({ open, onClose, onScan }) {
  const [cameraError, setCameraError] = useState('');
  const [manual, setManual] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setCameraError('');
    let cancelled = false;
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => { if (!cancelled) { cancelled = true; onScan(text.trim()); } },
      () => {})
      .catch(() => setCameraError('Camera unavailable or permission denied. Paste the code below instead.'));
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) Promise.resolve(s.isScanning ? s.stop() : null).catch(() => {}).finally(() => { try { s.clear(); } catch { /* already cleared */ } });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Scan emergency QR code" size="sm" footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div id={READER_ID} className="overflow-hidden rounded-xl bg-slate-900" style={{ minHeight: cameraError ? 0 : 280 }} />
      {cameraError && <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><CameraOff className="h-4 w-4 shrink-0" />{cameraError}</p>}
      <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onScan(manual.trim()); }}>
        <Input className="flex-1" label="Or paste the QR code text" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="UHR-EMG:…" />
        <Button type="submit" variant="secondary" className="mb-0.5">Use</Button>
      </form>
    </Modal>
  );
}
