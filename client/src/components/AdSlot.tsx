import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { SHARE_ORIGIN } from "../lib/api";
import type { HouseAd } from "../types";

// Emplacement publicitaire unique du jeu.
//
// Deux formats : "banner" (discret, pendant la révélation / le lobby / le
// final) et "interstitial" (plein écran, pendant l'entracte entre manches).
//
// Trois cas de figure :
//   • hôte VIP        → rien du tout, le composant ne rend rien
//   • régie branchée  → bloc AdSense
//   • aucune régie    → « pub maison » (autopromo VIP / partage), pour que
//                       l'emplacement travaille dès le premier jour

type Format = "banner" | "interstitial";

// Le script AdSense ne doit être injecté qu'une fois par page.
let adsenseLoading: Promise<void> | null = null;

function loadAdsense(client: string) {
  if (adsenseLoading) return adsenseLoading;
  adsenseLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("adsense bloqué"));
    document.head.appendChild(s);
  });
  return adsenseLoading;
}

export function AdSlot({ format, seed = 0 }: { format: Format; seed?: number }) {
  const lobby = useStore((s) => s.lobby);
  const config = useStore((s) => s.config);

  // `lobby.ads === false` = l'hôte est VIP : personne à sa table ne voit de pub.
  // Hors partie (pas de lobby), on affiche quand même l'autopromo.
  const adsAllowed = lobby ? lobby.ads !== false : true;
  if (!adsAllowed || !config) return null;

  const ads = config.ads;
  const unit = ads.adsense
    ? format === "banner"
      ? ads.adsense.banner
      : ads.adsense.interstitial
    : null;

  if (ads.adsense && unit) {
    return <AdsenseUnit client={ads.adsense.client} slot={unit} format={format} seed={seed} />;
  }
  return <HouseSlot format={format} seed={seed} pool={ads.house} />;
}

// ─── Bloc AdSense (avec repli sur la pub maison si la régie ne remplit pas) ───
function AdsenseUnit({
  client,
  slot,
  format,
  seed,
}: {
  client: string;
  slot: string;
  format: Format;
  seed: number;
}) {
  const ref = useRef<HTMLModElement>(null);
  const [failed, setFailed] = useState(false);
  const house = useStore((s) => s.config?.ads.house) ?? [];

  useEffect(() => {
    let cancelled = false;
    loadAdsense(client)
      .then(() => {
        if (cancelled) return;
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch {
          setFailed(true);
        }
      })
      .catch(() => !cancelled && setFailed(true));

    // Une régie qui ne remplit pas laisse un trou blanc : au bout de 2,5 s sans
    // contenu, on remet l'autopromo à la place.
    const t = setTimeout(() => {
      const el = ref.current;
      if (!cancelled && el && el.getAttribute("data-ad-status") === "unfilled") setFailed(true);
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [client, slot]);

  if (failed) return <HouseSlot format={format} seed={seed} pool={house} />;

  return (
    <div className={format === "banner" ? "w-full max-w-2xl" : "w-full max-w-md"}>
      <div className="label text-ink-faint mb-1 text-center" style={{ fontSize: 9 }}>
        Publicité
      </div>
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block", minHeight: format === "banner" ? 90 : 250 }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ─── Pub maison (autopromo) ───
function HouseSlot({ format, seed, pool }: { format: Format; seed: number; pool: HouseAd[] }) {
  const user = useStore((s) => s.user);
  const lobby = useStore((s) => s.lobby);
  const [copied, setCopied] = useState(false);

  // Choix stable pour un même entracte (pas de clignotement au re-render),
  // et on évite de vanter « crée tes questions » à qui a déjà un compte.
  const ad = useMemo(() => {
    const usable = pool.filter((a) => !(a.kind === "feature" && user));
    const list = usable.length ? usable : pool;
    return list.length ? list[Math.abs(seed) % list.length] : null;
  }, [pool, seed, user]);

  if (!ad) return null;

  async function onCta(e: React.MouseEvent) {
    if (!ad || ad.kind !== "share") return;
    e.preventDefault();
    const url = lobby ? `${SHARE_ORIGIN}/r/${lobby.code}` : SHARE_ORIGIN;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const big = format === "interstitial";

  return (
    <a
      href={ad.href ?? "#"}
      onClick={onCta}
      className={`tone-${ad.tone} block w-full ${big ? "max-w-md" : "max-w-2xl"} rounded-3xl no-underline`}
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
    >
      <div className={big ? "p-7 text-center" : "px-5 py-3.5 flex items-center gap-4"}>
        <div className={big ? "" : "flex-1 min-w-0 text-left"}>
          <div
            className="font-display tone-text leading-tight"
            style={{ fontSize: big ? "clamp(22px,4.4vmin,30px)" : 16 }}
          >
            {ad.title}
          </div>
          <div className={`font-body text-ink-soft ${big ? "mt-2 text-sm" : "text-xs mt-0.5"}`}>{ad.body}</div>
        </div>
        <span
          className={`tone-gradient shrink-0 pill text-white font-display ${big ? "mt-5 inline-block px-6 h-11 leading-[44px] text-base" : "px-4 h-9 leading-9 text-sm"}`}
        >
          {copied ? "✓ Lien copié" : ad.cta}
        </span>
      </div>
    </a>
  );
}
