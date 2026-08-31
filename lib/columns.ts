/**
 * The column map is the contract between your Excel files and the database.
 * One entry per importable sheet. Add an alias here instead of renaming
 * columns in Excel — that is what keeps old workbooks importable.
 */

export type FieldKind = 'text' | 'int' | 'num' | 'date' | 'ts' | 'bool';

export interface Field {
  col: string;          // database column
  headers: string[];    // accepted spreadsheet headers (case/space-insensitive)
  kind: FieldKind;
  required?: boolean;
}

export interface Target {
  table: string;
  label: string;
  key: string;          // primary key column, used for upsert
  sheetHints: string[]; // sheet names we auto-detect
  fields: Field[];
}

export const TARGETS: Record<string, Target> = {
  members: {
    table: 'members',
    label: 'Entry 01 — Members',
    key: 'profile_id',
    sheetHints: ['1.db_member', 'db_member', 'members'],
    fields: [
      { col: 'profile_id',         headers: ['Profile ID', 'ProfileID'], kind: 'text', required: true },
      { col: 'member_name',        headers: ['Member Name', 'Customer Name'], kind: 'text', required: true },
      { col: 'primary_contact',    headers: ['Primary Contact', 'Contact'], kind: 'text' },
      { col: 'nid_no',             headers: ['NID No', 'NID'], kind: 'text' },
      { col: 'business_name',      headers: ['Business Name'], kind: 'text' },
      { col: 'business_address',   headers: ['Business Address'], kind: 'text' },
      { col: 'area_code',          headers: ['Business Area', 'Area', 'Area Name'], kind: 'text' },
      { col: 'zone_id',            headers: ['Zone Name', 'Zone'], kind: 'text' },
      { col: 'category_code',      headers: ['Business Category', 'Category'], kind: 'text' },
      { col: 'business_type_code', headers: ['Business Type'], kind: 'text' },
      { col: 'profile_date',       headers: ['Profile Date'], kind: 'date' },
      { col: 'father_name',        headers: ["Father's Name", 'Father Name'], kind: 'text' },
      { col: 'mother_name',        headers: ["Mother's Name", 'Mother Name'], kind: 'text' },
      { col: 'spouse_name',        headers: ['Spouse Name'], kind: 'text' },
      { col: 'spouse_contact',     headers: ['Spouse Contact'], kind: 'text' },
      { col: 'present_address',    headers: ['Present Address'], kind: 'text' },
      { col: 'permanent_address',  headers: ['Permanent Address'], kind: 'text' },
      { col: 'gender',             headers: ['Gender'], kind: 'text' },
      { col: 'religion',           headers: ['Religion'], kind: 'text' },
      { col: 'client_dob',         headers: ['Client DOB', 'DOB'], kind: 'date' },
      { col: 'perm_thana',         headers: ['Perm Thana', 'Thana'], kind: 'text' },
      { col: 'off_day',            headers: ['Off Day', 'Offday'], kind: 'text' },
      { col: 'old_mcl',            headers: ['Old MCL'], kind: 'text' },
      { col: 'business_name_bn',   headers: ['ব্যবসার নাম'], kind: 'text' },
      { col: 'sub_category_v2',    headers: ['Sub-Category-V2'], kind: 'text' },
      { col: 'member_id',          headers: ['MemberID'], kind: 'text' },
      { col: 'profile_updated',    headers: ['Profile Updated'], kind: 'ts' },
    ],
  },

  proposals: {
    table: 'proposals',
    label: 'Entry 02 — Proposals (ClntMgt)',
    key: 'proposal_id',
    sheetHints: ['2.pc_clntmgt', 'pc_clntmgt', 'proposals'],
    fields: [
      { col: 'proposal_id',              headers: ['ProposalID', 'Proposal ID'], kind: 'text', required: true },
      { col: 'profile_id',               headers: ['ProfileID', 'Profile ID'], kind: 'text', required: true },
      { col: 'old_mcl',                  headers: ['OldMCL', 'Old MCL'], kind: 'text' },
      { col: 'prospect_date',            headers: ['Prospect Date'], kind: 'date', required: true },
      { col: 'proposed_loan_amount',     headers: ['Proposed Loan Amount'], kind: 'num', required: true },
      { col: 'proposed_duration_months', headers: ['Proposed Duration (Months)', 'Prop_Dur', 'Duration'], kind: 'int' },
      { col: 'zero_install',             headers: ['Zero Install'], kind: 'bool' },
      { col: 'cr_score',                 headers: ['CR_Score', 'CR Score'], kind: 'num' },
      { col: 'cro_id',                   headers: ['CRO'], kind: 'text' },
      { col: 'incharge_id',              headers: ['InCharge'], kind: 'text' },
    ],
  },

  fprc: {
    table: 'fprc',
    label: 'Entry 03 — Feasibility (FPRC)',
    key: 'proposal_id',
    sheetHints: ['3.pc_fprc', 'pc_fprc', 'fprc'],
    fields: [
      { col: 'proposal_id',          headers: ['ProspectID', 'ProposalID'], kind: 'text', required: true },
      { col: 'rfp_date',             headers: ['RFP Date'], kind: 'date' },
      { col: 'cr_score',             headers: ['CR Score'], kind: 'num' },
      { col: 'regularity_score',     headers: ['Regularity Score (RS Matrix-5.0)', 'Regularity Score'], kind: 'num' },
      { col: 'performance_score',    headers: ['Performance Score'], kind: 'num' },
      { col: 'risk_score',           headers: ['Risk Score'], kind: 'num' },
      { col: 'feasibility_score',    headers: ['Feasibility Score'], kind: 'num' },
      { col: 'fs_score_pct',         headers: ['FS Score %', 'FS %'], kind: 'num' },
      { col: 'previous_loan_amount', headers: ['Previous Loan Amount'], kind: 'num' },
      { col: 'ai_remarks',           headers: ['AI Remarks/ Suggestions', 'AI Remarks'], kind: 'text' },
      { col: 'active_rating',        headers: ['Active Rating'], kind: 'text' },
      { col: 'approved',             headers: ['Approved'], kind: 'bool' },
      { col: 'approved_date',        headers: ['Approved Date'], kind: 'date' },
      { col: 'feasibility_date',     headers: ['Feasibiity Date', 'Feasibility Date'], kind: 'date' },
      { col: 'rejected',             headers: ['Rejected'], kind: 'bool' },
      { col: 'comments',             headers: ['Comments'], kind: 'text' },
      { col: 'remarks',              headers: ['Remarks'], kind: 'text' },
    ],
  },

  lmc: {
    table: 'lmc',
    label: 'Entry 04 — Loan Management (LMC)',
    key: 'proposal_id',
    sheetHints: ['4.pc_lmc', 'pc_lmc', 'lmc'],
    fields: [
      { col: 'proposal_id',              headers: ['ProposalID'], kind: 'text', required: true },
      { col: 'approved_date',            headers: ['Approved Date'], kind: 'date' },
      { col: 'approved_amount',          headers: ['Approved Amount'], kind: 'num' },
      { col: 'approved_duration_months', headers: ['Approved  Duration', 'Approved Duration'], kind: 'int' },
      { col: 'pm_check',                 headers: ['PM'], kind: 'bool' },
      { col: 'dir_check',                headers: ['Dir'], kind: 'bool' },
      { col: 'contr_check',              headers: ['Contr'], kind: 'bool' },
      { col: 'ceo_check',                headers: ['CEO'], kind: 'bool' },
      { col: 'pm_time',                  headers: ['PM Time'], kind: 'ts' },
      { col: 'approved_time',            headers: ['Approved Time'], kind: 'ts' },
      { col: 'disbursed_date',           headers: ['Disbursed Date'], kind: 'date' },
      { col: 'start_date',               headers: ['Start Date'], kind: 'date' },
      { col: 'end_date',                 headers: ['End Date'], kind: 'date' },
      { col: 'actual_installment',       headers: ['Actual Installment'], kind: 'num' },
    ],
  },

  portfolios: {
    table: 'portfolios',
    label: 'Portfolio',
    key: 'portfolio_no',
    sheetHints: ['5.portfolio', 'portfolio'],
    fields: [
      { col: 'portfolio_no',      headers: ['Portfolio No'], kind: 'text', required: true },
      { col: 'proposal_id',       headers: ['ProposalID'], kind: 'text' },
      { col: 'profile_id',        headers: ['Profile ID', 'ProfileID'], kind: 'text' },
      { col: 'investment_amount', headers: ['Investment Amount'], kind: 'num' },
      { col: 'disbursed_date',    headers: ['Disbursed Date'], kind: 'date' },
      { col: 'start_date',        headers: ['Start Date'], kind: 'date' },
      { col: 'end_date',          headers: ['End Date'], kind: 'date' },
      { col: 'duration_months',   headers: ['Duration'], kind: 'int' },
      { col: 'off_day',           headers: ['Offday', 'Off Day'], kind: 'text' },
      { col: 'service_charge',    headers: ['Profit/ Service Charge', 'Service Charge'], kind: 'num' },
      { col: 'ddbs',              headers: ['DDBS'], kind: 'num' },
      { col: 'proc_fee',          headers: ['Proc Fee'], kind: 'num' },
      { col: 'stamp_fee',         headers: ['Stamp Fee'], kind: 'num' },
      { col: 'instl_amount',      headers: ['Instl Amount'], kind: 'num' },
      { col: 'disbursed_amount',  headers: ['Disbursed Amount'], kind: 'num' },
      { col: 'outstandings',      headers: ['Outstandings'], kind: 'num' },
      { col: 'total_collected',   headers: ['Total Cltd'], kind: 'num' },
      { col: 'status',            headers: ['Status'], kind: 'text' },
      { col: 'area_code',         headers: ['Area Name', 'Area'], kind: 'text' },
      { col: 'finished_date',     headers: ['Finished Date'], kind: 'date' },
    ],
  },

  collections: {
    table: 'collections',
    label: 'Collections',
    key: 'source_hash',
    sheetHints: ['import_colxnmgt', 'collections', 'colxnmgt'],
    fields: [
      { col: 'portfolio_no',     headers: ['PF No', 'Portfolio No'], kind: 'text', required: true },
      { col: 'entry_date',       headers: ['Entry Date'], kind: 'ts' },
      { col: 'transaction_date', headers: ['Transaction Date'], kind: 'date', required: true },
      { col: 'amount',           headers: ['Amount'], kind: 'num', required: true },
      { col: 'entry_by',         headers: ['Entry By'], kind: 'text' },
      { col: 'area_code',        headers: ['Area'], kind: 'text' },
      { col: 'checked',          headers: ['Checked'], kind: 'bool' },
      { col: 'checked_time',     headers: ['CheckedTime'], kind: 'ts' },
      { col: 'audited',          headers: ['Audited'], kind: 'bool' },
      { col: 'audited_time',     headers: ['Audited Time'], kind: 'ts' },
      { col: 'remarks',          headers: ['Remarks'], kind: 'text' },
      { col: 'old_new',          headers: ['Old/ New', 'Old/New'], kind: 'text' },
      { col: 'particulars',      headers: ['Particulars'], kind: 'text' },
      { col: 'installment',      headers: ['Installment'], kind: 'num' },
      { col: 'cro',              headers: ['CRO'], kind: 'text' },
      { col: 'profit_earned',    headers: ['Profit Earned'], kind: 'num' },
      { col: 'status',           headers: ['Status'], kind: 'text' },
    ],
  },
};

export const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/[\s_.\-/()]+/g, '');

export function detectTarget(sheetName: string): string | null {
  const n = norm(sheetName);
  for (const [key, t] of Object.entries(TARGETS)) {
    if (t.sheetHints.some((h) => norm(h) === n || n.includes(norm(h)))) return key;
  }
  return null;
}
