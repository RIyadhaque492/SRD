import * as XLSX from 'xlsx';
import { createHash } from 'crypto';
import { TARGETS, detectTarget, norm, type Target } from './columns';
import { coerce, splitBilingual } from './calc';
import { sql } from './db';

export interface RowError { row: number; problem: string }
export interface SheetResult {
  sheet: string;
  target: string | null;
  label?: string;
  total: number;
  ok: number;
  failed: number;
  errors: RowError[];
  skipped?: string;
}

/**
 * Your sheets don't all put headers on row 1 — DB_Member has them on row 2,
 * FPRC and LMC on row 3. Rather than hard-coding that, score the first few
 * rows and take whichever matches the most known headers.
 */
function findHeaderRow(grid: unknown[][], target: Target, scanDepth = 6) {
  const known = new Set(target.fields.flatMap((f) => f.headers.map(norm)));
  let best = { index: 0, hits: -1 };
  for (let i = 0; i < Math.min(scanDepth, grid.length); i++) {
    const hits = (grid[i] || []).filter((c) => known.has(norm(c))).length;
    if (hits > best.hits) best = { index: i, hits };
  }
  return best;
}

function buildColumnIndex(headerRow: unknown[], target: Target) {
  const map = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    const n = norm(cell);
    if (!n) return;
    for (const f of target.fields) {
      if (!map.has(f.col) && f.headers.some((h) => norm(h) === n)) map.set(f.col, i);
    }
  });
  return map;
}

function rowHash(target: string, values: Record<string, unknown>) {
  return createHash('sha1').update(target + JSON.stringify(values)).digest('hex');
}

/** Build an INSERT ... ON CONFLICT DO UPDATE for one row. */
async function upsert(target: Target, values: Record<string, unknown>) {
  const cols = Object.keys(values);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const updates = cols
    .filter((c) => c !== target.key)
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');

  const text =
    `insert into ${target.table} (${cols.join(', ')}) values (${placeholders}) ` +
    `on conflict (${target.key}) do update set ${updates || `${target.key} = excluded.${target.key}`}`;

  await sql.query(text, cols.map((c) => values[c]));
}

export async function importWorkbook(buffer: ArrayBuffer, filename: string) {
  const wb = XLSX.read(buffer, { cellDates: true });
  const results: SheetResult[] = [];

  for (const sheetName of wb.SheetNames) {
    const targetKey = detectTarget(sheetName);
    if (!targetKey) {
      results.push({ sheet: sheetName, target: null, total: 0, ok: 0, failed: 0, errors: [], skipped: 'No matching table' });
      continue;
    }

    const target = TARGETS[targetKey];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1, blankrows: false, defval: null, raw: false, cellDates: true,
    });

    const header = findHeaderRow(grid, target);
    if (header.hits < 1) {
      results.push({ sheet: sheetName, target: targetKey, label: target.label, total: 0, ok: 0, failed: 0, errors: [], skipped: 'No recognisable header row' });
      continue;
    }

    const index = buildColumnIndex(grid[header.index], target);
    const body = grid.slice(header.index + 1);
    const errors: RowError[] = [];
    let ok = 0;

    for (let r = 0; r < body.length; r++) {
      const excelRow = header.index + r + 2;
      const row = body[r] || [];
      if (row.every((c) => c === null || c === '')) continue;

      const values: Record<string, unknown> = {};
      let bad: string | null = null;

      for (const f of target.fields) {
        const i = index.get(f.col);
        const v = i === undefined ? null : coerce(row[i], f.kind);
        if (f.required && (v === null || v === '')) { bad = `${f.headers[0]} is required`; break; }
        if (v !== null) values[f.col] = v;
      }

      if (bad) { errors.push({ row: excelRow, problem: bad }); continue; }

      // Sheet-specific touch-ups
      if (targetKey === 'members') {
        if (values.member_name) {
          const { en } = splitBilingual(values.member_name as string);
          if (en) values.member_name = `${values.member_name}`;
        }
        if (values.business_name) {
          const { bn, en } = splitBilingual(values.business_name as string);
          values.business_name_bn ??= bn;
          values.business_name_en ??= en;
        }
        if (values.zone_id) values.zone_id = String(values.zone_id).split('-')[0].trim();
        if (values.category_code) values.category_code = String(values.category_code).split('-')[0].trim();
        if (values.business_type_code) values.business_type_code = String(values.business_type_code).split('-')[0].trim();
      }
      if (targetKey === 'proposals') {
        for (const k of ['cro_id', 'incharge_id'] as const) {
          if (values[k]) values[k] = String(values[k]).split('-')[0].trim();
        }
      }
      if (targetKey === 'collections') {
        values.source_hash = rowHash(targetKey, values);
      }

      try {
        await upsert(target, values);
        ok++;
      } catch (e) {
        errors.push({ row: excelRow, problem: (e as Error).message.slice(0, 200) });
      }
    }

    results.push({
      sheet: sheetName, target: targetKey, label: target.label,
      total: ok + errors.length, ok, failed: errors.length,
      errors: errors.slice(0, 50),
    });
  }

  const totals = results.reduce(
    (a, r) => ({ total: a.total + r.total, ok: a.ok + r.ok, failed: a.failed + r.failed }),
    { total: 0, ok: 0, failed: 0 },
  );

  await sql`
    insert into import_batches (filename, target, rows_total, rows_ok, rows_failed, errors)
    values (${filename}, ${results.filter((r) => r.target).map((r) => r.target).join(',')},
            ${totals.total}, ${totals.ok}, ${totals.failed}, ${JSON.stringify(results)})
  `;

  return { results, totals };
}
