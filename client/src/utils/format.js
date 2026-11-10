export const fmtDate = (d, opts) =>
  d ? new Date(d).toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDateTime = (d) => (d ? `${fmtDate(d)} · ${fmtTime(d)}` : '—');
export const ageFromDob = (dob) => (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null);
export const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
export const initials = (name = '') => name.replace(/^Dr\.?\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const toLocalInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(d);
};
export const SEVERITY_STYLE = {
  mild: 'bg-amber-50 text-amber-800 ring-amber-200',
  moderate: 'bg-orange-50 text-orange-800 ring-orange-200',
  severe: 'bg-red-50 text-red-800 ring-red-200',
  'life-threatening': 'bg-red-600 text-white ring-red-700',
};

/* ---- appointment slots (clinic time; must match server/src/utils/slots.js) ---- */
export const CLINIC_TZ = 'Asia/Kolkata';
export const CLINIC_OFFSET = '+05:30';
export const SLOTS = Array.from({ length: 16 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
export const clinicParts = (d) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};
export const slotToIso = (date, time) => new Date(`${date}T${time}:00${CLINIC_OFFSET}`).toISOString();
export const isClosedDay = (date) => new Date(`${date}T12:00:00${CLINIC_OFFSET}`).getUTCDay() === 0; // Sunday
