import { ProfileForm } from "@/components/studio/profile-form";
import { getCreatorProfile } from "@/lib/creator";
import { getCurrentUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = user.role === "CREATOR" ? await getCreatorProfile() : null;

  return (
    <div className="studio-page">
      <div className="page-heading"><div><span className="eyebrow">Profile</span><h1>{profile ? "Your creator identity" : "Profile settings"}</h1><p>{profile ? "Keep your public details current and review the payout status reported by Frame." : user.role === "VIEWER" ? "Enable a creator profile to manage your public identity and payout status." : "Review the access available to your administrator account."}</p></div></div>
      <ProfileForm key={profile?.id ?? user.role} user={user} initialProfile={profile} />
    </div>
  );
}
