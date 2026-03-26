import { getMemoById } from '@/lib/memoStore';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MemoShareView from './MemoShareView';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const memo = await getMemoById(id);
  if (!memo) return { title: 'Memo not found' };
  return {
    title: `${memo.company} — DealMemo`,
    description: `AI-generated deal memo for ${memo.company}`,
  };
}

export default async function MemoSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memo = await getMemoById(id);
  if (!memo) notFound();

  return <MemoShareView memo={memo} />;
}
