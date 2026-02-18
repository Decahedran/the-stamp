import { RequireAuth } from "@/components/layout/require-auth";
import { ProfileView } from "@/components/profile/profile-view";

type ProfilePageProps = {
  params: {
    address: string;
  };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <RequireAuth>
      <ProfileView address={params.address} />
    </RequireAuth>
  );
}
