'use client';

import { useState, useRef } from 'react';

interface SheetResult {
  sheet: string; target: string | null; label?: string;
  total: number; ok: number; failed: number;
  errors: { row: number; problem: string }[]; skipped?: string;
}

export default function ImportPage() {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SheetResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    setBusy(true); setError(null); setResults(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/import', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'The upload failed.');
      else setResults(data.results);
    } catch {
      setError('The upload could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Upload a workbook</h2>
      <p className="note">
        Each sheet is matched to a table by name — <code>1.DB_Member</code>, <code>2.PC_ClntMgt</code>,
        <code> 3.PC_FPRC</code>, <code>4.PC_LMC</code>, <code>5.Portfolio</code> and
        <code> Import_ColxnMgt</code>. Header rows are found automatically, so sheets with totals
        on the first row still import. Rows that already exist are updated, not duplicated.
      </p>

      <div
        className={`drop${over ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) send(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); }}
        />
        <p style={{ marginTop: 0 }}>Drop an .xlsx file here, or</p>
        <button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Importing…' : 'Choose a file'}
        </button>
        <p className="note" style={{ margin: '14px auto 0' }}>
          Up to 8 MB. <a href="/api/template">Download a blank template</a> with the exact headers.
        </p>
      </div>

      {error && <div className="msg">{error}</div>}

      {results && (
        <>
          <h2>Import result</h2>
          <table>
            <thead>
              <tr>
                <th>Sheet</th><th>Goes to</th>
                <th className="num">Imported</th><th className="num">Failed</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.sheet}>
                  <td>{r.sheet}</td>
                  <td>{r.label ?? '—'}</td>
                  <td className="num">{r.ok}</td>
                  <td className="num">{r.failed}</td>
                  <td>
                    {r.skipped
                      ? r.skipped
                      : r.errors.length
                        ? `Row ${r.errors[0].row}: ${r.errors[0].problem}`
                        : 'Clean'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {results.some((r) => r.errors.length > 0) && (
            <>
              <h2>Rows that need fixing</h2>
              <table>
                <thead><tr><th>Sheet</th><th className="num">Excel row</th><th>Problem</th></tr></thead>
                <tbody>
                  {results.flatMap((r) =>
                    r.errors.map((e, i) => (
                      <tr key={`${r.sheet}-${i}`}>
                        <td>{r.sheet}</td>
                        <td className="num">{e.row}</td>
                        <td>{e.problem}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
              <p className="note">
                Fix these rows in the spreadsheet and upload the same file again. Rows that
                already landed will be updated in place, not duplicated.
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
