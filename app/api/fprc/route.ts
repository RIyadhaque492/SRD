import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await sql`select * from v_fprc order by rfp_date desc nulls last limit 200`);
}

/** Create or update the feasibility record for one proposal. */
export async function PUT(req: NextRequest) {
  const b = await req.json();
  if (!b.proposal_id) return NextResponse.json({ error: 'proposal_id is required.' }, { status: 400 });

  try {
    await sql`
      insert into fprc (proposal_id, rfp_date, cr_score, regularity_score, performance_score,
        risk_score, feasibility_score, fs_score_pct, previous_loan_amount, ai_remarks,
        active_rating, approved, approved_date, feasibility_date, rejected, comments, remarks)
      values (${b.proposal_id}, ${b.rfp_date ?? null}, ${b.cr_score ?? null},
        ${b.regularity_score ?? null}, ${b.performance_score ?? null}, ${b.risk_score ?? null},
        ${b.feasibility_score ?? null}, ${b.fs_score_pct ?? null}, ${b.previous_loan_amount ?? null},
        ${b.ai_remarks ?? null}, ${b.active_rating ?? null}, ${b.approved ?? false},
        ${b.approved_date ?? null}, ${b.feasibility_date ?? null}, ${b.rejected ?? false},
        ${b.comments ?? null}, ${b.remarks ?? null})
      on conflict (proposal_id) do update set
        rfp_date = excluded.rfp_date, cr_score = excluded.cr_score,
        regularity_score = excluded.regularity_score, performance_score = excluded.performance_score,
        risk_score = excluded.risk_score, feasibility_score = excluded.feasibility_score,
        fs_score_pct = excluded.fs_score_pct, previous_loan_amount = excluded.previous_loan_amount,
        ai_remarks = excluded.ai_remarks, active_rating = excluded.active_rating,
        approved = excluded.approved, approved_date = excluded.approved_date,
        feasibility_date = excluded.feasibility_date, rejected = excluded.rejected,
        comments = excluded.comments, remarks = excluded.remarks, updated_at = now()`;

    await sql`update proposals set stage = ${b.approved ? 'Approved' : b.rejected ? 'Rejected' : 'FPRC'},
              updated_at = now() where proposal_id = ${b.proposal_id}`;

    const [row] = await sql`select * from v_fprc where prospect_id = ${b.proposal_id}`;
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
