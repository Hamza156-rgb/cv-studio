import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { FileText, Menu, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return <Link href="/" className={`brand ${inverted ? "brand-inverted" : ""}`}><span className="brand-mark"><FileText size={17} strokeWidth={2.5} /></span><span>CV Studio</span></Link>;
}

export function StudioNav() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const primaryPath = isAuthenticated ? "/dashboard" : "/editor/new?template=modern";
  const primaryText = isAuthenticated ? "My resumes" : "Create my CV";
  const links = [{ label: "Templates", href: "/templates" }, { label: "How it works", href: "/#how-it-works" }, { label: "FAQ", href: "/#faq" }];
  return <header className="studio-nav"><div className="nav-inner"><Brand /><nav className="nav-links" aria-label="Primary navigation">{links.map((item) => <Link key={item.href} href={item.href} className={location.startsWith(item.href.split("#")[0]) && item.href !== "/#how-it-works" && item.href !== "/#faq" ? "active" : ""}>{item.label}</Link>)}</nav><div className="nav-actions">{!loading && !isAuthenticated && <button onClick={() => startLogin()} className="nav-login">Sign in</button>}<Link href={primaryPath}><Button className="nav-cta"><Sparkles size={15} />{primaryText}</Button></Link></div><button className="nav-mobile-toggle" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}><Menu size={21} /></button></div>{mobileOpen && <div className="mobile-nav">{links.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}{!isAuthenticated && <button onClick={() => startLogin()}>Sign in</button>}<Link href={primaryPath} onClick={() => setMobileOpen(false)}>Create my CV</Link></div>}</header>;
}
