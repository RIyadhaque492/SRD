import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Members() {
  const rows = await sql`
    select m.profile_id, m.member_name, m.primary_contact, m.business_name,
           m.area_code, m.off_day, v.no_of_portfolios, v.pf_status
    from members m left join v_member_portfolio v using (profile_id)
    order by m.profile_id limit 100` as any[];

  return (
    <>
      <h2>Members</h2>
      <p className="note">First 100 profiles. Portfolio count and status are read from the
        portfolio table, so they stay correct without being re-keyed.</p>
      <table>
        <thead>
          <tr>
            <th>Profile</th><th>Name</th><th>Contact</th><th>Business</th>
            <th>Area</th><th>Off day</th><th className="num">Portfolios</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.profile_id}>
              <td>{m.profile_id}</td>
              <td>{m.member_name}</td>
              <td>{m.primary_contact}</td>
              <td>{m.business_name}</td>
              <td>{m.area_code}</td>
              <td>{m.off_day}</td>
              <td className="num">{m.no_of_portfolios ?? 0}</td>
              <td>{m.pf_status ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
