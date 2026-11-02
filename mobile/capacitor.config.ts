import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shoptechsystems.penvita",
  appName: "Penvita",
  webDir: "dist",
  // HTTPS only: no cleartext traffic and no mixed content.
  server: { androidScheme: "https" },
  // Consistent safe areas on every Android version: the WebView is padded clear of the system bars
  // on older Chromium, and edge-to-edge with correct env(safe-area-inset-*) values on newer ones.
  plugins: { SystemBars: { insetsHandling: "native" } },
};

export default config;
