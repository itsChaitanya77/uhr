import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { AlertTriangle, Download, Pencil, Phone, Plus, RefreshCw, ShieldCheck, Star, Trash2, UserRound, Sparkles, QrCode } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, PageSkeleton } from '../../components/ui';
import { SEVERITY_STYLE } from '../../utils/format';

/** Draws a high-definition wallet-size emergency card (PNG). The QR encodes only an opaque token. */
function downloadCard({ name, uhrId, bloodGroup, qrCanvas }) {
  const W = 1012; const H = 638;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  
  // Clean card background
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  
  // Emergency Red Header Banner
  g.fillStyle = '#dc2626';
  g.fillRect(0, 0, W, 100);
  
  g.fillStyle = '#ffffff';
  g.font = '800 36px Inter, Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('EMERGENCY MEDICAL IDENTITY CARD', 48, 50);
  
  g.font = '700 22px Inter, Arial, sans-serif';
  g.textAlign = 'right';
  g.fillText('UNIVERSAL HEALTH RECORD (UHR)', W - 48, 50);
  g.textAlign = 'left';
  
  // Patient details
  g.fillStyle = '#0f172a';
  g.font = '800 52px Inter, Arial, sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillText(name, 48, 195);
  
  g.fillStyle = '#64748b';
  g.font = '600 24px Inter, Arial, sans-serif';
  g.fillText('PERMANENT UHR ID', 48, 255);
  
  g.fillStyle = '#1d4ed8';
  g.font = '700 42px ui-monospace, Menlo, monospace';
  g.fillText(uhrId, 48, 305);
  
  g.fillStyle = '#64748b';
  g.font = '600 24px Inter, Arial, sans-serif';
  g.fillText('BLOOD GROUP', 48, 385);
  
  g.fillStyle = '#dc2626';
  g.font = '900 115px Inter, Arial, sans-serif';
  g.fillText(bloodGroup === 'Unknown' ? '?' : bloodGroup, 48, 505);
  
  // Draw the QR Code with border
  if (qrCanvas) {
    g.strokeStyle = '#e2e8f0';
    g.lineWidth = 4;
    g.strokeRect(W - 48 - 320, 140, 320, 320);
    g.drawImage(qrCanvas, W - 48 - 320, 140, 320, 320);
  }
  
  g.fillStyle = '#475569';
  g.font = '600 20px Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('Scan with verified clinician account to break glass', W - 48 - 160, 495);
  g.fillText('Encrypted token · No medical data stored on card', W - 48 - 160, 525);
  
  // Bottom Footer Bar
  g.fillStyle = '#f8fafc';
  g.fillRect(0, H - 60, W, 60);
  g.fillStyle = '#64748b';
  g.font = '500 18px Inter, Arial, sans-serif';
  g.textAlign = 'left';
  g.fillText('Universal Health Record · Demonstrator Card · All clinical data is synthetic.', 48, H - 24);
  
  const a = document.createElement('a');
  a.download = `UHR-Emergency-Card-${uhrId}.png`;
  a.href = c.toDataURL('image/png');
  a.click();
}

function ContactModal({ contact, onClose, onSaved }) {
  const toast = useToast();
  const { run, saving, fieldErrors } = useAction(toast);
  const [f, setF] = useState({
    name: contact?.name || '',
    relation: contact?.relation || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    isPrimary: contact?.isPrimary || false
  });
  const [errs, setErrs] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (f.name.trim().length < 2) e2.name = 'Enter a valid name';
    if (f.relation.trim().length < 2) e2.relation = 'Enter the relationship (e.g. Spouse, Parent)';
    if (!/^[+0-9 ()-]{7,20}$/.test(f.phone)) e2.phone = 'Enter a valid contact phone number';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e2.email = 'Enter a valid email address';
    setErrs(e2);
    if (Object.keys(e2).length) return;
    const ok = await run(
      () => (contact ? api.put(`/patient/contacts/${contact._id}`, f) : api.post('/patient/contacts', f)),
      contact ? 'Emergency contact updated' : 'Emergency contact added'
    );
    if (ok) { onSaved(); onClose(); }
  };
  const err = (k) => errs[k] || fieldErrors[k];

  return (
    <Modal open onClose={onClose} title={contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save Contact</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Full Name" required value={f.name} error={err('name')} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Emergency contact name" />
        <Input label="Relationship" required value={f.relation} error={err('relation')} onChange={(e) => setF({ ...f, relation: e.target.value })} placeholder="Spouse, Mother, Brother…" />
        <Input label="Phone Number" required type="tel" value={f.phone} error={err('phone')} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 98765 43210" />
        <Input label="Email (Optional)" type="email" value={f.email} error={err('email')} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="contact@example.com" />
        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand-600" checked={f.isPrimary} onChange={(e) => setF({ ...f, isPrimary: e.target.checked })} />
          <span>Mark as Primary Contact (Alerted first in emergency break-glass sessions)</span>
        </label>
      </form>
    </Modal>
  );
}

