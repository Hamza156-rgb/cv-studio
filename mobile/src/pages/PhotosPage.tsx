import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSpinner, IonTitle, IonToolbar, useIonToast, useIonViewWillEnter } from "@ionic/react";
import { cameraOutline, imagesOutline } from "ionicons/icons";
import { useState } from "react";
import { api, ApiError, type Photo } from "../api/client";
import { pickHeadshot } from "../lib/files";

/** Headshot library shared with the website. Choose one for a resume from its Personal details. */
export default function PhotosPage() {
  const [presentToast] = useIonToast();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try { setPhotos(await api.listPhotos()); } catch (error) { presentToast({ message: error instanceof ApiError ? error.message : "Could not load photos.", color: "danger", duration: 2200, position: "top" }); setPhotos((current) => current ?? []); }
  };
  useIonViewWillEnter(() => { void load(); });

  const upload = async () => {
    setUploading(true);
    try {
      const picked = await pickHeadshot();
      if (!picked) return;
      const photo = await api.uploadPhoto(picked);
      setPhotos((current) => [photo, ...(current ?? [])]);
      presentToast({ message: "Photo uploaded", color: "success", duration: 1800, position: "top" });
    } catch (error) {
      presentToast({ message: error instanceof ApiError ? error.message : "Upload failed. Please try again.", color: "danger", duration: 2400, position: "top" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Photos</IonTitle>
          <IonButtons slot="end"><IonButton onClick={upload} disabled={uploading} aria-label="Upload a photo">{uploading ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={cameraOutline} />}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (event) => { await load(); event.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {photos === null ? <div className="center-state"><IonSpinner /></div> : photos.length === 0 ? (
          <div className="center-state empty-state">
            <IonIcon icon={imagesOutline} />
            <h2>No headshots yet</h2>
            <p>Add a professional photo for templates that show one. Large photos are resized automatically.</p>
            <IonButton onClick={upload} disabled={uploading}>Take or choose a photo</IonButton>
          </div>
        ) : (
          <>
            <p className="muted">Pick one for a resume under Edit → Personal details.</p>
            <div className="photo-library large">{photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.fileName} /><figcaption>{new Date(photo.createdAt).toLocaleDateString()}</figcaption></figure>)}</div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
