"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Download, LoaderCircle, Share, SquarePlus } from "lucide-react";
import { sendTestPush, subscribePush, unsubscribePush } from "@/lib/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Réglages « application » de l'appareil courant : installation sur l'écran d'accueil et
 * notifications push. Sur iPhone, les notifications ne sont possibles qu'une fois l'app installée.
 */
export function AppSettings() {
  const [support, setSupport] = useState<"unknown" | "ok" | "no">("unknown");
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(VAPID_PUBLIC_KEY);
    // Lecture de capacités du navigateur : disponible seulement après le montage.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIos(isIos);
    setStandalone(isStandalone);
    setSupport(ok ? "ok" : "no");
    if ("Notification" in window) setPermission(Notification.permission);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (ok) navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setSubscription).catch(() => {});

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setMessage({ ok: false, text: "Notifications refusées. Vous pouvez les autoriser dans les réglages du navigateur pour ce site." });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
        const r = await subscribePush(JSON.parse(JSON.stringify(sub)));
        if (!r.ok) {
          setMessage({ ok: false, text: r.message ?? "Activation impossible." });
          return;
        }
        setSubscription(sub);
        await sendTestPush();
        setMessage({ ok: true, text: "Notifications activées sur cet appareil. Une notification d'essai vient d'être envoyée." });
      } catch {
        setMessage({ ok: false, text: "Activation impossible sur ce navigateur. Réessayez ou utilisez Chrome, Edge, Firefox ou Safari à jour." });
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      try {
        if (subscription) {
          await unsubscribePush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setSubscription(null);
        setMessage({ ok: true, text: "Notifications désactivées sur cet appareil." });
      } catch {
        setMessage({ ok: false, text: "La désactivation n'a pas abouti. Réessayez." });
      }
    });
  }

  const btn = "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="space-y-4">
      {/* Installation */}
      {!standalone && (installEvent || ios) && (
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Download className="size-5 text-brand" /> Installer l&apos;application
          </p>
          {installEvent ? (
            <>
              <p className="mt-1 text-sm text-muted">Ajoutez le Grenier Communautaire à votre écran d&apos;accueil pour l&apos;ouvrir comme une application.</p>
              <button
                type="button"
                onClick={async () => {
                  await installEvent.prompt();
                  await installEvent.userChoice;
                  setInstallEvent(null);
                }}
                className={`${btn} mt-3 bg-brand text-white hover:bg-brand-dark`}
              >
                <Download className="size-4" /> Installer
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Sur iPhone : touchez <Share className="inline size-4 align-text-bottom" aria-label="Partager" /> <strong>Partager</strong> dans Safari, puis{" "}
              <SquarePlus className="inline size-4 align-text-bottom" aria-hidden /> <strong>Sur l&apos;écran d&apos;accueil</strong>. Une fois l&apos;application installée,
              vous pourrez y activer les notifications.
            </p>
          )}
        </div>
      )}

      {/* Notifications push */}
      <div className="rounded-xl border border-line bg-white p-4">
        <p className="flex items-center gap-2 font-semibold">
          <BellRing className="size-5 text-brand" /> Notifications sur cet appareil
        </p>
        {support === "unknown" ? (
          <p className="mt-1 text-sm text-muted">Vérification…</p>
        ) : support === "no" ? (
          <p className="mt-1 text-sm text-muted">
            {ios && !standalone
              ? "Sur iPhone, installez d'abord l'application (voir ci-dessus), puis ouvrez-la depuis l'écran d'accueil pour activer les notifications."
              : "Ce navigateur ne permet pas les notifications. Vous restez prévenu par e-mail et dans votre espace."}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {subscription
                ? "Activées : vous êtes alerté dès qu'il y a du nouveau, même quand le site est fermé."
                : "Recevez une alerte sur ce téléphone ou cet ordinateur dès qu'il y a du nouveau, même quand le site est fermé."}
            </p>
            <div className="mt-3">
              {subscription ? (
                <button type="button" onClick={disable} disabled={pending} className={`${btn} border border-line bg-white hover:border-brand hover:text-brand`}>
                  {pending ? <LoaderCircle className="size-4 animate-spin" /> : <BellOff className="size-4" />} Désactiver
                </button>
              ) : (
                <button type="button" onClick={enable} disabled={pending || permission === "denied"} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
                  {pending ? <LoaderCircle className="size-4 animate-spin" /> : <BellRing className="size-4" />} Activer les notifications
                </button>
              )}
            </div>
            {permission === "denied" && !message && (
              <p className="mt-2 text-xs text-red-700">Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur.</p>
            )}
          </>
        )}
        {message && (
          <p role="status" className={`mt-2 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
