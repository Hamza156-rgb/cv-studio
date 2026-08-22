import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  createCredentialUser: vi.fn(),
  getCredentialUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  touchCredentialUser: vi.fn(),
}));

vi.mock("./db", () => db);

import { authenticateCredentialAccount, getCredentialSessionUser, hashPassword, issueCredentialSession, verifyPassword } from "./credentialAuth";

describe("credential authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hashes passwords with unique salts and verifies only the correct password", async () => {
    const first = await hashPassword("very-safe-password");
    const second = await hashPassword("very-safe-password");
    expect(first).not.toBe(second);
    await expect(verifyPassword("very-safe-password", first)).resolves.toBe(true);
    await expect(verifyPassword("incorrect-password", first)).resolves.toBe(false);
  });

  it("does not authenticate an unknown account or an incorrect password", async () => {
    db.getCredentialUserByEmail.mockResolvedValue(undefined);
    await expect(authenticateCredentialAccount({ email: "nobody@example.com", password: "invalid-password" })).resolves.toBeNull();
    expect(db.touchCredentialUser).not.toHaveBeenCalled();
  });

  it("authenticates a matching account, updates its last sign-in, and resolves a signed session", async () => {
    const passwordHash = await hashPassword("very-safe-password");
    const user = { id: 71, openId: "credentials_example", name: "Taylor", email: "taylor@example.com", loginMethod: "credentials", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    db.getCredentialUserByEmail.mockResolvedValue({ user, credential: { passwordHash } });
    await expect(authenticateCredentialAccount({ email: "TAYLOR@example.com", password: "very-safe-password" })).resolves.toEqual(user);
    expect(db.getCredentialUserByEmail).toHaveBeenCalledWith("taylor@example.com");
    expect(db.touchCredentialUser).toHaveBeenCalledWith(71);
    db.getUserById.mockResolvedValue(user);
    const token = await issueCredentialSession(71);
    await expect(getCredentialSessionUser({ headers: { cookie: `cv_studio_session=${token}` } })).resolves.toEqual(user);
  });
});
