import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@shared/resume";
import { downloadResumePdf } from "./resumePdf";

describe("server-rendered PDF download", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the live-preview data and saves the returned PDF under the server's file name", async () => {
    const click = vi.fn();
    const link = { click, remove: vi.fn(), href: "", download: "" };
    vi.stubGlobal("document", { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:cv"), revokeObjectURL: vi.fn() });
    vi.stubGlobal("window", { setTimeout: vi.fn() });
    const fetchMock = vi.fn(async () => new Response(new Blob(["%PDF-1.4"]), { status: 200, headers: { "Content-Disposition": 'attachment; filename="Alex_Morgan_CV.pdf"' } }));
    vi.stubGlobal("fetch", fetchMock);

    const data = sampleResumeData("atlas");
    const fileName = await downloadResumePdf({ data, template: "atlas", title: "Untitled resume" });

    expect(fetchMock).toHaveBeenCalledWith("/api/resume/pdf", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ template: "atlas", title: "Untitled resume", data: { fullName: data.fullName } });
    expect(fileName).toBe("Alex_Morgan_CV.pdf");
    expect(link.download).toBe("Alex_Morgan_CV.pdf");
    expect(click).toHaveBeenCalled();
  });

  it("surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "The PDF service is busy." }), { status: 429 })));
    await expect(downloadResumePdf({ data: sampleResumeData("modern"), template: "modern", title: "CV" })).rejects.toThrow("The PDF service is busy.");
  });
});
