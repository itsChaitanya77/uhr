/**
 * Appointment rules: Monday–Saturday, 09:00–17:00 clinic time, 30-minute slots
 * (last slot starts 16:30). Clinic timezone is configurable (default Asia/Kolkata).
 */
const TZ = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function isBookableSlot(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) return false;
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return p.weekday !== 'Sun' && (minute === 0 || minute === 30) && hour >= 9 && hour <= 16;
}

const SLOT_MESSAGE = 'Appointments are Monday to Saturday, 09:00–17:00 (clinic time), in 30-minute slots';
module.exports = { isBookableSlot, SLOT_MESSAGE, CLINIC_TIMEZONE: TZ };
