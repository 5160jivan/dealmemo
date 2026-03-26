'use client';

import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function HeaderAuth() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return <div className="w-8 h-8" />;

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: { avatarBox: 'w-8 h-8' },
        }}
      />
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
        Sign in
      </button>
    </SignInButton>
  );
}
