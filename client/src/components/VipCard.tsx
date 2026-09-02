import { useEffect, useState } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { apiFetch, isNative } from "../lib/api";
import type { Plan } from "../types";

interface State {
  vip: boolean;
  entitlement: { plan: string; source: string; status: string; expiresAt: string | null } | null;
  usage: { used: number; limit: number | null; vip: boolean };
  plans: Plan[];
  checkout: "stripe" | null;
}

const euro = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 ? 2 : 0 });

const SOURCES: Record<string, string> = {
  stripe: "abonnement web",
  play: "Google Play",
  appstore: "App Store",
  manual: "offert",
};

// Carte VIP de l'espace membre : état de l'abonnement, quota de questions
// privées, et les offres. C'est l'hôte qui paie pour toute sa table.
export function VipCard({ onChanged }: { onChanged?: () => void }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const r = await apiFetch("/api/billing/state");
      if (r.ok) setState(await r.json());
    } catch {}
  }

  useEffect(() => {
    load();
    // retour de Stripe : ?paiement=ok — le webhook a pu arriver juste après la
    // redirection, on relit l'état une seconde plus tard.
    if (new URLSearchParams(window.location.search).get("paiement") === "ok") {
      const t = setTimeout(() => {
        load();
        onChanged?.();
      }, 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy(plan: Plan) {
    setErr(null);
    setBusy(plan.id);
    try {
      const r = await apiFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Paiement indisponible");
      window.location.href = d.url;
    } catch (e: any) {
      setErr(e.message);
      setBusy(null);
    }
  }

  if (!state) return null;

  const { vip, usage, entitlement } = state;
  const quotaPct = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <Card className="p-5">
      {vip ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-ink text-xl">✨ Tu es VIP</div>
            <div className="label text-ink-soft mt-1">
              Aucune pub pour toi ni pour tes invités, questions privées illimitées.
            </div>
            {entitlement && (
              <div className="label text-ink-faint mt-1">
                {SOURCES[entitlement.source] ?? entitlement.source}
                {entitlement.expiresAt
                  ? ` · jusqu'au ${new Date(entitlement.expiresAt).toLocaleDateString("fr-FR")}`
                  : " · sans limite de date"}
              </div>
            )}
          </div>
          <span
            className="pill px-4 h-9 leading-9 text-white font-display text-sm"
            style={{ background: "linear-gradient(135deg,#FF5E8A,#FF9F43)" }}
          >
            VIP
          </span>
        </div>
      ) : (
        <>
          <div className="font-display text-ink text-xl">Passe VIP</div>
          <div className="label text-ink-soft mt-1">
            Tes parties deviennent sans publicité — <strong>pour toute la table</strong>, pas seulement pour toi.
          </div>

          {usage.limit !== null && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="label text-ink-soft">Questions privées</span>
                <span className="label text-ink-faint">
                  {usage.used} / {usage.limit}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--hairline)]">
                <div className="h-full rounded-full brand-gradient" style={{ width: `${quotaPct}%` }} />
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {state.plans.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "var(--surface)",
                  boxShadow: p.best ? "0 0 0 2px var(--accent)" : undefined,
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-ink leading-tight">
                    {p.label} {p.best && <span className="label" style={{ color: "var(--accent-deep)" }}>· le plus choisi</span>}
                  </div>
                  <div className="label text-ink-faint mt-0.5">{p.pitch}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-ink whitespace-nowrap">
                    {euro(p.price)}
                    <span className="label text-ink-faint"> / {p.period}</span>
                  </span>
                  <Button size="sm" disabled={!p.buyable || busy === p.id} onClick={() => buy(p)}>
                    {busy === p.id ? "…" : p.buyable ? "Choisir" : "Bientôt"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!state.checkout && (
            <div className="label text-ink-faint mt-3">
              Le paiement n'est pas encore ouvert. Écris-nous pour passer VIP dès maintenant.
            </div>
          )}
          {isNative && (
            <div className="label text-ink-faint mt-2">
              Depuis l'app, l'achat passera par ton store une fois la fiche produit publiée.
            </div>
          )}
          {err && <div className="label mt-3 text-[#E03E73]">{err}</div>}
        </>
      )}
    </Card>
  );
}
