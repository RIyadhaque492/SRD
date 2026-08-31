import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { nextProposalId } from '@/lib/calc';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const stage = req.nextUrl.searchParams.get('stage');
  const rows = stage
    ? await sql`select * from v_proposals where stage = ${stage} order by prospect_date desc limit 200`
    : await sql`select * from v_proposals order by prospect_date desc limit 200`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.profile_id || !b.proposed_loan_amount) {
    return NextResponse.json({ error: 'Member and proposed amount are required.' }, { status: 400 });
  }

  const when = b.prospect_date ? new Date(b.prospect_date) : new Date();
  const prefix = String(when.getFullYear()).slice(2) + String(when.getMonth() + 1).padStart(2, '0');
  const existing = await sql`select proposal_id from proposals where proposal_id like ${prefix + '%'}`;
  const id = nextProposalId(existing.map((r: any) => r.proposal_id), when);

  try {
    const [row] = await sql`
      insert into proposals (proposal_id, profile_id, old_mcl, prospect_date,
        proposed_loan_amount, proposed_duration_months, zero_install, cr_score, cro_id, incharge_id)
      values (${id}, ${b.profile_id}, ${b.old_mcl ?? 'New'}, ${when.toISOString().slice(0, 10)},
        ${b.proposed_loan_amount}, ${b.proposed_duration_months ?? null},
        ${b.zero_install ?? false}, ${b.cr_score ?? null}, ${b.cro_id ?? null}, ${b.incharge_id ?? null})
      returning *`;
    const [view] = await sql`select * from v_proposals where proposal_id = ${row.proposal_id}`;
    return NextResponse.json(view, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
