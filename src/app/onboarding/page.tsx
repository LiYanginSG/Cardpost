import { redirect } from "next/navigation";
import { getUser, isOnboarded } from "@/server/auth";
import { OnboardForm } from "./onboard-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up" };

export default async function Onboarding() {
  const u = await getUser();
  if (!u) redirect("/login");
  if (isOnboarded(u)) redirect("/mailbox");
  return (
    <div className="auth">
      <div className="stripe" />
      <div className="top">
        <div className="mark" />
        <h1>Where do you post from?</h1>
        <p>Your city sets every distance, delivery time and postage cost. It's printed in the postmark on every card you send.</p>
        <OnboardForm email={u.email} />
      </div>
    </div>
  );
}
