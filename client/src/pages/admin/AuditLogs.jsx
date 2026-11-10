import { useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText, Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, PageHeader, Select, Spinner } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';

const tone = (a) => (a.startsWith('EMERGENCY') ? 'red' : /FAILED|SUSPEND|REVOKED|UNVERIFIED|DELETED/.test(a) ? 'amber' : /LOGIN|REGISTER/.test(a) ? 'slate' : 'blue');

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [input, setInput] = useState('');
  const [page, setPage] = useState(1);

  const handleActionChange = (e) => {
    setAction(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQ(input.trim());
    setPage(1);
  };

  const qs = new URLSearchParams({ page, ...(action && { action }), ...(q && { q }) }).toString();
  const { data, loading, error, reload } = useApi(`/admin/audit?${qs}`);

  return (
    <>
      <PageHeader title="Audit logs" subtitle="An append-only record of sensitive activity across the platform." crumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Audit logs' }]} />
      <div className="mb-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearchSubmit} className="relative min-w-60 flex-1 sm:max-w-sm" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search audit logs" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search actor or details…" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </form>
        <Select aria-label="Filter by action" value={action} onChange={handleActionChange} className="w-64">
          <option value="">All actions</option>
          {data?.actions.map((a) => <option key={a} value={a}>{a.replaceAll('_', ' ').toLowerCase()}</option>)}
        </Select>
      </div>
      <Card padded={false}>
        {loading && !data ? <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div> : error ? <div className="p-5"><ErrorState error={error} onRetry={reload} /></div> : (
          <>
            <DataTable rowKey="_id" rows={data.logs} empty={<EmptyState icon={ScrollText} title="No matching events" />} columns={[
              { header: 'Time', render: (l) => <span className="whitespace-nowrap text-slate-600">{fmtDateTime(l.createdAt)}</span> },
              { header: 'Actor', render: (l) => <div><p className="font-medium text-slate-900">{l.actorName || 'Unknown'}</p><p className="text-xs text-slate-500">{l.actorRole}</p></div> },
              { header: 'Action', render: (l) => <Badge tone={tone(l.action)}>{l.action.replaceAll('_', ' ').toLowerCase()}</Badge> },
              { header: 'Patient', render: (l) => l.patient?.uhrId ? <span className="font-mono text-xs text-brand-700">{l.patient.uhrId}</span> : <span className="text-slate-300">—</span> },
              { header: 'Details', render: (l) => <span className="line-clamp-2 max-w-md text-slate-600">{l.details}</span> },
              { header: 'IP', render: (l) => <span className="font-mono text-xs text-slate-400">{l.ip}</span> },
            ]} />
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>{data.total} event{data.total === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" />
                <span>Page {data.page} of {data.pages}</span>
                <Button size="sm" variant="secondary" icon={ChevronRight} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" />
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
