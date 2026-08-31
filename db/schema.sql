-- ============================================================
-- SRD schema  (run once in the Neon SQL editor)
-- Entry 01 members -> Entry 02 proposals -> Entry 03 fprc -> Entry 04 lmc
-- ============================================================

-- ---------- lookups (the SRD "Dropdown" fields) ----------

create table if not exists areas (
  code        text primary key,          -- A01, A02 ...
  name        text
);

create table if not exists zones (
  id          text primary key,          -- 0204, 2506 ...
  name        text not null,
  area_code   text references areas(code)
);

create table if not exists categories (
  code        text primary key,          -- 102, 105, 156 ...
  name        text not null
);

create table if not exists business_types (
  code        text primary key,          -- 1011011 ...
  name        text not null,
  category_code text references categories(code)
);

create table if not exists employees (
  emp_id      text primary key,          -- 1327, 1325 ...
  name        text not null,
  role        text check (role in ('CRO','InCharge','TeamLead','Other')) default 'Other',
  active      boolean default true
);

create table if not exists holidays (
  day         date primary key,
  particulars text
);

-- ---------- Entry 01 : DB_Member ----------

create table if not exists members (
  profile_id        text primary key,
  member_name       text not null,
  primary_contact   text,
  nid_no            text,
  business_name     text,
  business_address  text,
  area_code         text references areas(code),
  zone_id           text references zones(id),
  category_code     text references categories(code),
  business_type_code text references business_types(code),
  profile_date      date,
  father_name       text,
  mother_name       text,
  spouse_name       text,
  spouse_contact    text,
  present_address   text,
  permanent_address text,
  gender            text check (gender in ('Male','Female','Other')),
  religion          text,
  client_dob        date,
  perm_thana        text,
  off_day           text check (off_day in ('Sat','Sun','Mon','Tue','Wed','Thu','Fri')),
  old_mcl           text,
  business_name_bn  text,               -- SRD "ব্যবসার নাম" / Data Split
  business_name_en  text,
  sub_category_v2   text,
  member_id         text,
  profile_updated   timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists members_area_idx on members(area_code);
create index if not exists members_contact_idx on members(primary_contact);

-- ---------- Entry 02 : PC_ClntMgt ----------

create table if not exists proposals (
  proposal_id        text primary key,           -- YYMM + serial, e.g. 26021
  profile_id         text not null references members(profile_id) on delete restrict,
  old_mcl            text,                       -- previous portfolio no, or 'New'
  prospect_date      date not null,
  proposed_loan_amount numeric(14,2) not null check (proposed_loan_amount > 0),
  proposed_duration_months int check (proposed_duration_months between 1 and 24),
  zero_install       boolean default false,
  cr_score           numeric(6,2),
  cro_id             text references employees(emp_id),
  incharge_id        text references employees(emp_id),
  stage              text not null default 'Prospect'
                     check (stage in ('Prospect','FPRC','Approved','Rejected','Disbursed')),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
create index if not exists proposals_profile_idx on proposals(profile_id);
create index if not exists proposals_date_idx on proposals(prospect_date);

-- ---------- Entry 03 : PC_FPRC ----------

create table if not exists fprc (
  proposal_id         text primary key references proposals(proposal_id) on delete cascade,
  rfp_date            date,
  cr_score            numeric(6,2),
  regularity_score    numeric(6,2),      -- RS Matrix 5.0
  performance_score   numeric(6,2),
  risk_score          numeric(6,2),
  feasibility_score   numeric(6,2),
  fs_score_pct        numeric(6,2),
  previous_loan_amount numeric(14,2),
  ai_remarks          text,
  active_rating       text,
  approved            boolean default false,
  approved_date       date,
  feasibility_date    date,
  rejected            boolean default false,
  comments            text,
  remarks             text,
  updated_at          timestamptz default now()
);

-- ---------- Entry 04 : PC_LMC ----------

create table if not exists lmc (
  proposal_id            text primary key references proposals(proposal_id) on delete cascade,
  approved_date          date,
  approved_amount        numeric(14,2),
  approved_duration_months int,
  pm_check               boolean default false,
  pm_time                timestamptz,
  dir_check              boolean default false,
  contr_check            boolean default false,
  ceo_check              boolean default false,
  approved_time          timestamptz,
  disbursed_date         date,
  start_date             date,
  end_date               date,
  actual_installment     numeric(14,2),   -- manual override of the computed figure
  updated_at             timestamptz default now()
);

-- ---------- Portfolio + collections (feed the "PortFolio" derived fields) ----------

create table if not exists portfolios (
  portfolio_no      text primary key,
  proposal_id       text references proposals(proposal_id),
  profile_id        text references members(profile_id),
  investment_amount numeric(14,2),
  disbursed_date    date,
  start_date        date,
  end_date          date,
  duration_months   int,
  off_day           text,
  service_charge    numeric(14,2),
  ddbs              numeric(14,2),
  proc_fee          numeric(14,2),
  stamp_fee         numeric(14,2),
  instl_amount      numeric(14,2),
  disbursed_amount  numeric(14,2),
  outstandings      numeric(14,2),
  total_collected   numeric(14,2),
  status            text,
  area_code         text,
  finished_date     date,
  created_at        timestamptz default now()
);
create index if not exists portfolios_profile_idx on portfolios(profile_id);

create table if not exists collections (
  id               bigserial primary key,
  portfolio_no     text references portfolios(portfolio_no),
  entry_date       timestamptz,
  transaction_date date,
  amount           numeric(14,2) not null,
  entry_by         text,
  area_code        text,
  checked          boolean default false,
  checked_time     timestamptz,
  audited          boolean default false,
  audited_time     timestamptz,
  remarks          text,
  old_new          text,
  particulars      text,
  installment      numeric(14,2),
  cro              text,
  profit_earned    numeric(14,2),
  status           text,
  source_hash      text unique          -- de-dupes repeat uploads of the same rows
);
create index if not exists collections_pf_idx on collections(portfolio_no);
create index if not exists collections_txn_idx on collections(transaction_date);

-- ---------- import audit ----------

create table if not exists import_batches (
  id            bigserial primary key,
  filename      text,
  target        text,
  rows_total    int,
  rows_ok       int,
  rows_failed   int,
  errors        jsonb,
  created_at    timestamptz default now()
);

-- ============================================================
-- VIEWS: every SRD field marked Auto / Connected / PortFolio
-- lives here, not as a stored column.
-- ============================================================

create or replace view v_member_portfolio as
select
  m.profile_id,
  count(p.portfolio_no)                                    as no_of_portfolios,
  max(p.portfolio_no)                                      as last_portfolio,
  (array_agg(p.status order by p.disbursed_date desc))[1]  as pf_status,
  max(p.end_date)                                          as lfd,   -- last finish date
  max(p.end_date)                                          as led,
  max(p.start_date)                                        as lsd,
  max(p.investment_amount)                                 as old_loan_amount
from members m
left join portfolios p on p.profile_id = m.profile_id
group by m.profile_id;

-- Entry 02 as the form actually shows it
create or replace view v_proposals as
select
  pr.proposal_id,
  pr.old_mcl,
  pr.prospect_date,
  pr.proposed_loan_amount,
  pr.proposed_duration_months,
  vp.last_portfolio      as lst_pfn,
  vp.old_loan_amount,
  m.profile_id,
  m.member_name          as customer_name,
  m.business_name,
  pr.zero_install,
  m.area_code            as area,
  z.name                 as zone,
  c.name                 as category,
  pr.cr_score,
  vp.lfd, vp.led, vp.lsd,
  vp.no_of_portfolios    as mem_pf,
  m.off_day              as offday,
  round(
    (pr.proposed_loan_amount + pr.proposed_loan_amount * 0.03 * coalesce(pr.proposed_duration_months,1))
    / nullif(coalesce(pr.proposed_duration_months,1) * (case when m.off_day = 'Fri' then 25 else 20 end), 0)
  )                      as proposed_installment,
  cro.name               as cro,
  inc.name               as incharge,
  pr.stage
from proposals pr
join members m           on m.profile_id = pr.profile_id
left join v_member_portfolio vp on vp.profile_id = m.profile_id
left join zones z        on z.id = m.zone_id
left join categories c   on c.code = m.category_code
left join employees cro  on cro.emp_id = pr.cro_id
left join employees inc  on inc.emp_id = pr.incharge_id;

-- Entry 03 as the form shows it
create or replace view v_fprc as
select
  f.proposal_id                as prospect_id,
  m.member_name                as client_name,
  pr.prospect_date,
  f.rfp_date,
  f.cr_score,
  f.regularity_score,
  f.performance_score,
  f.previous_loan_amount,
  pr.proposed_loan_amount,
  case when coalesce(f.previous_loan_amount,0) = 0 then null
       else round((pr.proposed_loan_amount - f.previous_loan_amount)
                  / f.previous_loan_amount * 100, 2) end as increase_decrease_pct,
  f.ai_remarks, f.active_rating, f.approved, f.approved_date,
  f.feasibility_date, f.fs_score_pct, f.risk_score, f.feasibility_score,
  f.rejected, f.comments, f.remarks,
  m.member_id, m.zone_id, m.category_code
from fprc f
join proposals pr on pr.proposal_id = f.proposal_id
join members m    on m.profile_id = pr.profile_id;

-- Entry 04 as the form shows it, with the whole installment calc
create or replace view v_lmc as
with base as (
  select
    l.*,
    pr.prospect_date                       as applied_date,
    pr.proposed_loan_amount                as proposed_amount,
    pr.proposed_duration_months            as prop_dur,
    m.profile_id, m.member_name, m.business_name, m.off_day,
    (case when m.off_day = 'Fri' then 1 else 1 end)                  as weekly_off_days_no,
    (case when m.off_day = 'Fri' then 25 else 20 end)                as collection_days_monthly,
    coalesce(l.approved_amount, pr.proposed_loan_amount)             as amt,
    coalesce(l.approved_duration_months, pr.proposed_duration_months, 1) as dur,
    f.fs_score_pct
  from lmc l
  join proposals pr on pr.proposal_id = l.proposal_id
  join members m    on m.profile_id = pr.profile_id
  left join fprc f  on f.proposal_id = l.proposal_id
)
select
  proposal_id, applied_date, approved_date, proposed_amount, prop_dur,
  approved_amount, approved_duration_months,
  pm_check, dir_check, contr_check, ceo_check,
  member_name as customer_name, business_name, profile_id, off_day as offday,
  weekly_off_days_no, collection_days_monthly,
  dur * collection_days_monthly                       as total_no_of_installment,
  amt + amt * 0.03 * dur                              as total_receivable,
  round((amt + amt * 0.03 * dur)
        / nullif(dur * collection_days_monthly, 0))   as proposed_installment_amount,
  coalesce(actual_installment,
           round((amt + amt * 0.03 * dur)
                 / nullif(dur * collection_days_monthly, 0)))  as actual_installment,
  pm_time, approved_time, disbursed_date, start_date, end_date, fs_score_pct as fs_pct
from base;
