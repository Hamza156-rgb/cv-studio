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

describe("expanded template rendering", () => {
  afterEach(() => cleanup());

  it("renders a selected headshot in the photo-ready Horizon layout", () => {
    const data = { ...sampleResumeData("horizon"), photoUrl: "https://images.example.test/horizon.jpg" };
    render(<ResumeDocument template="horizon" data={data} />);
    const photo = screen.getByRole("img", { name: "Alex Morgan headshot" }) as HTMLImageElement;
    expect(photo.src).toBe("https://images.example.test/horizon.jpg");
  });

  it("shows a premium headshot placement in the Editorial layout", () => {
    render(<ResumeDocument template="editorial" data={sampleResumeData("editorial")} />);
    expect(screen.getByLabelText("Headshot placement").textContent).toBe("AM");
  });

  it("renders formatted experience descriptions as selectable rich text", () => {
    const data = { ...sampleResumeData("modern"), experiences: [{ ...sampleResumeData("modern").experiences[0], description: "**Led** a team\n- Shipped *faster* releases" }] };
    render(<ResumeDocument template="modern" data={data} />);
    expect(screen.getByText("Led").tagName).toBe("STRONG");
    expect(screen.getByText("faster").tagName).toBe("EM");
    expect(screen.getAllByRole("list").length).toBeGreaterThanOrEqual(1);
  });

  it("renders formatted summary and project descriptions", () => {
    const base = sampleResumeData("modern");
    const data = { ...base, summary: "**Product leader** with *clarity*.", projects: [{ ...base.projects[0], liveDemoUrl: "portfolio.example.com/demo", githubUrl: "github.com/alex/project", caseStudyUrl: "portfolio.example.com/case-study", description: "- Built a polished experience" }] };
    render(<ResumeDocument template="modern" data={data} />);
    expect(screen.getByText("Product leader").tagName).toBe("STRONG");
    expect(screen.getByText("clarity").tagName).toBe("EM");
    expect(screen.getByText("Built a polished experience")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Live demo" }).getAttribute("href")).toBe("https://portfolio.example.com/demo");
    expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe("https://github.com/alex/project");
    expect(screen.getByRole("link", { name: "Case study" }).getAttribute("href")).toBe("https://portfolio.example.com/case-study");
  });

  it("shows experience as role, company, location, dates, and work without empty placeholders", () => {
    const base = sampleResumeData("modern");
    const data = { ...base, experiences: [{ ...base.experiences[0], role: "", company: "Northstar Systems", location: "Remote", start: "2022", end: "2024", current: false, description: "Led the platform." }] };
    render(<ResumeDocument template="modern" data={data} />);
    expect(screen.getByText("Northstar Systems")).toBeTruthy();
    expect(screen.getByText("Remote")).toBeTruthy();
    expect(screen.getByText("2022 — 2024")).toBeTruthy();
    expect(screen.getByText("Led the platform.")).toBeTruthy();
    expect(screen.queryByText("Role title")).toBeNull();
  });

  it("sorts experience newest first and supports a compact ATS presentation", () => {
    const base = sampleResumeData("modern");
    const data = { ...base, theme: { ...base.theme, atsMode: true }, photoUrl: "https://images.example.test/photo.jpg", experiences: [
      { ...base.experiences[0], id: "older", role: "Older role", start: "2019", end: "2021", current: false },
      { ...base.experiences[0], id: "newer", role: "Newer role", start: "2023", end: "", current: true },
    ] };
    const { container } = render(<ResumeDocument template="modern" data={data} />);
    const headings = Array.from(container.querySelectorAll(".resume-experience-entry h3")).map((heading) => heading.textContent);
    expect(headings).toEqual(["Newer role", "Older role"]);
    expect(container.querySelector(".resume-ats")).not.toBeNull();
    expect(container.querySelector(".resume-ats .resume-photo")).toBeNull();
  });

  it("renders formatted education, awards, and volunteer descriptions", () => {
    const base = sampleResumeData("modern");
    const data = { ...base, education: [{ ...base.education[0], description: "**Research** and *systems*" }], awards: [{ id: "award-1", name: "Award", issuer: "Guild", date: "2025", description: "- Recognized for impact" }], volunteer: [{ id: "volunteer-1", organization: "Community", role: "Mentor", start: "2024", end: "", description: "**Guided** new designers" }] };
    render(<ResumeDocument template="modern" data={data} />);
    expect(screen.getByText("Research").tagName).toBe("STRONG");
    expect(screen.getByText("systems").tagName).toBe("EM");
    expect(screen.getByText("Recognized for impact")).toBeTruthy();
    expect(screen.getByText("Guided").tagName).toBe("STRONG");
  });

  it("keeps every new ATS-oriented layout intentionally photo-free", () => {
    (["atlas", "monograph", "ledger"] as const).forEach((template) => {
      const data = { ...sampleResumeData(template), photoUrl: `https://images.example.test/${template}.jpg` };
      const { container, unmount } = render(<ResumeDocument template={template} data={data} />);
      expect(container.querySelector(`.resume-${template}`)).not.toBeNull();
      expect(screen.queryByRole("img", { name: "Alex Morgan headshot" })).toBeNull();
      unmount();
    });
  });
});
