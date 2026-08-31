import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { TARGETS } from '@/lib/columns';

export const runtime = 'nodejs';

/** Blank workbook with exactly the headers the importer accepts. */
export async function GET() {
  const wb = XLSX.utils.book_new();

  for (const [key, t] of Object.entries(TARGETS)) {
    const headers = t.fields.map((f) => f.headers[0]);
    const hint = t.fields.map((f) => (f.required ? `${f.kind} - required` : f.kind));
    const ws = XLSX.utils.aoa_to_sheet([headers, hint]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, key.slice(0, 31));
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="srd-import-template.xlsx"',
    },
  });
}
