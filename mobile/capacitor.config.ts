import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cvstudio.app",
  appName: "CV Studio",
  webDir: "dist",
  // Lets the app call a plain-http server on the local network (e.g. a dev Mac) during testing.
  // The production server uses https, so this only matters for local testing.
  server: { androidScheme: "https", cleartext: true },
  android: { allowMixedContent: true },
  // Consistent safe areas on every Android version: the WebView is padded clear of the system bars
  // on older Chromium, and edge-to-edge with correct env(safe-area-inset-*) values on newer ones.
  plugins: { SystemBars: { insetsHandling: "native" } },
};

export default config;
