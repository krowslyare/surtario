import { ConvexError } from "convex/values";

// A bearer capability, not an asserted user ID. Only synthetic studies are accepted.
export async function ownerHash(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ConvexError("Invalid session.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
