import { useMemo, useState } from 'react';
import { AlertTriangle, Download, FileText, FlaskConical, Pill, Stethoscope, Trash2, ScanLine, History } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, Modal, Tabs } from '../ui';
import { fmtDate } from '../../utils/format';
import { openReportFile } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const FLAG = { normal: 'green', high: 'amber', low: 'amber', critical: 'red' };
const RX_TONE = { active: 'green', completed: 'slate', discontinued: 'red' };

export function LabDetailModal({ report, onClose }) {
  const toast = useToast();
  if (!report) return null;
  const open = () => openReportFile(report._id).catch((e) => toast.error(e.response?.status === 403 ? 'You do not have access to this file' : 'Could not open file'));
  return (
    <Modal open={!!report} onClose={onClose} title={report.title} size="lg"
      footer={<>{report.file?.storedName && <Button variant="secondary" icon={Download} onClick={open}>Open attached file</Button>}<Button onClick={onClose}>Close</Button></>}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Badge tone="blue">{report.category}</Badge><span>{fmtDate(report.reportDate)}</span>
        <span>· added by {report.uploaderRole || 'clinic'}</span>
      </div>
      {report.summary && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{report.summary}</p>}
      {report.results?.length > 0 ? (
        <DataTable rowKey="test" columns={[
          { header: 'Test', key: 'test', className: 'font-medium text-slate-900' },
          { header: 'Result', render: (r) => <span className="tabular-nums">{r.value} <span className="text-slate-400">{r.unit}</span></span> },
          { header: 'Reference', key: 'range', className: 'text-slate-500' },
          { header: 'Flag', render: (r) => <Badge tone={FLAG[r.flag]}>{r.flag}</Badge> },
        ]} rows={report.results} />
      ) : !report.file?.storedName && <p className="text-sm text-slate-500">No structured results were recorded for this report.</p>}
      {report.file?.storedName && <p className="mt-3 text-xs text-slate-500">Attachment: {report.file.originalName} ({Math.round(report.file.size / 1024)} KB)</p>}
    </Modal>
  );
}

const TypeIcon = { consultation: Stethoscope, diagnosis: FileText, history: History, imaging: ScanLine };

