import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Search, SearchX, Siren } from 'lucide-react';
import api from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Alert, Avatar, Badge, Button, Card, DataTable, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui';

export default function PatientSearch() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const mine = useApi('/doctor/patients');

  // Keep search input in sync if URL query parameter changes
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setInput(q);
  }

  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    setSearching(true);
    setError(null);
    api.get('/doctor/search', { params: { q } })
      .then((r) => { if (live) setResults(r.data.patients); })
      .catch((e) => { if (live) setError({ message: e.response?.data?.message || 'Search failed' }); })
      .finally(() => { if (live) setSearching(false); });
    return () => { live = false; };
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  };

  const columns = [
    { header: 'Patient', render: (p) => <div className="flex items-center gap-3"><Avatar name={p.name} size="sm" /><div><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.age} yrs · {p.gender}</p></div></div> },
    { header: 'UHR ID', render: (p) => <span className="font-mono text-sm text-brand-700">{p.uhrId}</span> },
    { header: 'Blood', render: (p) => (p.hasAccess ? <Badge tone="red">{p.bloodGroup}</Badge> : <span className="text-slate-300">hidden</span>) },
    { header: 'Access', render: (p) => <Badge tone={p.hasAccess ? 'green' : 'slate'}>{p.hasAccess ? 'Granted' : 'Not granted'}</Badge> },
    { header: '', className: 'text-right', render: (p) => p.hasAccess
      ? <Button as={Link} to={`/doctor/patients/${p.id}`} size="sm">Open record</Button>
      : <Button as={Link} to={`/doctor/emergency?uhrId=${p.uhrId}`} size="sm" variant="dangerGhost" icon={Siren}>Emergency only</Button> },
  ];

  return (
    <>
      <PageHeader title="Patient search" subtitle="Find patients by name or UHR ID." crumbs={[{ label: 'Dashboard', to: '/doctor' }, { label: 'Patient search' }]} />
      <form onSubmit={submit} role="search" className="mb-6 flex max-w-2xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus aria-label="Search patients" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. UHR-1000001 or Aarav" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <Button type="submit" size="lg" className="h-11">Search</Button>
      </form>

      {searching ? <div className="grid place-items-center py-16"><Spinner className="h-8 w-8" /></div> : error ? <ErrorState error={error} /> : q.trim().length >= 2 ? (
        <Card title={`Results for "${q}"`} subtitle={`${results?.length || 0} matching patients`}>
          <DataTable rows={results} empty={<EmptyState icon={SearchX} title="No patients found" message="Try searching by full UHR ID (e.g. UHR-1000003) or first name." />} columns={columns} />
        </Card>
      ) : (
        <Card title="Patients who granted you access" subtitle="These patients have shared their record with you.">
          {mine.loading ? <div className="py-10 text-center"><Spinner className="mx-auto" /></div> : mine.error ? <ErrorState error={mine.error} onRetry={mine.reload} /> : (
            <DataTable rows={mine.data.patients.map((p) => ({ ...p, hasAccess: true }))} empty={<EmptyState icon={Lock} title="No patient records shared yet" message="Patients can share their record during appointment booking or via Privacy & access." />} columns={columns} />
          )}
        </Card>
      )}
      <Alert tone="amber" className="mt-6" title="Privacy notice">Patients you search for who have not granted you consent show "Not granted". Full medical histories are visible only after explicit consent, or via break-glass emergency access.</Alert>
    </>
  );
}
