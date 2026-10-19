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

createRoot(document.getElementById("root")!).render(<App />);
