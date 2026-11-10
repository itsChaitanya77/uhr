import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAction } from '../../hooks/useApi';
import { Button, Input, Modal, Select, Textarea } from '../ui';

const MAX = 5 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** Upload a report with a PDF / PNG / JPEG attachment. `endpoint` differs for patient vs doctor. */
export default function UploadReportModal({ open, onClose, endpoint, onDone }) {
  const toast = useToast();
  const { run, saving, fieldErrors } = useAction(toast);
  const [f, setF] = useState({ title: '', category: 'laboratory', summary: '', reportDate: TODAY_ISO });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const pick = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!TYPES.includes(picked.type)) return setErrors({ file: 'Only PDF, PNG or JPEG files are allowed' });
    if (picked.size > MAX) return setErrors({ file: 'File is too large (max 5 MB)' });
    setErrors({}); setFile(picked);
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.title.trim().length < 3) errs.title = 'Enter a title (at least 3 characters)';
    if (!file && !f.summary.trim()) errs.file = 'Attach a file or add a summary';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v && fd.append(k, v));
    if (file) fd.append('file', file);
    const ok = await run(() => api.post(endpoint, fd), 'Report uploaded');
    if (ok) { setFile(null); setF({ ...f, title: '', summary: '' }); onDone?.(); onClose(); }
  };

  const err = (k) => errors[k] || fieldErrors[k];
  return (
    <Modal open={open} onClose={onClose} title="Upload a medical report"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} icon={UploadCloud}>Upload</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input className="sm:col-span-2" label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err('title')} placeholder="e.g. Chest X-ray, Complete blood count" />
        <Select label="Type" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="laboratory">Laboratory</option><option value="imaging">Imaging</option><option value="other">Other</option>
        </Select>
        <Input label="Report date" type="date" value={f.reportDate} max={TODAY_ISO} onChange={(e) => setF({ ...f, reportDate: e.target.value })} error={err('reportDate')} />
        <Textarea className="sm:col-span-2" label="Summary / notes" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} error={err('summary')} />
        <div className="sm:col-span-2">
          <label htmlFor="report-file" className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 ${err('file') ? 'border-red-300' : 'border-slate-300'}`}>
            <UploadCloud className="h-7 w-7 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{file ? file.name : 'Choose a PDF, PNG or JPEG'}</span>
            <span className="text-xs text-slate-500">{file ? `${Math.round(file.size / 1024)} KB` : 'Max 5 MB'}</span>
          </label>
          <input id="report-file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={pick} className="sr-only" />
          {err('file') && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{err('file')}</p>}
        </div>
      </form>
    </Modal>
  );
}
