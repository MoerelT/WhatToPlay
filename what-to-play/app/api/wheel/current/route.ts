import { NextRequest, NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import {
  clearActiveWheel,
  createWheel,
} from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";
import type { DifficultyLevel, WheelSelectionStrategy } from "@/types/backlog";

const difficulties = new Set(["hard", "medium", "easy"]);
const strategies = new Set(["random", "difficulty", "duration", "balanced"]);

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
    autoPick?: boolean;
    difficulty?: DifficultyLevel;
    selectionStrategy?: WheelSelectionStrategy;
  };

  if (!difficulties.has(body.difficulty ?? "")) {
    return NextResponse.json({ error: "Difficulte invalide." }, { status: 400 });
  }

  if (!strategies.has(body.selectionStrategy ?? "random")) {
    return NextResponse.json({ error: "Tri invalide." }, { status: 400 });
  }

  try {
    const result = await createWheel(
      profile.id,
      body.difficulty!,
      body.autoPick ?? true,
      body.selectionStrategy ?? "random",
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "WHEEL_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: "Une roue active existe deja." },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE() {
  const session = await getSteamSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileBySteamId(session.steamId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await clearActiveWheel(profile.id);

  return NextResponse.json({ wheel: null });
}
