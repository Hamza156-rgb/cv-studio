import { useAuth } from "@/_core/hooks/useAuth";
import { Brand } from "@/components/StudioNav";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { FileText, FolderOpen, LayoutTemplate, LogOut, Plus, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

const navigation = [{ icon: FolderOpen, label: "My resumes", href: "/dashboard" }, { icon: LayoutTemplate, label: "Templates", href: "/templates" }];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();
  if (loading) return <div className="app-loading"><span className="loading-mark"><FileText /></span><p>Preparing your studio…</p></div>;
  if (!user) return <div className="dashboard-auth"><div><Brand /><div className="auth-card"><p className="eyebrow">Your work, safely saved</p><h1>Sign in to access<br /><em>your resumes.</em></h1><p>Keep your versions, headshots, and edits together in a private dashboard.</p><Button size="lg" onClick={() => startLogin()}>Sign in to CV Studio</Button><Link href="/" className="text-link">Return to home</Link></div></div></div>;
  return <div className="dashboard-shell"><aside className="dashboard-sidebar"><Brand /><nav>{navigation.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className={location.startsWith(href) ? "dashboard-nav-active" : ""}><Icon size={18} />{label}</Link>)}</nav><Link href="/editor/new?template=modern"><Button className="sidebar-create"><Plus size={17} />New resume</Button></Link><div className="sidebar-user"><div className="avatar-mini">{user.name?.slice(0, 1).toUpperCase() || "U"}</div><div><strong>{user.name || "Your account"}</strong><span>{user.email || "CV Studio member"}</span></div><button onClick={logout} aria-label="Sign out"><LogOut size={17} /></button></div></aside><main className="dashboard-main"><header className="dashboard-mobile-header"><Brand /><Link href="/editor/new?template=modern"><Button size="sm"><Plus size={15} />New</Button></Link></header>{children}</main></div>;
}

