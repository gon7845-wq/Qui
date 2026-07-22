import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { isNative, setToken } from "./lib/api";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

if (isNative) {
  // Deep links : retour de connexion (qui://auth?token=…) et invitations (…/r/CODE)
  CapApp.addListener("appUrlOpen", async ({ url }) => {
    const token = url.match(/[?#&]token=([^&]+)/)?.[1];
    if (token) {
      setToken(decodeURIComponent(token));
      try {
        await Browser.close();
      } catch {}
      window.location.href = "/moi";
      return;
    }
    const code = url.match(/\/r\/([A-Z0-9]{4})/i)?.[1];
    if (code) window.location.href = `/r/${code.toUpperCase()}`;
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
