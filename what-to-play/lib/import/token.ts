import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/lib/env";

type ImportTokenPayload = {
  exp: number;
  profileId: string;
};

function sign(value: string) {
  return createHmac("sha256", requireEnv("SESSION_SECRET"))
    .update(value)
    .digest("base64url");
}

export function createImportToken(profileId: string) {
  const payload: ImportTokenPayload = {
    exp: Date.now() + 15 * 60 * 1000,
    profileId,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${sign(encoded)}`;
}

export function verifyImportToken(token: string) {
  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

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

    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
