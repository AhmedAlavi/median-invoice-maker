import { registerSW } from "virtual:pwa-register";

export const initPWA = () => {
  const updateSW = registerSW({
    onNeedRefresh() {
      // optional: show a toast/button to refresh
      if (confirm("An update is available. Reload now?")) updateSW(true);
    },
    onOfflineReady() {
      // optional: toast "Ready to work offline"
      console.log("✅ Median Invoice Maker is ready to work offline.");
    },
  });
};
