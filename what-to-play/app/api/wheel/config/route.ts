import { NextRequest, NextResponse } from "next/server";
import { getSteamSession } from "@/lib/auth/session";
import { updateActiveWheel } from "@/lib/backlog/queries";
import { getProfileBySteamId } from "@/lib/profiles";
import type {
  DifficultyLevel,
  WheelSelectionStrategy,
} from "@/types/backlog";

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
    difficulty?: DifficultyLevel;
    selectionStrategy?: WheelSelectionStrategy;
  };

  if (!difficulties.has(body.difficulty ?? "")) {
    return NextResponse.json({ error: "Invalid wheel config" }, { status: 400 });
  }

  if (!strategies.has(body.selectionStrategy ?? "random")) {
    return NextResponse.json({ error: "Invalid wheel strategy" }, { status: 400 });
  }

  try {
    const wheel = await updateActiveWheel(profile.id, {
      difficulty: body.difficulty!,
      selectionStrategy: body.selectionStrategy ?? "random",
    });

    return NextResponse.json({ wheel });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_WHEEL") {
      return NextResponse.json(
        { error: "Cree une roue avant de changer la difficulte." },
        { status: 409 },
      );
    }

    throw error;
  }
}
