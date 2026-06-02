import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Brand } from "../components/Brand";
import { ThemeToggle } from "../components/ThemeToggle";
import { TONE, type Tone } from "../lib/colors";

interface Category { id: string; name: string; emoji: string; tone: Tone; count: number }
interface Question { id: string; text: string; categoryId: string; enabled: boolean }
interface Data { categories: Category[]; questions: Question[]; stats: { total: number; enabled: number } }

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`/api/me${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Erreur ${res.status}`);
  }
  return res.json();
}

const EMOJIS = ["🎲", "🔥", "💛", "😂", "💔", "🧠", "🍕", "👀", "🎯", "✨", "😈", "🤫"];

export function Member() {
  const { user, loadMe, logout } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadMe().finally(() => setReady(true));
  }, [loadMe]);

  return (
    <>
      <ThemeToggle className="fixed top-5 right-5 z-50" />
      {!ready ? (
        <div className="grid h-full place-items-center label text-ink-soft">…</div>
      ) : !user ? (
        <Login />
      ) : (
        <Dashboard onLogout={logout} email={user.email} name={user.name || undefined} />
      )}
    </>
  );
}

// ─── Connexion ───
function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function magic() {
    if (!email.includes("@")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erreur");
      setSent(d.devLink ? `Lien (dev) : ${d.devLink}` : "Vérifie tes mails ! 📬");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center px-5">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <Brand size="md" />
        <Card className="w-full p-7 flex flex-col gap-4">
          <div className="text-center">
            <div className="font-display text-2xl text-ink">Mon espace</div>
            <div className="label text-ink-soft mt-1">Crée tes propres questions privées</div>
          </div>
          <a href="/api/auth/google" className="w-full">
            <Button variant="soft" size="lg" fullWidth>
              <span style={{ fontSize: 18 }}>🇬</span> Continuer avec Google
            </Button>
          </a>
          <div className="flex items-center gap-2 text-ink-faint">
            <div className="h-px flex-1 bg-[var(--hairline)]" />
            <span className="label">ou</span>
            <div className="h-px flex-1 bg-[var(--hairline)]" />
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full rounded-2xl bg-[var(--surface)] px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]"
            />
            <Button fullWidth disabled={!email.includes("@") || busy} onClick={magic}>
              {busy ? "…" : "Recevoir un lien magique"}
            </Button>
          </div>
          {sent && <div className="label text-center" style={{ color: "var(--accent-deep)", wordBreak: "break-all" }}>{sent}</div>}
          {err && <div className="label text-center text-[#E03E73]">{err}</div>}
          <a href="/" className="label text-ink-faint text-center hover:text-ink">← Retour au jeu</a>
        </Card>
      </div>
    </div>
  );
}

