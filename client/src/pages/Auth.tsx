import { usePointerParallax } from "@/components/effects/MotionEffects";
import { Brand } from "@/components/StudioNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import React from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

// Only same-origin paths are allowed as post-login destinations.
function safeNextPath(value: string | null) {
  return value && /^\/(?![/\\])/.test(value) ? value : null;
}

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
  const onSuccess = async (user: unknown) => { utils.auth.me.setData(undefined, user as any); await utils.auth.me.invalidate(); toast.success(isSignup ? "Your studio is ready." : "Welcome back."); setLocation(next ?? "/dashboard"); };
  const signIn = trpc.auth.signIn.useMutation({ onSuccess, onError: (error) => toast.error(error.message) });
  const signUp = trpc.auth.signUp.useMutation({ onSuccess, onError: (error) => toast.error(error.message) });
  const pending = signIn.isPending || signUp.isPending;
  const pageRef = usePointerParallax<HTMLElement>();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (isSignup) signUp.mutate({ name, email, password });
    else signIn.mutate({ email, password });
  }

  return <main className="auth-page" ref={pageRef}><div className="auth-orbit auth-orbit-left" /><div className="auth-orbit auth-orbit-right" /><div className="cta-papers auth-papers" aria-hidden="true"><span className="cta-paper cta-paper-1"><i /><i /><i /><i /></span><span className="cta-paper cta-paper-2"><i /><i /><i /><i /></span><span className="cta-paper cta-paper-3"><i /><i /><i /><i /></span></div><header className="auth-topbar"><Brand /><Link href="/" className="auth-back"><ArrowLeft size={16} />Back to home</Link></header><section className="auth-layout"><aside className="auth-intro" data-reveal><p className="eyebrow">Your private resume studio</p><h1>Give your next<br />chapter a <em>home.</em></h1><p>Save every version, keep your headshots ready, and return whenever your story evolves.</p><ul><li><Check size={16} />Your resumes are saved securely</li><li><Check size={16} />No external account required</li><li><Check size={16} />Export whenever you are ready</li></ul></aside><section className="auth-panel" aria-labelledby="auth-heading" data-reveal data-tilt="2.5" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}><div className="auth-panel-mark"><LockKeyhole size={20} /></div><p className="eyebrow">{isSignup ? "Create your studio" : "Welcome back"}</p><h2 id="auth-heading">{isSignup ? <>Start with your<br /><em>best work.</em></> : <>Pick up where<br />you <em>left off.</em></>}</h2><p className="auth-panel-copy">{isSignup ? "Create a password-protected account to save and refine your resumes." : "Sign in with your CV Studio email and password."}</p><form onSubmit={submit} className="auth-form">{isSignup && <div className="auth-field"><Label htmlFor="auth-name">Your name</Label><div className="auth-input-wrap"><UserRound size={17} /><Input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="e.g. Jordan Taylor" required /></div></div>}<div className="auth-field"><Label htmlFor="auth-email">Email address</Label><div className="auth-input-wrap"><Mail size={17} /><Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div></div><div className="auth-field"><div className="auth-label-row"><Label htmlFor="auth-password">Password</Label>{isSignup && <span>8–128 characters</span>}</div><div className="auth-input-wrap"><LockKeyhole size={17} /><Input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 8 : undefined} maxLength={128} placeholder="Enter your password" required /><button type="button" className="password-visibility" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{isSignup && <p className="auth-password-note"><Check size={14} />Use a unique password with at least 8 characters.</p>}<Button type="submit" size="lg" className="auth-submit" disabled={pending}>{pending ? "Please wait…" : isSignup ? "Create my account" : "Sign in to CV Studio"}</Button></form><p className="auth-switch">{isSignup ? "Already have an account?" : "New to CV Studio?"} <Link href={`${isSignup ? "/login" : "/signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{isSignup ? "Sign in" : "Create one"}</Link></p></section></section></main>;
}
