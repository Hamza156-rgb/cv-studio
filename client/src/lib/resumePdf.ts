import type { ResumeData, ResumeTemplateId } from "@shared/resume";

/** Asks the server to print the live-preview template to PDF and saves the file. */
export async function downloadResumePdf({ data, title, template }: { data: ResumeData; title: string; template: ResumeTemplateId }) {
  const response = await fetch("/api/resume/pdf", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, title, template }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || "Your resume could not be downloaded. Please try again.");
  }
  const fileName = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "Resume_CV.pdf";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
