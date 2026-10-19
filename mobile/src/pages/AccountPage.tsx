import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar, useIonAlert } from "@ionic/react";
import { API_ORIGIN } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [presentAlert] = useIonAlert();
  const initials = (user?.name ?? user?.email ?? "?").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Account</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <div className="account-hero"><span className="account-avatar">{initials}</span><h2>{user?.name ?? "Your account"}</h2><p>{user?.email}</p></div>
        <IonList inset>
          <IonItem><IonLabel>Member since</IonLabel><IonNote slot="end">{user ? new Date(user.createdAt).toLocaleDateString() : "—"}</IonNote></IonItem>
          <IonItem lines="none"><IonLabel className="ion-text-wrap"><p>Your resumes and photos sync with the CV Studio website. Sign in there with the same email and password.</p></IonLabel></IonItem>
          <IonItem lines="none"><IonLabel className="ion-text-wrap"><p className="muted">Server: {API_ORIGIN}</p></IonLabel></IonItem>
        </IonList>
        <div className="ion-padding">
          <IonButton expand="block" color="danger" fill="outline" onClick={() => presentAlert({ header: "Sign out?", buttons: [{ text: "Cancel", role: "cancel" }, { text: "Sign out", role: "destructive", handler: () => { void logout(); } }] })}>Sign out</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
