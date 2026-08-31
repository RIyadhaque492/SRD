import { NextRequest, NextResponse } from 'next/server';
import { importWorkbook } from '@/lib/importer';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Attach a file under the field name "file".' }, { status: 400 });
  }
  if (!/\.(xlsx|xlsm|csv)$/i.test(file.name)) {
    return NextResponse.json({ error: 'Upload an .xlsx, .xlsm or .csv file.' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File is over 8 MB. Split it by sheet, or import collections separately.' },
      { status: 413 },
    );
  }

  try {
    const result = await importWorkbook(await file.arrayBuffer(), file.name);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
