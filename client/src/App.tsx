import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Home from "@/pages/Home";
import Templates from "@/pages/Templates";
import Auth from "@/pages/Auth";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/templates" component={Templates} /><Route path="/signup">{() => <Auth mode="signup" />}</Route><Route path="/login">{() => <Auth mode="login" />}</Route><Route path="/dashboard" component={Dashboard} /><Route path="/editor/:id" component={Editor} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
