import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';

export default function UserProfilePage() {
  return (
    <div className="flex-1 flex flex-col items-center min-h-[calc(100vh-7rem)] py-10 px-5">
      <div className="w-full max-w-3xl mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to research
        </Link>
      </div>
      <UserProfile
        path="/user-profile"
        appearance={{
          elements: {
            rootBox: 'shadow-lg shadow-stone-200/60 rounded-2xl overflow-hidden',
          },
        }}
      />
    </div>
  );
}