export default function EmergencyProfile() {
  const toast = useToast();
  const emergency = useApi('/patient/emergency');
  const profile = useApi('/patient/profile');
  const qrRef = useRef(null);
  const [contactModal, setContactModal] = useState(null);
  const [delContact, setDelContact] = useState(null);
  const [rotate, setRotate] = useState(false);
  const act = useAction(toast);

  if (emergency.loading || profile.loading) return <PageSkeleton rows={2} />;
  if (emergency.error || profile.error) return <ErrorState error={emergency.error || profile.error} onRetry={() => { emergency.reload(); profile.reload(); }} />;

  const { qrPayload, uhrId, bloodGroup, name, contacts } = emergency.data;
  const p = profile.data.patient;

  const doRotate = async () => {
    const res = await act.run(() => api.post('/patient/emergency/rotate-qr'), 'New QR code generated. The old code is now invalid.');
    if (res) { emergency.setData({ ...emergency.data, qrPayload: res.qrPayload }); setRotate(false); }
  };
  const doDelete = async () => {
    if (await act.run(() => api.delete(`/patient/contacts/${delContact._id}`), 'Emergency contact removed')) { setDelContact(null); emergency.reload(); }
  };

  return (
    <>
      <PageHeader
        title="Emergency Medical Card &amp; QR"
        subtitle="Manage your scannable token and the emergency contacts alerted when clinicians break glass."
        crumbs={[{ label: 'Home', to: '/patient' }, { label: 'Emergency Card' }]}
        actions={
          <Button icon={Download} onClick={() => downloadCard({ name, uhrId, bloodGroup, qrCanvas: qrRef.current })}>
            Print / Download Card
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Physical Card Preview Mockup */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-2 border-red-200 shadow-xl" padded={false}>
            {/* Red Card Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-white flex items-center justify-between">
              <span className="text-xs font-black tracking-widest uppercase">UHR EMERGENCY ID</span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">WALLET CARD</span>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="rounded-2xl border-4 border-slate-100 bg-white p-3 shadow-md">
                <QRCodeCanvas ref={qrRef} value={qrPayload} size={210} level="M" marginSize={1} />
              </div>

              <h2 className="mt-5 text-center text-2xl font-black tracking-tight text-slate-900">{name}</h2>
              <p className="font-mono text-sm font-bold text-brand-600 mt-0.5">{uhrId}</p>

              <div className="mt-4 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 px-3 py-1 text-white shadow-xs text-center">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-100">Blood</span>
                  <span className="text-xl font-black leading-none">{bloodGroup}</span>
                </div>
                <div className="text-left text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Zero-Knowledge Token</p>
                  <p className="text-[11px]">No medical data is stored on QR</p>
                </div>
              </div>

              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                <Button size="sm" icon={Download} onClick={() => downloadCard({ name, uhrId, bloodGroup, qrCanvas: qrRef.current })}>
                  Download Card
                </Button>
                <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setRotate(true)}>
                  Rotate Code
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <ShieldCheck className="h-4 w-4" /> Privacy-First Architecture
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Scanning this QR without an authorized clinician account and a documented reason reveals nothing.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Critical Summary & Contacts */}
        <div className="space-y-6 lg:col-span-3">
          <Card title="Critical Life-Saving Information" subtitle="Surfaced instantly in break-glass mode">
            {p.criticalNotes && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-semibold text-red-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{p.criticalNotes}</span>
              </div>
            )}

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Allergies
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {p.allergies.length ? (
                    p.allergies.map((a) => (
                      <span key={a._id} className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${SEVERITY_STYLE[a.severity]}`}>
                        {a.name} ({a.severity})
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None recorded</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chronic Conditions
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {p.conditions.length ? (
                    p.conditions.map((c) => (
                      <Badge key={c._id} tone={c.critical ? 'red' : 'slate'} className="font-semibold">
                        {c.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None recorded</span>
                  )}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Medications
                </dt>
                <dd className="text-xs text-slate-700 font-medium">
                  {p.medications.length ? (
                    p.medications.map((m) => `${m.name}${m.dose ? ` (${m.dose})` : ''}`).join(' · ')
                  ) : (
                    'None recorded'
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <Button as={Link} to="/patient/health" variant="ghost" size="sm">
                Edit Health Profile →
              </Button>
            </div>
          </Card>

          {/* Emergency Contacts */}
          <Card
            title="Emergency Notification Contacts"
            subtitle="Notified in real time when emergency access is activated (simulated in demo)"
            action={
              <Button size="sm" icon={Plus} variant="secondary" disabled={contacts.length >= 5} onClick={() => setContactModal({})}>
                Add Contact
              </Button>
            }
          >
            {contacts.length === 0 ? (
              <EmptyState
                icon={UserRound}
                title="No emergency contacts on file"
                message="Add family members or guardians who should be notified when a doctor accesses your records in an emergency."
                action={<Button size="sm" onClick={() => setContactModal({})}>Add Contact</Button>}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <li key={c._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        {c.name}
                        {c.isPrimary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-[10px] font-bold ring-1 ring-brand-200">
                            <Star className="h-3 w-3 fill-brand-600 text-brand-600" /> Primary
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{c.relation} · {c.phone} {c.email && `· ${c.email}`}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Edit ${c.name}`} onClick={() => setContactModal({ contact: c })} />
                    <Button variant="dangerGhost" size="sm" icon={Trash2} aria-label={`Remove ${c.name}`} onClick={() => setDelContact(c)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {contactModal && <ContactModal contact={contactModal.contact} onClose={() => setContactModal(null)} onSaved={emergency.reload} />}
      <ConfirmDialog open={!!delContact} onClose={() => setDelContact(null)} danger loading={act.saving} onConfirm={doDelete} title="Remove emergency contact?" confirmLabel="Remove" message={`${delContact?.name} will no longer be notified or shown to emergency staff.`} />
      <ConfirmDialog open={rotate} onClose={() => setRotate(false)} danger loading={act.saving} onConfirm={doRotate} title="Generate a new QR code?" confirmLabel="Generate new code" message="Your current QR code and any printed cards will stop working immediately. Use this if your card is lost or shared." />
    </>
  );
}
