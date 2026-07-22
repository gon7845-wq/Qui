import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // ⚠️ appId = identifiant unique sur les stores. Modifiable tant que l'app
  // n'a jamais été publiée — après, il est définitif (Google Play surtout).
  appId: "com.quigame.app",
  appName: "Qui ?",
  webDir: "dist",
  server: {
    // Android : origine https://localhost (cohérent avec le web + cookies Secure)
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
