import { redirect } from "next/navigation";
import { getSteamSession } from "@/lib/auth/session";
import { getProfileBySteamId } from "@/lib/profiles";

export async function requireProfile() {
  const session = await getSteamSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    redirect("/login");
  }

  return profile;
}
