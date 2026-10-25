import { createRoot } from "react-dom/client";
import App from "./App";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "./generated/resume.css";
import "./theme/app.css";

// Ionic hides the outgoing page with aria-hidden; drop focus first so a tapped button
// isn't left focused inside a hidden page (an accessibility violation browsers warn about).
document.addEventListener("ionViewWillLeave", () => { (document.activeElement as HTMLElement | null)?.blur?.(); }, true);

createRoot(document.getElementById("root")!).render(<App />);
