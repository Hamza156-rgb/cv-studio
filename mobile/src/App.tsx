import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonSpinner, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { documentTextOutline, imagesOutline, personCircleOutline } from "ionicons/icons";
import { Navigate, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AccountPage from "./pages/AccountPage";
import AuthPage from "./pages/AuthPage";
import PhotosPage from "./pages/PhotosPage";
import ResumeEditorPage from "./pages/ResumeEditorPage";
import ResumesPage from "./pages/ResumesPage";

setupIonicReact({ mode: "ios" });

function SignedInApp() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/resumes" element={<ResumesPage />} />
        <Route path="/resumes/:id" element={<ResumeEditorPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/resumes" replace />} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="resumes" href="/resumes"><IonIcon icon={documentTextOutline} /><IonLabel>Resumes</IonLabel></IonTabButton>
        <IonTabButton tab="photos" href="/photos"><IonIcon icon={imagesOutline} /><IonLabel>Photos</IonLabel></IonTabButton>
        <IonTabButton tab="account" href="/account"><IonIcon icon={personCircleOutline} /><IonLabel>Account</IonLabel></IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

function Routes() {
  const { status } = useAuth();
  if (status === "loading") return <div className="splash"><span className="auth-logo">CV</span><IonSpinner name="crescent" /></div>;
  return (
    <IonReactRouter>
      {status === "signedIn" ? <SignedInApp /> : (
        <IonRouterOutlet>
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </IonRouterOutlet>
      )}
    </IonReactRouter>
  );
}

export default function App() {
  return (
    <IonApp>
      <AuthProvider><Routes /></AuthProvider>
    </IonApp>
  );
}
