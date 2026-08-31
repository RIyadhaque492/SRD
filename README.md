# SRD loan operations

A Postgres-backed web app built from the SRD spec: member profiles feed loan
proposals, proposals go through feasibility review, and approved proposals become
loans. It runs on Vercel and imports your existing Excel workbook.

---

## What's in here

```
db/schema.sql        tables + views. Run this once.
lib/columns.ts       Excel header -> database column map. Edit this, not your spreadsheets.
lib/calc.ts          service charge, installment maths, cell coercion
lib/importer.ts      workbook parsing, header detection, validation, upsert
app/api/import       POST a file here
app/api/template     GET a blank workbook with the right headers
app/api/{members,proposals,fprc,lmc}   read + write endpoints
app/                 pipeline dashboard, member list, proposal list, upload page
```

## The one design decision worth understanding

Your SRD marks many fields as **Auto**, **PortFolio**, or **Connected** — Customer Name
and Area on Entry 02, Applied Date and Proposed Amount on Entry 04, No of Portfolios on
Entry 01. In a spreadsheet those are VLOOKUPs. In a database they must not be columns.

If you store `customer_name` on the proposal and the member later corrects their name,
you now have two answers and no way to tell which is right. So the tables hold only
what a human types, and the views (`v_proposals`, `v_fprc`, `v_lmc`,
`v_member_portfolio`) compute everything else on read. Your forms and reports select
from the views and see all the same fields as the spreadsheet.

The importer accepts the derived columns in the upload file and simply ignores them —
existing workbooks import without editing.

## Two numbers to confirm before you go live

Both live at the top of `lib/calc.ts`.

**Service charge — 3% per month, flat.** Read off your Portfolio sheet: 300,000 over 6
months carries 54,000. That held on every row I checked. Your SRD note reads
`(100000*0.3)*month`, which would be 30% per month — I've assumed that's shorthand for
0.03 and the maths confirms it.

**Collection days per month — 25 for a Friday off day, 20 otherwise.** That's what the
SRD says, but the Portfolio sheet has Thursday rows on both divisors (6 months → 120
installments in one row, 5 months → 125 in another). Decide which rule is real, because
it changes every installment figure.

---

## Setup

### 1. Create the database

Sign in at [neon.tech](https://neon.tech), create a project, open the **SQL Editor**,
paste all of `db/schema.sql`, run it. Then copy the **pooled** connection string from
the Connect dialog.

Vercel Postgres works identically — it's Neon underneath.

### 2. Run it locally

```bash
npm install
cp .env.example .env
# paste your connection string into .env
npm run dev
```

Open http://localhost:3000.

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "SRD app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/srd-app.git
git push -u origin main
```

### 4. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → import the repo.
2. Framework preset: **Next.js** (auto-detected). Leave the build settings alone.
3. Before deploying, add an environment variable:
   `DATABASE_URL` = your Neon pooled connection string. Tick all three environments.
4. Deploy.

Every `git push` to `main` redeploys. Pushes to other branches get preview URLs with the
same database, so use a separate Neon branch for those if you don't want previews writing
to live data.

### 5. Load your data

Go to `/import` and drop `SRD.xlsx` in. Import in this order the first time — the
foreign keys require it:

1. `1.DB_Member`
2. `5.Portfolio`
3. `2.PC_ClntMgt`
4. `3.PC_FPRC`, `4.PC_LMC`
5. `Import_ColxnMgt`

The upload handles the whole workbook at once, but the 45,000-row collections sheet will
run past Vercel's 60-second function limit on the Hobby plan. Save that sheet as its own
file and upload it separately, or upgrade to Pro (300s).

Lookup values — areas, zones, categories, employees — are worth loading first from your
`0.Lookup` sheet, otherwise the foreign keys reject members. Quickest path: comment out
the four `references` lines in the `members` table, import, then add them back once the
lookups are populated.

---

## How the importer works

**Sheet matching.** Sheet names are normalised (case, spaces, dots and dashes stripped)
and matched against `sheetHints` in `lib/columns.ts`. Unmatched sheets are reported and
skipped, never guessed at.

**Header detection.** Your sheets put headers on row 1, 2 and 3 depending on the sheet.
The importer scans the first six rows, counts how many cells match known headers, and
uses whichever row scores highest. Tested against your file: it finds row 2 for
DB_Member, row 3 for FPRC and LMC, row 1 for Import_ColxnMgt.

**Cell cleaning.** `#REF!`, `#N/A`, `--` and `NA` all become null. `2,04,000` becomes
204000. `6 Months` becomes 6. `0204-জিইসি-সেন্ট্রাল প্লাজা` becomes zone `0204`.
`মায়ের দোয়া / Mayer Doya` is split into Bangla and English columns.

**Re-uploading is safe.** Every row is an upsert on the primary key, so correcting a
mistake means fixing the spreadsheet and uploading the same file again. Collections have
no natural key, so they're de-duplicated on a content hash.

**Errors don't stop the run.** Bad rows are collected with their Excel row number and
shown in a table at the end; good rows still land.

### Adding a column later

Three edits, in this order:

1. `db/schema.sql` — add the column, and run the `alter table` in Neon.
2. `lib/columns.ts` — add a `Field` with every spreadsheet header that has ever been
   used for it.
3. The relevant view, if the column should appear on a form.

## Things to build next

- **Authentication.** There is none right now. Anyone with the URL can read and write
  everything. Add [Auth.js](https://authjs.dev) before this holds real member data.
  This matters more than any other item on this list.
- **Role gates on the LMC checks.** PM, Dir, Contr and CEO are stored as plain booleans;
  nothing yet stops one person ticking all four.
- **The scores marked "Need To Create"** in your SRD — CR Score, Regularity Score
  (RS Matrix 5.0), Performance Score. The collections table has the repayment history
  these need. Write them as SQL functions over `collections`, so they recompute as
  payments arrive rather than being typed in.
- **Backups.** Neon keeps a restore window, but export to S3 on a schedule too.
