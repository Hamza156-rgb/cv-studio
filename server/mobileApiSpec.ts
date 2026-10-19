import { RESUME_TEMPLATES } from "../shared/resume";

/** OpenAPI 3.1 description of the mobile REST API, served at GET /api/v1/openapi.json. */

const json = (schema: object) => ({ "application/json": { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const error = (description: string) => ({ description, content: json(ref("Error")) });
const secured = [{ bearerAuth: [] }];
const idParam = [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }];
const standardErrors = { 401: error("Missing, invalid or expired token."), 500: error("Unexpected server error.") };

export const MOBILE_API_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "CV Studio Mobile API",
    version: "1.0.0",
    description: [
      "REST API for the CV Studio mobile app. It uses the same database and accounts as the website, so a resume created on one appears on the other.",
      "",
      "Authentication: call /auth/login or /auth/signup, store the returned `token` securely (Keychain / Keystore), and send it as `Authorization: Bearer <token>`. Tokens last 30 days; call /auth/refresh to get a fresh one while the current token is still valid. Signing out means deleting the stored token.",
      "",
      "Files (photos, resume imports) are sent as base64 data URLs inside JSON, e.g. `data:image/jpeg;base64,...`. Resize photos below 2 MB before uploading.",
      "",
      "Errors always have the shape `{ \"error\": { \"code\", \"message\", \"details?\" } }`. Show `message` to the user.",
    ].join("\n"),
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "object", required: ["code", "message"], properties: {
          code: { type: "string", enum: ["BAD_REQUEST", "UNAUTHORIZED", "NOT_FOUND", "CONFLICT", "TOO_MANY_REQUESTS", "PAYLOAD_TOO_LARGE", "INTERNAL"] },
          message: { type: "string" },
          details: { type: "array", items: { type: "object", properties: { path: { type: "string" }, message: { type: "string" } } } },
        } } },
      },
      User: { type: "object", properties: { id: { type: "integer" }, name: { type: ["string", "null"] }, email: { type: ["string", "null"] }, createdAt: { type: "string", format: "date-time" } } },
      Session: {
        type: "object",
        required: ["token", "tokenType", "expiresAt", "user"],
        properties: { token: { type: "string" }, tokenType: { type: "string", const: "Bearer" }, expiresAt: { type: "string", format: "date-time" }, user: ref("User") },
      },
      TemplateId: { type: "string", enum: RESUME_TEMPLATES.map((template) => template.id) },
      Template: { type: "object", properties: { id: ref("TemplateId"), name: { type: "string" }, category: { type: "string" }, description: { type: "string" }, ats: { type: "boolean" }, supportsPhoto: { type: "boolean" } } },
      ResumeData: {
        type: "object",
        description: "Resume content. Text fields such as summary and experience descriptions support light markdown: **bold**, *italic*, lines starting with \"- \" (bullets) or \"1. \" (numbered), and a line that is entirely **bold** renders as a sub-heading. Missing fields get defaults, so a new resume can start from {}.",
        properties: {
          fullName: { type: "string" }, professionalTitle: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, location: { type: "string" },
          website: { type: "string" }, linkedin: { type: "string" }, github: { type: "string" },
          photoUrl: { type: "string", description: "Use the `storageUrl` returned by POST /photos." },
          summary: { type: "string" },
          experiences: { type: "array", items: { type: "object", properties: { id: { type: "string" }, role: { type: "string" }, company: { type: "string" }, location: { type: "string" }, start: { type: "string" }, end: { type: "string" }, current: { type: "boolean" }, description: { type: "string" }, highlights: { type: "array", items: { type: "string" } } } } },
          education: { type: "array", items: { type: "object", properties: { id: { type: "string" }, qualification: { type: "string" }, institution: { type: "string" }, location: { type: "string" }, start: { type: "string" }, end: { type: "string" }, grade: { type: "string" }, description: { type: "string" } } } },
          skills: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Expert"] } } } },
          projects: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, role: { type: "string" }, liveDemoUrl: { type: "string" }, githubUrl: { type: "string" }, caseStudyUrl: { type: "string" }, description: { type: "string" }, technologies: { type: "string" } } } },
          certifications: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, issuer: { type: "string" }, date: { type: "string" }, credentialUrl: { type: "string" } } } },
          languages: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, proficiency: { type: "string", enum: ["Basic", "Intermediate", "Advanced", "Fluent", "Native"] } } } },
          awards: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, issuer: { type: "string" }, date: { type: "string" }, description: { type: "string" } } } },
          volunteer: { type: "array", items: { type: "object", properties: { id: { type: "string" }, organization: { type: "string" }, role: { type: "string" }, start: { type: "string" }, end: { type: "string" }, description: { type: "string" } } } },
          interests: { type: "array", items: { type: "string" } },
          sectionOrder: { type: "array", items: { type: "string", enum: ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "awards", "volunteer", "interests"] } },
          hiddenSections: { type: "array", items: { type: "string" } },
          theme: { type: "object", properties: { accent: { type: "string", examples: ["#24474A"] }, text: { type: "string" }, font: { type: "string", enum: ["modern", "serif", "classic"] }, scale: { type: "string", enum: ["compact", "comfortable", "airy"] }, photoShape: { type: "string", enum: ["circle", "rounded", "square"] }, atsMode: { type: "boolean" }, experienceOrderMode: { type: "string", enum: ["auto", "manual"] } } },
        },
      },
      Resume: { type: "object", properties: { id: { type: "integer" }, userId: { type: "integer" }, title: { type: "string" }, template: ref("TemplateId"), data: ref("ResumeData"), createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
      Photo: { type: "object", properties: { id: { type: "integer" }, fileName: { type: "string" }, mimeType: { type: "string" }, url: { type: "string", description: "Absolute URL to display the image." }, storageUrl: { type: "string", description: "The value to store in ResumeData.photoUrl (site-relative, so the website and PDF renderer can load it)." }, createdAt: { type: "string", format: "date-time" } } },
      FileUpload: { type: "object", required: ["fileName", "dataUrl"], properties: { fileName: { type: "string", maxLength: 255 }, dataUrl: { type: "string", description: "base64 data URL" } } },
    },
  },
  paths: {
    "/templates": { get: { summary: "List resume templates", responses: { 200: { description: "Templates", content: json({ type: "object", properties: { templates: { type: "array", items: ref("Template") } } }) } } } },
    "/auth/signup": { post: {
      summary: "Create an account and get a token",
      requestBody: { required: true, content: json({ type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8, maxLength: 128 } } }) },
      responses: { 201: { description: "Signed up", content: json(ref("Session")) }, 400: error("Invalid input."), 409: error("An account already exists for this email.") },
    } },
    "/auth/login": { post: {
      summary: "Sign in with email and password",
      requestBody: { required: true, content: json({ type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" } } }) },
      responses: { 200: { description: "Signed in", content: json(ref("Session")) }, 401: error("Incorrect email or password."), 429: error("Too many failed attempts; wait 15 minutes.") },
    } },
    "/auth/refresh": { post: { summary: "Exchange a valid token for a new 30-day token", security: secured, responses: { 200: { description: "New session", content: json(ref("Session")) }, ...standardErrors } } },
    "/auth/me": { get: { summary: "Current user", security: secured, responses: { 200: { description: "User", content: json({ type: "object", properties: { user: ref("User") } }) }, ...standardErrors } } },
    "/auth/logout": { post: { summary: "Sign out (the app should delete its stored token)", security: secured, responses: { 204: { description: "Signed out" }, ...standardErrors } } },
    "/resumes": {
      get: { summary: "List the user's resumes, most recently updated first", security: secured, responses: { 200: { description: "Resumes", content: json({ type: "object", properties: { resumes: { type: "array", items: ref("Resume") } } }) }, ...standardErrors } },
      post: {
        summary: "Create a resume",
        security: secured,
        requestBody: { required: true, content: json({ type: "object", required: ["title", "template"], properties: { title: { type: "string", maxLength: 160 }, template: ref("TemplateId"), data: ref("ResumeData") } }) },
        responses: { 201: { description: "Created", content: json({ type: "object", properties: { resume: ref("Resume") } }) }, 400: error("Invalid input."), ...standardErrors },
      },
    },
    "/resumes/import": { post: {
      summary: "Parse a PDF or DOCX resume (up to 8 MB) into ResumeData without saving it",
      description: "Returns the parsed data; create a resume with it via POST /resumes. dataUrl must be data:application/pdf;base64,... or the DOCX MIME type, and fileName must end in .pdf or .docx.",
      security: secured,
      requestBody: { required: true, content: json(ref("FileUpload")) },
      responses: { 200: { description: "Parsed", content: json({ type: "object", properties: { fileName: { type: "string" }, format: { type: "string", enum: ["pdf", "docx"] }, data: ref("ResumeData"), textPreview: { type: "string" }, warnings: { type: "array", items: { type: "string" } } } }) }, 400: error("Unreadable or unsupported file."), ...standardErrors },
    } },
    "/resumes/{id}": {
      parameters: idParam,
      get: { summary: "Get one resume", security: secured, responses: { 200: { description: "Resume", content: json({ type: "object", properties: { resume: ref("Resume") } }) }, 404: error("Not found."), ...standardErrors } },
      patch: {
        summary: "Update title, template and/or data (send only what changed; data replaces the whole content)",
        security: secured,
        requestBody: { required: true, content: json({ type: "object", minProperties: 1, properties: { title: { type: "string", maxLength: 160 }, template: ref("TemplateId"), data: ref("ResumeData") } }) },
        responses: { 200: { description: "Updated", content: json({ type: "object", properties: { resume: ref("Resume") } }) }, 400: error("Invalid input."), 404: error("Not found."), ...standardErrors },
      },
      delete: { summary: "Delete a resume", security: secured, responses: { 204: { description: "Deleted" }, 404: error("Not found."), ...standardErrors } },
    },
    "/resumes/{id}/duplicate": { parameters: idParam, post: { summary: "Duplicate a resume", security: secured, responses: { 201: { description: "Copy created", content: json({ type: "object", properties: { resume: ref("Resume") } }) }, 404: error("Not found."), ...standardErrors } } },
    "/resumes/{id}/pdf": { parameters: [...idParam, { name: "template", in: "query", required: false, description: "Render with a different template without changing the saved one.", schema: ref("TemplateId") }], get: {
      summary: "Download the resume as a PDF, identical to the website's preview",
      security: secured,
      responses: { 200: { description: "PDF file", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } }, 400: error("Unknown template."), 404: error("Not found."), 429: error("PDF service busy; retry shortly."), ...standardErrors },
    } },
    "/photos": {
      get: { summary: "List uploaded headshots", security: secured, responses: { 200: { description: "Photos", content: json({ type: "object", properties: { photos: { type: "array", items: ref("Photo") } } }) }, ...standardErrors } },
      post: {
        summary: "Upload a headshot (JPG, PNG or WebP, max 2 MB)",
        security: secured,
        requestBody: { required: true, content: json(ref("FileUpload")) },
        responses: { 201: { description: "Uploaded", content: json({ type: "object", properties: { photo: ref("Photo") } }) }, 400: error("Wrong format or too large."), 413: error("Request body too large."), ...standardErrors },
      },
    },
  },
} as const;
