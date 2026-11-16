import { createHash } from "node:crypto";

export function legacyTripShareFilter(token) {
  return {
    shareTokenHash: createHash("sha256").update(token).digest("hex"),
    OR: [{ shareTokenExpiresAt: null }, { shareTokenExpiresAt: { gt: new Date() } }],
  };
}
