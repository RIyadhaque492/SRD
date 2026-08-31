import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200);
  const rows = q
    ? await sql`select m.*, v.no_of_portfolios, v.last_portfolio, v.pf_status
                from members m left join v_member_portfolio v using (profile_id)
                where m.member_name ilike ${'%' + q + '%'}
                   or m.profile_id  ilike ${'%' + q + '%'}
                   or m.primary_contact ilike ${'%' + q + '%'}
                order by m.profile_id limit ${limit}`
    : await sql`select m.*, v.no_of_portfolios, v.last_portfolio, v.pf_status
                from members m left join v_member_portfolio v using (profile_id)
                order by m.profile_id limit ${limit}`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.profile_id || !b.member_name) {
    return NextResponse.json({ error: 'Profile ID and Member Name are required.' }, { status: 400 });
  }
  try {
    const [row] = await sql`
      insert into members (profile_id, member_name, primary_contact, nid_no, business_name,
        business_address, area_code, zone_id, category_code, business_type_code, profile_date,
        father_name, mother_name, spouse_name, spouse_contact, present_address, permanent_address,
        gender, religion, client_dob, perm_thana, off_day, old_mcl)
      values (${b.profile_id}, ${b.member_name}, ${b.primary_contact ?? null}, ${b.nid_no ?? null},
        ${b.business_name ?? null}, ${b.business_address ?? null}, ${b.area_code ?? null},
        ${b.zone_id ?? null}, ${b.category_code ?? null}, ${b.business_type_code ?? null},
        ${b.profile_date ?? null}, ${b.father_name ?? null}, ${b.mother_name ?? null},
        ${b.spouse_name ?? null}, ${b.spouse_contact ?? null}, ${b.present_address ?? null},
        ${b.permanent_address ?? null}, ${b.gender ?? null}, ${b.religion ?? null},
        ${b.client_dob ?? null}, ${b.perm_thana ?? null}, ${b.off_day ?? null}, ${b.old_mcl ?? null})
      on conflict (profile_id) do update set
        member_name = excluded.member_name,
        primary_contact = excluded.primary_contact,
        updated_at = now()
      returning *`;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