function RecordCard({ r, actions }) {
  const Icon = TypeIcon[r.type] || FileText;
  return (
    <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-slate-900">{r.title}</h3>
          {r.critical && <Badge tone="red"><AlertTriangle className="h-3 w-3" />Critical</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{fmtDate(r.date)}{r.doctor?.name && ` · ${r.doctor.name}`}{r.doctor?.specialty && ` (${r.doctor.specialty})`}</p>
        {r.diagnosis && <p className="mt-2 text-sm"><span className="font-medium text-slate-700">Diagnosis:</span> {r.diagnosis}</p>}
        {r.notes && <p className="mt-1 text-sm leading-6 text-slate-600">{r.notes}</p>}
        {r.treatment && <p className="mt-1 text-sm text-slate-600"><span className="font-medium text-slate-700">Treatment:</span> {r.treatment}</p>}
      </div>
      {actions && <div className="shrink-0">{actions(r)}</div>}
    </li>
  );
}

/**
 * Tabbed medical record viewer shared by the patient portal and the doctor's patient history.
 * `q` filters by text; `recordActions` / `rxActions` / `labActions` render per-row controls.
 */
export default function RecordTabs({ records = [], prescriptions = [], labs = [], q = '', recordActions, rxActions, labActions, onDeleteReport }) {
  const [tab, setTab] = useState('consultation');
  const [lab, setLab] = useState(null);
  const needle = q.trim().toLowerCase();
  const match = (...fields) => !needle || fields.some((f) => String(f || '').toLowerCase().includes(needle));

  const view = useMemo(() => ({
    consultation: records.filter((r) => r.type === 'consultation' && match(r.title, r.diagnosis, r.notes)),
    diagnosis: records.filter((r) => r.type === 'diagnosis' && match(r.title, r.diagnosis, r.notes)),
    history: records.filter((r) => r.type === 'history' && match(r.title, r.diagnosis, r.notes)),
    imaging: [...records.filter((r) => r.type === 'imaging' && match(r.title, r.diagnosis, r.notes))],
    prescriptions: prescriptions.filter((p) => match(p.medication, p.instructions)),
    labs: labs.filter((l) => l.category !== 'imaging' && match(l.title, l.summary)),
    imagingReports: labs.filter((l) => l.category === 'imaging' && match(l.title, l.summary)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [records, prescriptions, labs, needle]);

  const tabs = [
    { id: 'consultation', label: 'Consultations', count: view.consultation.length },
    { id: 'diagnosis', label: 'Diagnoses', count: view.diagnosis.length },
    { id: 'history', label: 'Medical history', count: view.history.length },
    { id: 'prescriptions', label: 'Prescriptions', count: view.prescriptions.length },
    { id: 'labs', label: 'Laboratory', count: view.labs.length },
    { id: 'imaging', label: 'Imaging', count: view.imaging.length + view.imagingReports.length },
  ];

  const list = (items) => items.length
    ? <ul className="space-y-3">{items.map((r) => <RecordCard key={r._id} r={r} actions={recordActions} />)}</ul>
    : <EmptyState icon={FileText} title={needle ? 'No matches' : 'No entries yet'} message={needle ? 'Try a different search term.' : 'Entries added by you or your doctors will appear here.'} />;

  const labList = (items) => items.length ? (
    <DataTable rows={items} columns={[
      { header: 'Report', render: (l) => <button onClick={() => setLab(l)} className="text-left font-medium text-brand-700 hover:underline">{l.title}</button> },
      { header: 'Date', render: (l) => fmtDate(l.reportDate) },
      { header: 'Summary', render: (l) => <span className="line-clamp-2 text-slate-600">{l.summary || '—'}</span> },
      { header: 'Flags', render: (l) => { const n = (l.results || []).filter((r) => r.flag !== 'normal').length; return n ? <Badge tone="amber">{n} abnormal</Badge> : l.file?.storedName ? <Badge tone="blue">File</Badge> : <Badge tone="green">Normal</Badge>; } },
      { header: '', className: 'text-right', render: (l) => <div className="flex justify-end gap-1">{labActions?.(l)}{onDeleteReport && l.uploaderRole === 'patient' && <Button variant="dangerGhost" size="sm" icon={Trash2} aria-label={`Delete ${l.title}`} onClick={() => onDeleteReport(l)} />}</div> },
    ]} />
  ) : <EmptyState icon={FlaskConical} title={needle ? 'No matches' : 'No reports yet'} message="Upload a previous report to keep everything in one place." />;

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="pt-5">
        {tab === 'consultation' && list(view.consultation)}
        {tab === 'diagnosis' && list(view.diagnosis)}
        {tab === 'history' && list(view.history)}
        {tab === 'prescriptions' && (view.prescriptions.length ? (
          <DataTable rows={view.prescriptions} columns={[
            { header: 'Medication', render: (p) => <div><p className="font-medium text-slate-900">{p.medication}</p><p className="text-xs text-slate-500">{p.instructions}</p></div> },
            { header: 'Dosage', render: (p) => `${p.dosage} · ${p.frequency}` },
            { header: 'Duration', render: (p) => p.duration || '—' },
            { header: 'Prescribed', render: (p) => <div><p>{fmtDate(p.prescribedAt)}</p><p className="text-xs text-slate-500">{p.doctor?.name}</p></div> },
            { header: 'Status', render: (p) => <Badge tone={RX_TONE[p.status]}>{p.status}</Badge> },
            ...(rxActions ? [{ header: '', className: 'text-right', render: rxActions }] : []),
          ]} />
        ) : <EmptyState icon={Pill} title="No prescriptions" message="Prescriptions from your doctors will appear here." />)}
        {tab === 'labs' && labList(view.labs)}
        {tab === 'imaging' && (<div className="space-y-5">{view.imaging.length > 0 && list(view.imaging)}{labList(view.imagingReports)}{!view.imaging.length && !view.imagingReports.length && <EmptyState icon={ScanLine} title="No imaging yet" message="Imaging reports like X-rays and scans appear here." />}</div>)}
      </div>
      <LabDetailModal report={lab} onClose={() => setLab(null)} />
    </>
  );
}
