import { redirect } from "next/navigation";
import { getSteamSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSteamSession();

  redirect(session ? "/dashboard" : "/login");
}