// ─── Tableau de bord membre ───
function Dashboard({ onLogout, email, name }: { onLogout: () => void; email: string; name?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"questions" | "categories">("questions");
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    try {
      setData(await api("/data"));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => {
    reload();
  }, []);

  function flash(e: any) {
    setErr(e?.message || String(e));
    setTimeout(() => setErr(null), 3500);
  }

  return (
    <div className="relative h-full w-full overflow-y-auto no-scrollbar">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display brand-gradient text-3xl leading-none">Mon espace</div>
            <div className="label text-ink-faint mt-1">{name ? `${name} · ` : ""}{email}</div>
          </div>
          <div className="flex gap-2">
            <a href="/" className="label self-center text-ink-soft hover:text-ink">↗ Jeu</a>
            <Button variant="ghost" size="sm" onClick={onLogout}>Déconnexion</Button>
          </div>
        </div>

        <div className="mt-3 label text-ink-soft">
          Tes questions privées s'ajoutent à tes parties quand tu es l'hôte. 🔒
        </div>

        <div className="mt-4 flex gap-2">
          <Tab active={tab === "questions"} onClick={() => setTab("questions")}>
            Mes questions {data ? `· ${data.stats.total}` : ""}
          </Tab>
          <Tab active={tab === "categories"} onClick={() => setTab("categories")}>
            Mes catégories {data ? `· ${data.categories.length}` : ""}
          </Tab>
        </div>

        <div className="mt-5">
          {!data ? (
            <div className="label text-ink-soft py-10 text-center">Chargement…</div>
          ) : tab === "questions" ? (
            <Questions data={data} reload={reload} onErr={flash} />
          ) : (
            <Categories data={data} reload={reload} onErr={flash} />
          )}
        </div>
      </div>

      {err && (
        <div
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 font-display text-sm text-white"
          style={{ background: "linear-gradient(135deg,#FF5C7A,#B5179E)" }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pill px-5 h-10 text-sm transition-all ${active ? "text-white" : "text-ink-soft hover:text-ink"}`}
      style={active ? { background: "linear-gradient(135deg,#FF5E8A,#FF9F43)" } : { background: "rgba(255,94,138,0.1)" }}
    >
      {children}
    </button>
  );
}

// ─── Questions ───
function Questions({ data, reload, onErr }: { data: Data; reload: () => void; onErr: (e: any) => void }) {
  const [text, setText] = useState("");
  const [catId, setCatId] = useState(data.categories[0]?.id ?? "");
  const catById = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  useEffect(() => {
    if (!catId && data.categories[0]) setCatId(data.categories[0].id);
  }, [data.categories, catId]);

  async function add() {
    if (!text.trim() || !catId) return;
    try {
      await api("/questions", { method: "POST", body: JSON.stringify({ text: text.trim(), categoryId: catId }) });
      setText("");
      reload();
    } catch (e) { onErr(e); }
  }
  async function toggle(q: Question) {
    try { await api(`/questions/${q.id}`, { method: "PUT", body: JSON.stringify({ enabled: !q.enabled }) }); reload(); }
    catch (e) { onErr(e); }
  }
  async function del(q: Question) {
    if (!confirm("Supprimer cette question ?")) return;
    try { await api(`/questions/${q.id}`, { method: "DELETE" }); reload(); } catch (e) { onErr(e); }
  }

  if (data.categories.length === 0) {
    return <Card className="p-6 text-center label text-ink-soft">Crée d'abord une catégorie dans l'onglet « Mes catégories ».</Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="label text-ink-soft mb-2">Ajouter une question privée</div>
        <div className="flex flex-wrap gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Qui… ?"
            className="flex-1 min-w-[180px] rounded-xl bg-[var(--surface)] px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]"
          />
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="rounded-xl bg-[var(--surface)] px-3 py-2.5 text-sm text-ink outline-none">
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <Button size="sm" onClick={add} disabled={!text.trim()}>Ajouter</Button>
        </div>
      </Card>

      <Card className="p-4 flex flex-col gap-1.5">
        {data.questions.length === 0 && <div className="label text-ink-faint py-6 text-center">Aucune question pour l'instant</div>}
        {data.questions.map((qq) => (
          <div key={qq.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${qq.enabled ? "" : "opacity-50"}`} style={{ background: "var(--surface)" }}>
            <span className="flex-1 text-sm text-ink leading-tight">{qq.text}</span>
            {catById[qq.categoryId] && (
              <span className={`tone-${catById[qq.categoryId].tone} shrink-0 pill px-2 py-1 text-white text-[11px]`} style={{ background: "linear-gradient(135deg,var(--tone-a),var(--tone-b))" }}>
                {catById[qq.categoryId].emoji}
              </span>
            )}
            <button onClick={() => toggle(qq)} className="label text-ink-soft hover:text-ink shrink-0">{qq.enabled ? "ON" : "OFF"}</button>
            <button onClick={() => del(qq)} className="label text-[#E03E73] hover:opacity-70 shrink-0">✕</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Catégories ───
function Categories({ data, reload, onErr }: { data: Data; reload: () => void; onErr: (e: any) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [tone, setTone] = useState<Tone>("fun");

  async function add() {
    if (!name.trim()) return;
    try {
      await api("/categories", { method: "POST", body: JSON.stringify({ name, emoji, tone }) });
      setName(""); setEmoji("🎲"); setTone("fun");
      reload();
    } catch (e) { onErr(e); }
  }
  async function del(c: Category) {
    if (!confirm(`Supprimer « ${c.name} » ?${c.count ? ` (${c.count} questions déplacées)` : ""}`)) return;
    try { await api(`/categories/${c.id}`, { method: "DELETE" }); reload(); } catch (e) { onErr(e); }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="label text-ink-soft mb-2">Nouvelle catégorie</div>
        <div className="flex flex-wrap gap-2">
          <select value={emoji} onChange={(e) => setEmoji(e.target.value)} className="rounded-xl bg-[var(--surface)] px-2 py-2.5 text-lg outline-none">
            {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nom" className="flex-1 min-w-[120px] rounded-xl bg-[var(--surface)] px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]" />
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="rounded-xl bg-[var(--surface)] px-3 py-2.5 text-sm text-ink outline-none">
            {(["warm", "spicy", "fun"] as Tone[]).map((t) => <option key={t} value={t}>{TONE[t].emoji} {TONE[t].label}</option>)}
          </select>
          <Button size="sm" onClick={add} disabled={!name.trim()}>Créer</Button>
        </div>
      </Card>

      <Card className="p-4 flex flex-col gap-1.5">
        {data.categories.length === 0 && <div className="label text-ink-faint py-6 text-center">Aucune catégorie privée</div>}
        {data.categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "var(--surface)" }}>
            <span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ background: `linear-gradient(135deg, ${TONE[c.tone].a}, ${TONE[c.tone].b})` }}>{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display text-ink leading-tight">{c.name}</div>
              <div className="label text-ink-faint">{TONE[c.tone].label} · {c.count} question{c.count > 1 ? "s" : ""}</div>
            </div>
            <button onClick={() => del(c)} className="label text-[#E03E73] hover:opacity-70 shrink-0">✕</button>
          </div>
        ))}
      </Card>
    </div>
  );
}
