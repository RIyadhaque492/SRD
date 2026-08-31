import { sql } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [counts] = await sql`
    select
      (select count(*) from members)                                   as members,
      (select count(*) from proposals where stage = 'Prospect')        as prospects,
      (select count(*) from proposals where stage = 'FPRC')            as review,
      (select count(*) from proposals where stage = 'Approved')        as approved,
      (select coalesce(sum(approved_amount),0) from lmc
        where disbursed_date is not null)                              as disbursed
  ` as any[];

  const recent = await sql`
    select proposal_id, customer_name, proposed_loan_amount, prospect_date, stage
    from v_proposals order by prospect_date desc limit 10` as any[];

  const bdt = (n: number) => '৳' + Number(n).toLocaleString('en-IN');

  return (
    <>
      <div className="rail">
        <div className="stage">
          <span className="n">{counts.members}</span>
          <span className="t">Members on file</span>
        </div>
        <div className="stage live">
          <span className="n">{counts.prospects}</span>
          <span className="t">Awaiting feasibility</span>
        </div>
        <div className="stage">
          <span className="n">{counts.review}</span>
          <span className="t">In feasibility review</span>
        </div>
        <div className="stage">
          <span className="n">{counts.approved}</span>
          <span className="t">Approved, not disbursed</span>
        </div>
      </div>

      <p className="note">
        {bdt(counts.disbursed)} disbursed to date. A proposal moves Prospect → Feasibility →
        Approved → Disbursed; each step writes to its own table and the derived figures are
        recalculated rather than stored.
      </p>

      <h2>Latest proposals</h2>
      {recent.length === 0 ? (
        <p className="note">
          Nothing here yet. <Link href="/import">Upload your workbook</Link> to bring the
          existing records in.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Proposal</th><th>Member</th><th className="num">Amount</th>
              <th>Prospect date</th><th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.proposal_id}>
                <td>{r.proposal_id}</td>
                <td>{r.customer_name}</td>
                <td className="num">{bdt(r.proposed_loan_amount)}</td>
                <td>{r.prospect_date?.toString().slice(0, 10)}</td>
                <td>{r.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
