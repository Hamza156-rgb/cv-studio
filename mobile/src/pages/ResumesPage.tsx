import { IonActionSheet, IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSpinner, IonTitle, IonToolbar, useIonAlert, useIonRouter, useIonToast, useIonViewWillEnter } from "@ionic/react";
import { add, cloudUploadOutline, copyOutline, documentTextOutline, downloadOutline, ellipsisVertical, trashOutline } from "ionicons/icons";
import { useState } from "react";
import { api, ApiError, type Resume } from "../api/client";
import { ResumePreview } from "../components/ResumePreview";
import { blobToDataUrl, pickFile, savePdf } from "../lib/files";

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong. Please try again.");

export default function ResumesPage() {
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [menuFor, setMenuFor] = useState<Resume | null>(null);
  const [busy, setBusy] = useState("");

  const toast = (message: string, color: "success" | "danger" = "success") => presentToast({ message, duration: 2200, color, position: "top" });
  const load = async () => {
    try { setResumes(await api.listResumes()); } catch (error) { toast(errorMessage(error), "danger"); setResumes((current) => current ?? []); }
  };
  useIonViewWillEnter(() => { void load(); });

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    try { await task(); } catch (error) { toast(errorMessage(error), "danger"); } finally { setBusy(""); }
  };

  const createBlank = () => run("create", async () => {
    const resume = await api.createResume({ title: "Untitled resume", template: "modern", data: {} });
    router.push(`/resumes/${resume.id}`);
  });

  const importFile = () => run("import", async () => {
    const file = await pickFile("application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx");
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) throw new ApiError(400, "BAD_REQUEST", "Choose a PDF or DOCX smaller than 8 MB.");
    const imported = await api.importResume({ fileName: file.name, dataUrl: await blobToDataUrl(file) });
    const title = file.name.replace(/\.(pdf|docx)$/i, "").slice(0, 160) || "Imported resume";
    const resume = await api.createResume({ title, template: "modern", data: imported.data });
    toast("Imported — review the details before you send it.");
    router.push(`/resumes/${resume.id}`);
  });

  const confirmDelete = (resume: Resume) => presentAlert({
    header: "Delete this resume?",
    message: `"${resume.title}" will be removed from the app and the website.`,
    buttons: [{ text: "Cancel", role: "cancel" }, { text: "Delete", role: "destructive", handler: () => { void run("delete", async () => { await api.deleteResume(resume.id); setResumes((list) => list?.filter((item) => item.id !== resume.id) ?? null); toast("Resume deleted"); }); } }],
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My resumes</IonTitle>
          <IonButtons slot="end"><IonButton onClick={importFile} disabled={!!busy} aria-label="Import a PDF or DOCX resume">{busy === "import" ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={cloudUploadOutline} />}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async (event) => { await load(); event.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {resumes === null ? <div className="center-state"><IonSpinner /></div> : resumes.length === 0 ? (
          <div className="center-state empty-state">
            <IonIcon icon={documentTextOutline} />
            <h2>No resumes yet</h2>
            <p>Start from a blank page or import the CV you already have.</p>
            <IonButton onClick={createBlank} disabled={!!busy}>Create a resume</IonButton>
            <IonButton fill="outline" onClick={importFile} disabled={!!busy}>Import PDF or DOCX</IonButton>
          </div>
        ) : (
          <div className="resume-grid">
            {resumes.map((resume) => (
              <article key={resume.id} className="resume-tile">
                <button className="resume-tile-preview" onClick={() => router.push(`/resumes/${resume.id}`)} aria-label={`Edit ${resume.title}`}><ResumePreview data={resume.data} template={resume.template} firstPageOnly /></button>
                <div className="resume-tile-meta">
                  <div><strong>{resume.title}</strong><span>Edited {new Date(resume.updatedAt).toLocaleDateString()}</span></div>
                  <IonButton fill="clear" size="small" onClick={() => setMenuFor(resume)} aria-label={`Actions for ${resume.title}`}><IonIcon slot="icon-only" icon={ellipsisVertical} /></IonButton>
                </div>
              </article>
            ))}
          </div>
        )}
        <IonFab slot="fixed" vertical="bottom" horizontal="end"><IonFabButton onClick={createBlank} disabled={!!busy} aria-label="Create a resume"><IonIcon icon={add} /></IonFabButton></IonFab>
        <IonActionSheet
          isOpen={!!menuFor}
          header={menuFor?.title}
          onDidDismiss={() => setMenuFor(null)}
          buttons={menuFor ? [
            { text: "Download PDF", icon: downloadOutline, handler: () => { const target = menuFor; void run("pdf", async () => { await savePdf(await api.downloadPdf(target.id)); }); } },
            { text: "Duplicate", icon: copyOutline, handler: () => { const target = menuFor; void run("duplicate", async () => { const copy = await api.duplicateResume(target.id); setResumes((list) => [copy, ...(list ?? [])]); toast("Copy created"); }); } },
            { text: "Delete", role: "destructive", icon: trashOutline, handler: () => { confirmDelete(menuFor); } },
            { text: "Cancel", role: "cancel" },
          ] : []}
        />
        {busy === "pdf" && <div className="busy-overlay"><IonSpinner /><span>Preparing your PDF…</span></div>}
      </IonContent>
    </IonPage>
  );
}
