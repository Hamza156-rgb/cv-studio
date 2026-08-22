// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { sampleResumeData } from "@shared/resume";
import { ResumeDocument } from "./ResumeDocument";

describe("Portrait resume template", () => {
  afterEach(() => cleanup());

  it("shows a designed initials placeholder when the user has not added a headshot", () => {
    render(<ResumeDocument template="portrait" data={sampleResumeData("portrait")} />);
    expect(screen.getByLabelText("Headshot placement").textContent).toBe("AM");
  });

  it("renders an uploaded headshot in the designed Portrait placement", () => {
    const data = { ...sampleResumeData("portrait"), photoUrl: "https://images.example.test/jordan.jpg" };
    render(<ResumeDocument template="portrait" data={data} />);
    const photo = screen.getByRole("img", { name: "Alex Morgan headshot" }) as HTMLImageElement;
    expect(photo.src).toBe("https://images.example.test/jordan.jpg");
  });
});

