import { IonContent, IonPage, useIonAlert, useIonViewWillEnter } from "@ionic/react";
import { CalendarDays, ChevronRight, Globe, LogOut, Mail, Server } from "lucide-react";
import { useState } from "react";
import { api, API_ORIGIN } from "../api/client";
import { AppHeader, onScroll } from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [presentAlert] = useIonAlert();
  const [condensed, setCondensed] = useState(false);
  const [stats, setStats] = useState<{ resumes: number; photos: number } | null>(null);
  const initials = (user?.name ?? user?.email ?? "?").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  useIonViewWillEnter(() => {
    Promise.all([api.listResumes(), api.listPhotos()]).then(([resumes, photos]) => setStats({ resumes: resumes.length, photos: photos.length })).catch(() => setStats(null));
  });

  const confirmLogout = () => presentAlert({ header: "Sign out?", message: "Your resumes stay safe in your account.", buttons: [{ text: "Cancel", role: "cancel" }, { text: "Sign out", role: "destructive", handler: () => { void logout(); } }] });

  return (
    <IonPage>
      <AppHeader title="Profile" condensed={condensed} actions={<button className="icon-btn plain" onClick={confirmLogout} aria-label="Sign out"><LogOut size={19} /></button>} />
      <IonContent scrollEvents onIonScroll={onScroll(setCondensed)}>
        <div className="page-pad">
          <p className="eyebrow">Profile</p>
          <div className="profile-card">
            <span className="profile-avatar">{initials}</span>
            <h1 className="title">{user?.name ?? "Your account"}</h1>
            <p className="caption">{user?.email}</p>
            <div className="profile-stats">
              <div><strong>{stats?.resumes ?? "—"}</strong><span>Resumes</span></div>
              <div><strong>{stats?.photos ?? "—"}</strong><span>Photos</span></div>
              <div><strong>18</strong><span>Templates</span></div>
            </div>
          </div>

          <div className="section-label"><h2>Account</h2></div>
          <div className="settings-list">
            <div className="settings-row"><span className="qa-icon mint"><Mail size={17} /></span><div><strong>Email</strong><small>{user?.email}</small></div></div>
            <div className="settings-row"><span className="qa-icon mint"><CalendarDays size={17} /></span><div><strong>Member since</strong><small>{user ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—"}</small></div></div>
            <a className="settings-row" href={API_ORIGIN} target="_blank" rel="noreferrer"><span className="qa-icon mint"><Globe size={17} /></span><div><strong>Open the website</strong><small>Same account, same resumes</small></div><ChevronRight size={18} className="settings-chevron" /></a>
            <div className="settings-row"><span className="qa-icon mint"><Server size={17} /></span><div><strong>Server</strong><small>{API_ORIGIN.replace(/^https?:\/\//, "")}</small></div></div>
          </div>

          <button className="btn btn-danger btn-block profile-logout" onClick={confirmLogout}><LogOut size={18} />Sign out</button>
          <p className="caption profile-version">CV Studio for iOS & Android · v1.0</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
