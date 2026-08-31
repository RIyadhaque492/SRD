import type { FieldKind } from './columns';

/** Service charge, flat, per month. Derived from your Portfolio sheet:
 *  300,000 x 6 months -> 54,000 = 3.00% / month. Change here if the rate changes. */
export const MONTHLY_SERVICE_CHARGE = 0.03;

/** Collection days per month, keyed by the member's weekly off day.
 *  SRD says /25 for Friday, /20 otherwise. Your Portfolio sheet has Thursday
 *  rows on both 20 and 25 — confirm before going live. */
export function collectionDaysPerMonth(offDay?: string | null) {
  return offDay === 'Fri' ? 25 : 20;
}

export function installment(amount: number, months: number, offDay?: string | null) {
  const m = Math.max(months || 1, 1);
  const receivable = amount + amount * MONTHLY_SERVICE_CHARGE * m;
  const count = m * collectionDaysPerMonth(offDay);
  return {
    totalReceivable: receivable,
    totalInstallments: count,
    installmentAmount: Math.round(receivable / count),
  };
}

/** Next proposal id: YY + MM + running serial, e.g. 2602 + 7 -> "26027". */
export function nextProposalId(existingForMonth: string[], when = new Date()) {
  const yy = String(when.getFullYear()).slice(2);
  const mm = String(when.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;
  const serials = existingForMonth
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  return `${prefix}${(serials.length ? Math.max(...serials) : 0) + 1}`;
}

// ---------- cell coercion ----------

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function excelSerialToDate(n: number): Date | null {
  if (n < 1 || n > 200000) return null;
  return new Date(EXCEL_EPOCH + Math.round(n * 86400000));
}

export function coerce(value: unknown, kind: FieldKind): unknown {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '' || raw === '--' || raw === 'NA' || raw === '#REF!' || raw === '#N/A') return null;

  switch (kind) {
    case 'text':
      return String(raw);

    case 'int':
    case 'num': {
      if (typeof raw === 'number') return kind === 'int' ? Math.round(raw) : raw;
      // "6 Months" -> 6 ; "1,20,000" -> 120000
      const cleaned = String(raw).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
      if (!cleaned) return null;
      const n = parseFloat(cleaned[0]);
      return kind === 'int' ? Math.round(n) : n;
    }

    case 'bool': {
      if (typeof raw === 'boolean') return raw;
      const s = String(raw).toLowerCase();
      if (['true', 'yes', 'y', '1', 'ok', 'checked', '✓'].includes(s)) return true;
      if (['false', 'no', 'n', '0', ''].includes(s)) return false;
      return null;
    }

    case 'date':
    case 'ts': {
      if (raw instanceof Date) return raw.toISOString();
      if (typeof raw === 'number') {
        const d = excelSerialToDate(raw);
        return d ? d.toISOString() : null;
      }
      const s = String(raw);
      // The workbook mixes 15-Jul-2015 (handled by Date) with bare numeric dates.
      // A bare 8/20/2026 is month-first; 20/8/2026 is day-first. Decide by which
      // part is over 12, and fall back to day-first, which is the local convention.
      const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (parts) {
        const [, a, b, y] = parts.map(Number) as unknown as number[];
        const dayFirst = a > 12 || b <= 12;
        const day = dayFirst ? a : b;
        const month = dayFirst ? b : a;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(Date.UTC(y, month - 1, day)).toISOString();
        }
        return null;
      }
      const parsed = new Date(s);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
  }
}

/** "মোঃ খোরশেদ / Md Khorshed" -> { bn, en } */
export function splitBilingual(v?: string | null) {
  if (!v) return { bn: null, en: null };
  const parts = v.split('/').map((s) => s.trim());
  if (parts.length < 2) return { bn: v, en: null };
  return { bn: parts[0] || null, en: parts.slice(1).join('/').trim() || null };
}
