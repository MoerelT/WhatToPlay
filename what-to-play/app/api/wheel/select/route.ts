import { NextRequest, NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { selectWheelGame } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";
import type { SlotType } from "@/types/backlog";

const slotTypes = new Set(["regular", "free"]);

export async function POST(request: NextRequest) {
  const session = await getSteamSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    gameId?: string;
    slotType?: SlotType;
  };
  const slotType = body.slotType ?? "regular";

  if (!body.gameId || !slotTypes.has(slotType)) {
    return NextResponse.json({ error: "Selection invalide." }, { status: 400 });
  }

  try {
    const result = await selectWheelGame(profile.id, body.gameId, slotType);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_WHEEL") {
      return NextResponse.json(
        { error: "Cree une roue avant de choisir un jeu." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "NO_SLOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Aucun slot disponible pour ce type." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "NO_LIBRARY_CANDIDATE") {
      return NextResponse.json(
        { error: "Ce jeu ne peut pas etre choisi pour cette roue." },
        { status: 409 },
      );
    }

    throw error;
  }
}
