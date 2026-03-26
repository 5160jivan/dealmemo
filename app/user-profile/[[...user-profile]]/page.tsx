import { UserProfile } from '@clerk/nextjs';

export default function UserProfilePage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-7rem)] py-10">
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
