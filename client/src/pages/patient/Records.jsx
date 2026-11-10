import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UploadCloud } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Button, Card, ConfirmDialog, ErrorState, PageHeader, PageSkeleton } from '../../components/ui';
import RecordTabs from '../../components/records/RecordViews';
import UploadReportModal from '../../components/records/UploadReportModal';

export default function Records() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const { data, loading, error, reload } = useApi('/patient/records');
  const [upload, setUpload] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const toast = useToast();
  const del = useAction(toast);

  const confirmDelete = async () => {
    const ok = await del.run(() => api.delete(`/patient/reports/${toDelete._id}`), 'Report deleted');
    if (ok) { setToDelete(null); reload(); }
  };

  return (
    <>
      <PageHeader title="Medical records" subtitle="Consultations, diagnoses, prescriptions and reports in one place." crumbs={[{ label: 'Home', to: '/patient' }, { label: 'Medical records' }]}
        actions={<Button icon={UploadCloud} onClick={() => setUpload(true)}>Upload report</Button>} />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input aria-label="Filter records" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} placeholder="Filter by title, diagnosis or medication…" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
      </div>
      {loading ? <PageSkeleton rows={2} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <Card><RecordTabs records={data.records} prescriptions={data.prescriptions} labs={data.labs} q={q} onDeleteReport={setToDelete} /></Card>
      )}
      <UploadReportModal open={upload} onClose={() => setUpload(false)} endpoint="/patient/reports" onDone={reload} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={del.saving} danger title="Delete this report?" confirmLabel="Delete report" message={`"${toDelete?.title}" and its attached file will be permanently removed. Reports added by your doctors can't be deleted.`} />
    </>
  );
}
