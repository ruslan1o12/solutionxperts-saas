"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function EnablePushButton() {
  const [status, setStatus] = useState<"checking" | "unsupported" | "off" | "on" | "denied">("checking");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const existing = await reg?.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setWorking(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        alert("Push notifications aren't set up yet — an admin needs to add the VAPID keys in Vercel.");
        setWorking(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setWorking(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/subscribe-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus("on");
    } catch (e) {
      console.error("Failed to enable push", e);
      alert("Couldn't turn on notifications — try again.");
    }
    setWorking(false);
  }

  async function disable() {
    setWorking(true);
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/subscribe-push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setStatus("off");
    setWorking(false);
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs text-neutral-500 mb-4">
        This browser doesn&apos;t support push notifications on this device.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-neutral-500 mb-4">
        Notifications are blocked for this site in your browser settings — enable them there to
        get alerts on your phone instead of just email.
      </p>
    );
  }

  return (
    <button
      onClick={status === "on" ? disable : enable}
      disabled={working}
      className={`w-full font-bold rounded-xl py-3 mb-4 disabled:opacity-60 ${
        status === "on" ? "bg-white border-2 border-line text-ink" : "bg-signal text-white"
      }`}
    >
      {working
        ? "Working..."
        : status === "on"
        ? "Notifications on for this device — tap to turn off"
        : "Turn on notifications for this device"}
    </button>
  );
}
