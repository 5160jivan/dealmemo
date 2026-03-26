import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-7rem)]">
      <SignIn />
    </div>
  );
}
