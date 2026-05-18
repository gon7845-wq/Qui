import { useEffect, useState } from "react";
import { getSocket } from "./socket";

type Status = "connected" | "connecting" | "disconnected";

/** Live socket connection state for UI banners. */
export function useConnectionStatus(): Status {
  const [status, setStatus] = useState<Status>(() =>
    getSocket().connected ? "connected" : "connecting"
  );

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onReconnectAttempt = () => setStatus("connecting");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.io.on("reconnect_attempt", onReconnectAttempt);
    s.io.on("reconnect_failed", () => setStatus("disconnected"));

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, []);

  return status;
}
