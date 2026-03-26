import { getMemoById } from '@/lib/memoStore';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memo = await getMemoById(id);

  if (!memo) {
    return new Response(JSON.stringify({ error: 'Memo not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return without userId for public access
  const { userId: _userId, ...publicMemo } = memo;
  return Response.json(publicMemo);
}
