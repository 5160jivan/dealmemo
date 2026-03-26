import { getMemoById } from '@/lib/memoStore';
import { generatePptx } from '@/lib/pptxGenerator';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memo = await getMemoById(id);

  if (!memo) {
    return Response.json({ error: 'Memo not found' }, { status: 404 });
  }

  try {
    const buffer = await generatePptx(memo);
    const slug = memo.company.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 50);

    // Upload to Vercel Blob if configured → return shareable URL
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(`dealmemo/${memo.id}-${slug}.pptx`, buffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      return Response.json({ url: blob.url, filename: `${slug}-deal-memo.pptx` });
    }

    // Fallback: direct binary download
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${slug}-deal-memo.pptx"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[PPTX] generation error:', err);
    return Response.json({ error: 'Failed to generate PPTX' }, { status: 500 });
  }
}
