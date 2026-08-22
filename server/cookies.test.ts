import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("session cookie options", () => {
  it("uses secure cross-site settings for HTTPS requests", () => {
    expect(getSessionCookieOptions({ protocol: "https", headers: {} } as any)).toMatchObject({ secure: true, sameSite: "none", httpOnly: true, path: "/" });
  });

  it("uses a browser-compatible Lax cookie for local HTTP development", () => {
    expect(getSessionCookieOptions({ protocol: "http", headers: {} } as any)).toMatchObject({ secure: false, sameSite: "lax", httpOnly: true, path: "/" });
  });
});
