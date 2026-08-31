import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await sql`select * from v_lmc order by applied_date desc nulls last limit 200`);
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  if (!b.proposal_id) return NextResponse.json({ error: 'proposal_id is required.' }, { status: 400 });

  const allChecked = b.pm_check && b.dir_check && b.contr_check && b.ceo_check;

  try {
    await sql`
      insert into lmc (proposal_id, approved_date, approved_amount, approved_duration_months,
        pm_check, pm_time, dir_check, contr_check, ceo_check, approved_time,
        disbursed_date, start_date, end_date, actual_installment)
      values (${b.proposal_id}, ${b.approved_date ?? null}, ${b.approved_amount ?? null},
        ${b.approved_duration_months ?? null}, ${b.pm_check ?? false},
        ${b.pm_check ? new Date().toISOString() : null}, ${b.dir_check ?? false},
        ${b.contr_check ?? false}, ${b.ceo_check ?? false},
        ${allChecked ? new Date().toISOString() : null},
        ${b.disbursed_date ?? null}, ${b.start_date ?? null}, ${b.end_date ?? null},
        ${b.actual_installment ?? null})
      on conflict (proposal_id) do update set
        approved_date = excluded.approved_date, approved_amount = excluded.approved_amount,
        approved_duration_months = excluded.approved_duration_months,
        pm_check = excluded.pm_check, dir_check = excluded.dir_check,
        contr_check = excluded.contr_check, ceo_check = excluded.ceo_check,
        pm_time = coalesce(lmc.pm_time, excluded.pm_time),
        approved_time = coalesce(lmc.approved_time, excluded.approved_time),
        disbursed_date = excluded.disbursed_date, start_date = excluded.start_date,
        end_date = excluded.end_date, actual_installment = excluded.actual_installment,
        updated_at = now()`;

    if (b.disbursed_date) {
      await sql`update proposals set stage = 'Disbursed' where proposal_id = ${b.proposal_id}`;
    }

    const [row] = await sql`select * from v_lmc where proposal_id = ${b.proposal_id}`;
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
