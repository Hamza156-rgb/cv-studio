// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authMe: { setData: vi.fn(), invalidate: vi.fn() }, signIn: vi.fn(), signUp: vi.fn(), toastError: vi.fn(), signInError: "" }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: mocks.authMe } }),
    auth: {
      signIn: { useMutation: (options: { onError?: (error: { message: string }) => void }) => ({ isPending: false, mutate: (input: unknown) => { mocks.signIn(input); if (mocks.signInError) options.onError?.({ message: mocks.signInError }); } }) },
      signUp: { useMutation: () => ({ isPending: false, mutate: mocks.signUp }) },
    },
  },
}));

vi.mock("@/components/StudioNav", () => ({ Brand: () => <span>CV Studio</span> }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

import Auth from "./Auth";

describe("credential screens", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.signInError = ""; });
  afterEach(() => { cleanup(); });

  it("toggles the login password between hidden and visible states with the eye control", () => {
    render(<Auth mode="login" />);
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(password.type).toBe("password");
    fireEvent.click(toggle);
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("renders signup requirements and sends the supplied credential fields through the signup contract", () => {
    render(<Auth mode="signup" />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Jordan Taylor" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create my account" }).closest("form")!);
    expect(mocks.signUp).toHaveBeenCalledWith({ name: "Jordan Taylor", email: "jordan@example.com", password: "secure-password" });
    expect(screen.getByText("8–128 characters").textContent).toBe("8–128 characters");
  });

  it("shows a clear user-facing message when a sign-in mutation fails", () => {
    mocks.signInError = "Incorrect email or password.";
    render(<Auth mode="login" />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "incorrect-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in to CV Studio" }).closest("form")!);
    expect(mocks.toastError).toHaveBeenCalledWith("Incorrect email or password.");
  });
});
