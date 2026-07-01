import { NextRequest, NextResponse } from "next/server";
import {
  importBrowserGames,
  type BrowserImportGame,
  type BrowserImportSource,
} from "@/lib/import/browser-import";
import { verifyImportToken } from "@/lib/import/token";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
};

const sources = new Set([
  "instant_gaming",
  "retroachievements",
  "steam_family",
]);

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    headers: corsHeaders,
    status,
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders,
    status: 204,
  });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > 1_000_000) {
    return json({ error: "Import payload too large" }, 413);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const payload = verifyImportToken(token);

  if (!payload) {
    return json({ error: "Invalid import token" }, 401);
  }

  let body: {
    games?: BrowserImportGame[];
    source?: BrowserImportSource;
  };

  try {
    body = (await request.json()) as {
      games?: BrowserImportGame[];
      source?: BrowserImportSource;
    };
  } catch {
    return json({ error: "Invalid import payload" }, 400);
  }

  if (
    !sources.has(body.source ?? "") ||
    !Array.isArray(body.games) ||
    body.games.length === 0 ||
    body.games.length > 2000
  ) {
    return json({ error: "Invalid import payload" }, 400);
  }

  const result = await importBrowserGames(
    payload.profileId,
    body.source!,
    body.games,
  );

  return json(result);
}
