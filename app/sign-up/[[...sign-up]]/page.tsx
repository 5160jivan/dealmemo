import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-7rem)]">
      <SignUp />
    </div>
  );
}
