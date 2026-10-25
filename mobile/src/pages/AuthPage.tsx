import { IonContent, IonPage, useIonRouter } from "@ionic/react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ServerSettings } from "../components/ServerSettings";

const COPY = {
  login: { eyebrow: "Welcome back", title: <>Sign in to <em>continue.</em></>, text: "Pick up where you left off — your resumes are synced with the website.", action: "Sign in", switchText: "New to CV Studio?", switchAction: "Create an account", switchTo: "/signup" },
  signup: { eyebrow: "Get started — it's free", title: <>Create your <em>account.</em></>, text: "One account for the app and the website. It takes less than a minute.", action: "Create account", switchText: "Already have an account?", switchAction: "Sign in", switchTo: "/login" },
} as const;

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const router = useIonRouter();
  const { login, signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = COPY[mode];
  const passwordTooShort = mode === "signup" && password.length > 0 && password.length < 8;
  const ready = Boolean(email && password && (mode === "login" || (name.trim() && password.length >= 8)));

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || !ready) return;
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
      <IonContent fullscreen className="auth-page">
        <div className="auth-wrap">
          <button className="icon-btn" onClick={() => router.push("/welcome", "back", "replace")} aria-label="Back to welcome"><ArrowLeft size={19} /></button>
          <div className="auth-head">
            <span className="brand-mark">cv</span>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="display">{copy.title}</h1>
            <p className="lede">{copy.text}</p>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            {mode === "signup" && (
              <label className="field"><span>Full name</span><input autoComplete="name" placeholder="Jordan Taylor" value={name} onChange={(event) => setName(event.target.value)} /></label>
            )}
            <label className="field"><span>Email</span><input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="field">
              <span>Password</span>
              <div className="password-wrap">
                <input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
              {passwordTooShort && <small className="field-hint">Use at least 8 characters.</small>}
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy || !ready}>{busy ? <LoaderCircle size={20} className="spin" /> : copy.action}</button>
          </form>
          <p className="auth-switch">{copy.switchText} <button className="link-btn" onClick={() => { setError(""); router.push(copy.switchTo, "none", "replace"); }}>{copy.switchAction}</button></p>
          <p className="auth-secure"><LockKeyhole size={13} />One secure account for the app and the website</p>
          <div className="server-row"><ServerSettings /></div>
        </div>
      </IonContent>
    </IonPage>
  );
}
