import type { RESUME_TEMPLATES, ResumeData, ResumeTemplateId } from "@shared/resume";

/** Typed client for every endpoint of the CV Studio REST API (/api/v1). See docs/MOBILE_API.md. */

export const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || "http://localhost:3000";
const API_BASE = `${API_ORIGIN}/api/v1`;

export type User = { id: number; name: string | null; email: string | null; createdAt: string };
export type Session = { token: string; tokenType: "Bearer"; expiresAt: string; user: User };
export type Template = (typeof RESUME_TEMPLATES)[number];
export type Resume = { id: number; userId: number; title: string; template: ResumeTemplateId; data: ResumeData; createdAt: string; updatedAt: string };
export type Photo = { id: number; fileName: string; mimeType: string; url: string; storageUrl: string; createdAt: string };
export type ImportResult = { fileName: string; format: "pdf" | "docx"; data: ResumeData; textPreview: string; warnings: string[] };
export type PdfFile = { blob: Blob; fileName: string };

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: { path: string; message: string }[]) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set by the auth layer; the token is attached to every request as `Authorization: Bearer`. */
export function setAuthToken(token: string | null) { authToken = token; }
/** Called when an authenticated request comes back 401 (expired or revoked token). */
export function setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; }

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach CV Studio. Check your connection and try again.");
  }
  if (response.ok) return response;
  const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string; details?: { path: string; message: string }[] } } | null;
  if (response.status === 401 && authToken) onUnauthorized?.();
  throw new ApiError(response.status, body?.error?.code ?? "HTTP_ERROR", body?.error?.message ?? "Something went wrong. Please try again.", body?.error?.details);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

const post = (body?: unknown): RequestInit => ({ method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  // Templates (public)
  templates: () => request<{ templates: Template[] }>("/templates").then((result) => result.templates),

  // Authentication
  signUp: (input: { name: string; email: string; password: string }) => request<Session>("/auth/signup", post(input)),
  login: (input: { email: string; password: string }) => request<Session>("/auth/login", post(input)),
  refresh: () => request<Session>("/auth/refresh", post()),
  me: () => request<{ user: User }>("/auth/me").then((result) => result.user),
  logout: () => request<void>("/auth/logout", post()),

  // Resumes
  listResumes: () => request<{ resumes: Resume[] }>("/resumes").then((result) => result.resumes),
  getResume: (id: number) => request<{ resume: Resume }>(`/resumes/${id}`).then((result) => result.resume),
  createResume: (input: { title: string; template: ResumeTemplateId; data?: Partial<ResumeData> }) => request<{ resume: Resume }>("/resumes", post(input)).then((result) => result.resume),
  updateResume: (id: number, input: { title?: string; template?: ResumeTemplateId; data?: ResumeData }) => request<{ resume: Resume }>(`/resumes/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((result) => result.resume),
  deleteResume: (id: number) => request<void>(`/resumes/${id}`, { method: "DELETE" }),
  duplicateResume: (id: number) => request<{ resume: Resume }>(`/resumes/${id}/duplicate`, post()).then((result) => result.resume),
  importResume: (input: { fileName: string; dataUrl: string }) => request<ImportResult>("/resumes/import", post(input)),
  downloadPdf: async (id: number, template?: ResumeTemplateId): Promise<PdfFile> => {
    const response = await send(`/resumes/${id}/pdf${template ? `?template=${encodeURIComponent(template)}` : ""}`);
    const fileName = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "Resume_CV.pdf";
    return { blob: await response.blob(), fileName };
  },

  // Photos
  listPhotos: () => request<{ photos: Photo[] }>("/photos").then((result) => result.photos),
  uploadPhoto: (input: { fileName: string; dataUrl: string }) => request<{ photo: Photo }>("/photos", post(input)).then((result) => result.photo),
};

/** Resume photo URLs are stored relative to the website (e.g. /manus-storage/...). */
export function absoluteAssetUrl(url: string) {
  return !url || /^(https?:|data:|blob:)/i.test(url) ? url : `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}
