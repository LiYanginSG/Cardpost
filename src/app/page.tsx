import { redirect } from "next/navigation";
import { getUser, isOnboarded } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const u = await getUser();
  if (!u) redirect("/login");
  redirect(isOnboarded(u) ? "/mailbox" : "/onboarding");
}
