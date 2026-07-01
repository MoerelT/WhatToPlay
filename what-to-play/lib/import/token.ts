import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/lib/env";

type ImportTokenPayload = {
  exp: number;
  iat: number;
  profileId: string;
};

function sign(value: string) {
  return createHmac("sha256", requireEnv("SESSION_SECRET"))
    .update(`import:${value}`)
    .digest("base64url");
}

export function createImportToken(profileId: string) {
  const now = Date.now();
  const payload: ImportTokenPayload = {
    exp: now + 15 * 60 * 1000,
    iat: now,
    profileId,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${sign(encoded)}`;
}

export function verifyImportToken(token: string) {
  const [encoded, signature, extra] = token.split(".");

  if (!encoded || !signature || extra) {
    return null;
  }

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as ImportTokenPayload;

    const now = Date.now();

    return (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.profileId,
      ) &&
      Number.isSafeInteger(payload.iat) &&
      Number.isSafeInteger(payload.exp) &&
      payload.iat <= now + 60_000 &&
      payload.exp > now &&
      payload.exp - payload.iat === 15 * 60 * 1000
    )
      ? payload
      : null;
  } catch {
    return null;
  }
}
