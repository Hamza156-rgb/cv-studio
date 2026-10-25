import { IonHeader } from "@ionic/react";
import type { ReactNode } from "react";

/**
 * Top app bar for the tab screens: brand on the left, actions on the right. Once the page is
 * scrolled (`condensed`), it turns frosted and shows the page title in the middle.
 */
export function AppHeader({ title, actions, condensed }: { title: string; actions?: ReactNode; condensed: boolean }) {
  return (
    <IonHeader className={`app-header ${condensed ? "condensed" : ""}`}>
      <div className="app-bar">
        <div className="app-bar-brand"><span className="brand-mark small">cv</span><strong>CV Studio</strong></div>
        <span className="app-bar-title" aria-hidden={!condensed}>{title}</span>
        <div className="app-bar-actions">{actions}</div>
      </div>
    </IonHeader>
  );
}

/** Pass to IonContent: `<IonContent scrollEvents onIonScroll={onScroll(setCondensed)}>`. */
export const onScroll = (setCondensed: (value: boolean) => void) => (event: CustomEvent<{ scrollTop: number }>) => setCondensed(event.detail.scrollTop > 36);
