import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonToast, useIonViewWillEnter } from "@ionic/react";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { api, ApiError, type Photo } from "../api/client";
import { pickHeadshot } from "../lib/files";

/** Headshot library shared with the website. Choose one for a resume in the editor's Personal step. */
export default function PhotosPage() {
  const [presentToast] = useIonToast();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const toast = (message: string, color: "success" | "danger" = "success") => presentToast({ message, color, duration: 2200, position: "top" });

  const load = async () => {
    try { setPhotos(await api.listPhotos()); } catch (error) { toast(error instanceof ApiError ? error.message : "Could not load photos.", "danger"); setPhotos((current) => current ?? []); }
  };
  useIonViewWillEnter(() => { void load(); });

  const upload = async () => {
    setUploading(true);
    try {
      const picked = await pickHeadshot();
      if (!picked) return;
      const photo = await api.uploadPhoto(picked);
      setPhotos((current) => [photo, ...(current ?? [])]);
      toast("Photo uploaded");
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Upload failed. Please try again.", "danger");
    } finally {
      setUploading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async (event) => { await load(); event.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        <div className="page-pad">
          <div className="page-title-row">
            <div><p className="eyebrow">Headshots</p><h1 className="display">Your <em>photos.</em></h1></div>
            <button className="icon-btn" onClick={upload} disabled={uploading} aria-label="Add a photo">{uploading ? <LoaderCircle size={19} className="spin" /> : <Camera size={19} />}</button>
          </div>
          <p className="lede gallery-lede">A professional photo for templates that show one. Pick it for a resume in the editor's Personal step.</p>

          {photos === null ? <div className="center-state"><LoaderCircle className="spin" size={26} /></div> : photos.length === 0 ? (
            <button className="photo-empty" onClick={upload} disabled={uploading}>
              <span className="qa-icon rust"><ImagePlus size={22} /></span>
              <strong>Add your first headshot</strong>
              <small>Take a photo or choose one from your library. It's resized automatically.</small>
            </button>
          ) : (
            <div className="photo-grid large">
              <button className="photo-add" onClick={upload} disabled={uploading} aria-label="Add a photo">{uploading ? <LoaderCircle className="spin" size={22} /> : <ImagePlus size={22} />}<span>Add</span></button>
              {photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.fileName} /><figcaption>{new Date(photo.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</figcaption></figure>)}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
