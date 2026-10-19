import { IonButton, IonContent, IonInput, IonItem, IonList, IonNote, IonPage, IonSpinner, IonText } from "@ionic/react";
import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/** Sign in and create-account in one screen. */
export default function AuthPage() {
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-page" fullscreen>
        <div className="auth-wrap">
          <div className="auth-brand"><span className="auth-logo">CV</span><h1>CV Studio</h1><p>{mode === "login" ? "Welcome back. Your resumes sync with the website." : "Create an account to build and download polished resumes."}</p></div>
          <form onSubmit={submit} noValidate>
            <IonList inset className="auth-fields">
              {mode === "signup" && <IonItem><IonInput label="Full name" labelPlacement="stacked" autocomplete="name" value={name} onIonInput={(event) => setName(event.detail.value ?? "")} required /></IonItem>}
              <IonItem><IonInput label="Email" labelPlacement="stacked" type="email" inputmode="email" autocomplete="email" value={email} onIonInput={(event) => setEmail(event.detail.value ?? "")} required /></IonItem>
              <IonItem><IonInput label="Password" labelPlacement="stacked" type="password" autocomplete={mode === "login" ? "current-password" : "new-password"} value={password} onIonInput={(event) => setPassword(event.detail.value ?? "")} required /></IonItem>
            </IonList>
            {mode === "signup" && <IonNote className="auth-hint">At least 8 characters.</IonNote>}
            {error && <IonText color="danger"><p className="auth-error" role="alert">{error}</p></IonText>}
            {/* Ionic's button does not submit forms; this hidden native button keeps the keyboard's Go/Enter working. */}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            <IonButton expand="block" className="auth-submit" onClick={() => { void submit(); }} disabled={busy || !email || !password || (mode === "signup" && !name)}>
              {busy ? <IonSpinner name="crescent" /> : mode === "login" ? "Sign in" : "Create account"}
            </IonButton>
          </form>
          <IonButton fill="clear" expand="block" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
