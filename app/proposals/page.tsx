import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Proposals() {
  const rows = await sql`select * from v_proposals order by prospect_date desc limit 100` as any[];
  const bdt = (n: any) => (n == null ? '—' : '৳' + Number(n).toLocaleString('en-IN'));

  return (
    <>
      <h2>Proposals</h2>
      <p className="note">Installment is computed from amount, duration and the member&apos;s
        off day at read time — it is never stored, so changing the rate updates every row.</p>
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Member</th><th className="num">Amount</th><th className="num">Months</th>
            <th className="num">Installment</th><th>Off day</th><th>Area</th><th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.proposal_id}>
              <td>{p.proposal_id}</td>
              <td>{p.customer_name}</td>
              <td className="num">{bdt(p.proposed_loan_amount)}</td>
              <td className="num">{p.proposed_duration_months ?? '—'}</td>
              <td className="num">{bdt(p.proposed_installment)}</td>
              <td>{p.offday ?? '—'}</td>
              <td>{p.area ?? '—'}</td>
              <td>{p.stage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
