import { IonModal } from "@ionic/react";
import { Check, LoaderCircle, Server } from "lucide-react";
import { useState } from "react";
import { API_ORIGIN, checkServer, DEFAULT_API_ORIGIN, setApiOrigin } from "../api/client";

const LIVE_SITE = "https://cvbuilder-2ad3qnae.manus.space";
const LOCAL_MAC = "http://192.168.1.106:3000";

/** Lets the user point the app at another CV Studio server, checking it has the API first. */
export function ServerSettings() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(API_ORIGIN);
  const [status, setStatus] = useState<"" | "checking" | "ok" | "no-api" | "unreachable">("");
  const presets = Array.from(new Set([DEFAULT_API_ORIGIN, LIVE_SITE, LOCAL_MAC]));

  const save = async () => {
    setStatus("checking");
    const result = await checkServer(url);
    setStatus(result);
    if (result === "ok") {
      setApiOrigin(url === DEFAULT_API_ORIGIN ? null : url);
      setTimeout(() => setOpen(false), 600);
    }
  };

  return (
    <>
      <button className="server-chip" onClick={() => { setUrl(API_ORIGIN); setStatus(""); setOpen(true); }}>
        <Server size={13} />{API_ORIGIN.replace(/^https?:\/\//, "")}
      </button>
      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)} className="sheet" initialBreakpoint={1} breakpoints={[0, 1]}>
        <div className="sheet-body">
          <p className="eyebrow">Connection</p>
          <h2 className="title">Choose a <em>server.</em></h2>
          <p className="lede">The app uses the same accounts and resumes as this CV Studio website.</p>
          <div className="server-presets">
            {presets.map((preset) => (
              <button key={preset} className={`chip ${url === preset ? "active" : ""}`} onClick={() => { setUrl(preset); setStatus(""); }}>
                {preset === LOCAL_MAC ? "This Mac (Wi-Fi)" : preset === LIVE_SITE ? "Live site" : "Default"}
              </button>
            ))}
          </div>
          <label className="field"><span>Server address</span><input type="url" inputMode="url" autoCapitalize="none" value={url} onChange={(event) => { setUrl(event.target.value); setStatus(""); }} /></label>
          {status === "no-api" && <p className="auth-error">That site is online but doesn't have the app API yet — redeploy the latest code.</p>}
          {status === "unreachable" && <p className="auth-error">Couldn't reach that address. Check the URL and that your phone can reach it.</p>}
          <button className="btn btn-primary btn-block server-save" onClick={save} disabled={status === "checking" || !url.trim()}>
            {status === "checking" ? <LoaderCircle size={19} className="spin" /> : status === "ok" ? <><Check size={18} />Connected</> : "Test & use this server"}
          </button>
        </div>
      </IonModal>
    </>
  );
}
