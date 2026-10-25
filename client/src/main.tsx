import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { trpc } from "./lib/trpc";
import "./index.css";
import "./styles/polish.css";
import "./styles/depth.css";
import "./styles/white.css";

// Analytics only loads when an endpoint is configured (it is not in local development).
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
if (analyticsEndpoint) { const script = document.createElement("script"); script.defer = true; script.src = `${analyticsEndpoint}/umami`; script.dataset.websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID ?? ""; document.head.appendChild(script); }

const queryClient = new QueryClient();
const redirectToCredentialLogin = (error: unknown) => { if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED" && typeof window !== "undefined" && !["/login", "/signup"].includes(window.location.pathname)) window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); };
queryClient.getQueryCache().subscribe((event) => { if (event.type === "updated" && event.action.type === "error") redirectToCredentialLogin(event.query.state.error); });
queryClient.getMutationCache().subscribe((event) => { if (event.type === "updated" && event.action.type === "error") redirectToCredentialLogin(event.mutation.state.error); });
const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson, fetch(input, init) { return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" }); } })] });
createRoot(document.getElementById("root")!).render(<trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><App /></QueryClientProvider></trpc.Provider>);
