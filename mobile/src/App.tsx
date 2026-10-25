import { IonApp, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { House, Images, LayoutTemplate, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { hasOnboarded } from "./lib/onboarding";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import OnboardingPage from "./pages/OnboardingPage";
import PhotosPage from "./pages/PhotosPage";
import ProfilePage from "./pages/ProfilePage";
import ResumeEditorPage from "./pages/ResumeEditorPage";
import TemplatesPage from "./pages/TemplatesPage";

setupIonicReact({ mode: "ios" });

function SignedInApp() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/home" element={<HomePage />} />
        <Route path="/resumes/:id" element={<ResumeEditorPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/home"><House /><IonLabel>Home</IonLabel></IonTabButton>
        <IonTabButton tab="templates" href="/templates"><LayoutTemplate /><IonLabel>Templates</IonLabel></IonTabButton>
        <IonTabButton tab="photos" href="/photos"><Images /><IonLabel>Photos</IonLabel></IonTabButton>
        <IonTabButton tab="profile" href="/profile"><UserRound /><IonLabel>Profile</IonLabel></IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

function Routes() {
  const { status } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => { hasOnboarded().then(setOnboarded); }, []);

  if (status === "loading" || onboarded === null) return <div className="splash"><span className="brand-mark">cv</span></div>;
  return (
    <IonReactRouter>
      {status === "signedIn" ? <SignedInApp /> : (
        <IonRouterOutlet>
          <Route path="/welcome" element={<OnboardingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          {/* First launch shows the introduction; afterwards signed-out users land on sign in. */}
          <Route path="*" element={<Navigate to={onboarded ? "/login" : "/welcome"} replace />} />
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
