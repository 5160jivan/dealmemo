import { auth } from '@clerk/nextjs/server';
import { getUserMemos } from '@/lib/memoStore';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const memos = await getUserMemos(userId);
  return Response.json(memos);
}
