import { auth } from '@clerk/nextjs/server';
import { getMemoById, updateMemo, DEAL_STATUSES } from '@/lib/memoStore';
import type { DealStatus } from '@/lib/memoStore';

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { status, notes } = body as { status?: DealStatus; notes?: string };

  if (status !== undefined && !DEAL_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
  }

  try {
    await updateMemo(id, userId, {
      status,
      notes: typeof notes === 'string' ? notes : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 404 });
  }
}
