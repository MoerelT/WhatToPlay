import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { spinWheel } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";

export async function POST() {
  const session = await getSteamSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const result = await spinWheel(profile.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_WHEEL") {
      return NextResponse.json(
        { error: "Cree une roue avant de tirer un jeu." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "NO_SLOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Aucun slot disponible pour cette difficulte." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "NO_LIBRARY_CANDIDATE") {
      return NextResponse.json(
        { error: "Aucun jeu disponible. Synchronise ta bibliotheque Steam." },
        { status: 409 },
      );
    }

    throw error;
  }
}
