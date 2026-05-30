import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TONE, type Tone } from "../lib/colors";

interface Category { id: string; name: string; emoji: string; tone: Tone; count: number }
interface Question { id: string; text: string; categoryId: string; enabled: boolean }
interface Stats { total: number; enabled: number; byTone: Record<string, number> }
interface Data { categories: Category[]; questions: Question[]; stats: Stats }

const KEY = "qui_admin_key";
const getKey = () => localStorage.getItem(KEY) || "";

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "x-admin-key": getKey(), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err: any = new Error(e.error || `Erreur ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function Admin() {
  const [authed, setAuthed] = useState(!!getKey());
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"questions" | "categories">("questions");
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    try {
      const d = await api("/data");
      setData(d);
    } catch (e: any) {
      if (e.status === 401) {
        localStorage.removeItem(KEY);
        setAuthed(false);
      } else setErr(e.message);
    }
  }

  useEffect(() => {
    if (authed) reload();
  }, [authed]);

  function flash(e: any) {
    setErr(e?.message || String(e));
    setTimeout(() => setErr(null), 3500);
  }

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  return (
    <div className="relative h-full w-full overflow-y-auto no-scrollbar">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Header data={data} onLogout={() => { localStorage.removeItem(KEY); setAuthed(false); }} />

        <div className="mt-5 flex gap-2">
          <TabBtn active={tab === "questions"} onClick={() => setTab("questions")}>
            Questions {data ? `· ${data.stats.total}` : ""}
          </TabBtn>
          <TabBtn active={tab === "categories"} onClick={() => setTab("categories")}>
            Catégories {data ? `· ${data.categories.length}` : ""}
          </TabBtn>
        </div>

        <div className="mt-5">
          {!data ? (
            <div className="label text-ink-soft py-10 text-center">Chargement…</div>
          ) : tab === "questions" ? (
            <QuestionsTab data={data} reload={reload} onErr={flash} />
          ) : (
            <CategoriesTab data={data} reload={reload} onErr={flash} />
          )}
        </div>
      </div>

      {err && (
        <div
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 font-display text-sm text-white"
          style={{ background: "linear-gradient(135deg,#FF5C7A,#B5179E)", boxShadow: "0 12px 30px -8px rgba(181,23,158,0.5)" }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

// ─── Login ───
function Login({ onAuthed }: { onAuthed: () => void }) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!pwd) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) throw new Error("Mot de passe incorrect");
      localStorage.setItem(KEY, pwd);
      onAuthed();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center px-5">
      <Card className="w-full max-w-sm p-7">
        <div className="font-display brand-gradient text-3xl">Admin · Qui ?</div>
        <div className="label text-ink-soft mt-1 mb-5">Gestion des questions</div>
        <input
          autoFocus
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Mot de passe"
          className="w-full rounded-2xl bg-[#FFF1E9] px-4 py-3 font-display text-xl text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-[#FF5E8A]"
        />
        {err && <div className="label text-[#E03E73] mt-2">{err}</div>}
        <div className="mt-5">
          <Button fullWidth disabled={!pwd || busy} onClick={submit}>
            {busy ? "…" : "Entrer →"}
          </Button>
        </div>
        <a href="/" className="label text-ink-faint mt-4 block text-center hover:text-ink">← Retour au jeu</a>
      </Card>
    </div>
  );
}

// ─── Header + stats ───
function Header({ data, onLogout }: { data: Data | null; onLogout: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="font-display brand-gradient text-3xl leading-none">Admin · Qui ?</div>
        {data && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Stat label="Actives" value={`${data.stats.enabled}/${data.stats.total}`} />
            {(["warm", "spicy", "fun"] as Tone[]).map((t) => (
              <span key={t} className={`tone-${t} pill px-2.5 py-1 text-white text-xs`} style={{ background: "linear-gradient(135deg,var(--tone-a),var(--tone-b))" }}>
                {TONE[t].emoji} {data.stats.byTone[t] ?? 0}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <a href="/" className="label self-center text-ink-soft hover:text-ink">↗ Jeu</a>
        <Button variant="ghost" size="sm" onClick={onLogout}>Déconnexion</Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="pill px-2.5 py-1 text-xs" style={{ background: "rgba(255,94,138,0.12)", color: "var(--accent-deep)" }}>
      {label} {value}
    </span>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

// ─── Questions tab ───
function QuestionsTab({ data, reload, onErr }: { data: Data; reload: () => void; onErr: (e: any) => void }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const catById = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  const filtered = data.questions.filter((q) => {
    if (catFilter !== "all" && q.categoryId !== catFilter) return false;
    if (onlyEnabled && !q.enabled) return false;
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <AddQuestion categories={data.categories} reload={reload} onErr={onErr} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="flex-1 min-w-[140px] rounded-xl bg-[#FFF1E9] px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-xl bg-[#FFF1E9] px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Toutes catégories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setOnlyEnabled((v) => !v)}
            className="pill px-3 h-9 text-xs"
            style={onlyEnabled ? { background: "linear-gradient(135deg,#FF5E8A,#FF9F43)", color: "#fff" } : { background: "rgba(255,94,138,0.1)", color: "var(--accent-deep)" }}
          >
            Actives seules
          </button>
          <span className="label text-ink-faint ml-auto">{filtered.length} / {data.questions.length}</span>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          {filtered.map((q) => (
            <QuestionRow key={q.id} q={q} cat={catById[q.categoryId]} categories={data.categories} reload={reload} onErr={onErr} />
          ))}
          {filtered.length === 0 && <div className="label text-ink-faint py-6 text-center">Aucune question</div>}
        </div>
      </Card>
    </div>
  );
}

function AddQuestion({ categories, reload, onErr }: { categories: Category[]; reload: () => void; onErr: (e: any) => void }) {
  const [text, setText] = useState("");
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState("");

  async function add() {
    const t = text.trim();
    if (!t) return;
    try {
      await api("/questions", { method: "POST", body: JSON.stringify({ text: t, categoryId: catId }) });
      setText("");
      reload();
    } catch (e) { onErr(e); }
  }

  async function addBulk() {
    const texts = bulk.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!texts.length) return;
    try {
      await api("/questions/bulk", { method: "POST", body: JSON.stringify({ texts, categoryId: catId }) });
      setBulk("");
      setBulkOpen(false);
      reload();
    } catch (e) { onErr(e); }
  }

  return (
    <Card className="p-4">
      <div className="label text-ink-soft mb-2">Ajouter une question</div>
      <div className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Qui… ?"
          className="flex-1 min-w-[180px] rounded-xl bg-[#FFF1E9] px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]"
        />
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="rounded-xl bg-[#FFF1E9] px-3 py-2.5 text-sm text-ink outline-none">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <Button size="sm" onClick={add} disabled={!text.trim()}>Ajouter</Button>
      </div>
      <button onClick={() => setBulkOpen((v) => !v)} className="label text-ink-faint mt-2 hover:text-ink">
        {bulkOpen ? "− Masquer l'ajout en masse" : "+ Ajout en masse"}
      </button>
      {bulkOpen && (
        <div className="mt-2">
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder="Une question par ligne…"
            className="w-full rounded-xl bg-[#FFF1E9] px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={addBulk} disabled={!bulk.trim()}>
              Ajouter {bulk.split("\n").filter((s) => s.trim()).length || ""} →
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function QuestionRow({ q, cat, categories, reload, onErr }: { q: Question; cat?: Category; categories: Category[]; reload: () => void; onErr: (e: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.text);
  const [catId, setCatId] = useState(q.categoryId);

  async function save() {
    try {
      await api(`/questions/${q.id}`, { method: "PUT", body: JSON.stringify({ text, categoryId: catId }) });
      setEditing(false);
      reload();
    } catch (e) { onErr(e); }
  }
  async function toggle() {
    try { await api(`/questions/${q.id}`, { method: "PUT", body: JSON.stringify({ enabled: !q.enabled }) }); reload(); }
    catch (e) { onErr(e); }
  }
  async function del() {
    if (!confirm("Supprimer cette question ?")) return;
    try { await api(`/questions/${q.id}`, { method: "DELETE" }); reload(); }
    catch (e) { onErr(e); }
  }

  if (editing) {
    return (
      <div className="rounded-2xl p-2.5 flex flex-wrap items-center gap-2" style={{ background: "#FFF1E9" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 min-w-[160px] rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF5E8A]" />
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="rounded-lg bg-white px-2 py-2 text-sm outline-none">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <Button size="sm" onClick={save}>OK</Button>
        <button onClick={() => { setEditing(false); setText(q.text); setCatId(q.categoryId); }} className="label text-ink-soft px-2">Annuler</button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl px-3 py-2.5 flex items-center gap-3 ${q.enabled ? "" : "opacity-50"}`} style={{ background: "#FFF1E9" }}>
      <Toggle on={q.enabled} onClick={toggle} />
      <span className="flex-1 text-sm text-ink leading-tight">{q.text}</span>
      {cat && (
        <span className={`tone-${cat.tone} shrink-0 pill px-2 py-1 text-white text-[11px]`} style={{ background: "linear-gradient(135deg,var(--tone-a),var(--tone-b))" }}>
          {cat.emoji} {cat.name}
        </span>
      )}
      <button onClick={() => setEditing(true)} className="label text-ink-soft hover:text-ink shrink-0">Éditer</button>
      <button onClick={del} className="label text-[#E03E73] hover:opacity-70 shrink-0">✕</button>
    </div>
  );
}

// ─── Categories tab ───
function CategoriesTab({ data, reload, onErr }: { data: Data; reload: () => void; onErr: (e: any) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <AddCategory reload={reload} onErr={onErr} />
      <Card className="p-4">
        <div className="flex flex-col gap-1.5">
          {data.categories.map((c) => (
            <CategoryRow key={c.id} c={c} canDelete={data.categories.length > 1} reload={reload} onErr={onErr} />
          ))}
        </div>
      </Card>
    </div>
  );
}

const TONE_OPTS: Tone[] = ["warm", "spicy", "fun"];

function ToneSelect({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Tone)} className="rounded-xl bg-[#FFF1E9] px-3 py-2.5 text-sm text-ink outline-none">
      {TONE_OPTS.map((t) => <option key={t} value={t}>{TONE[t].emoji} {TONE[t].label}</option>)}
    </select>
  );
}

function AddCategory({ reload, onErr }: { reload: () => void; onErr: (e: any) => void }) {
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

  return (
    <Card className="p-4">
      <div className="label text-ink-soft mb-2">Ajouter une catégorie</div>
      <div className="flex flex-wrap gap-2">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="w-14 rounded-xl bg-[#FFF1E9] px-3 py-2.5 text-center text-lg outline-none focus:ring-2 focus:ring-[#FF5E8A]" />
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nom de la catégorie" className="flex-1 min-w-[140px] rounded-xl bg-[#FFF1E9] px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-[#FF5E8A]" />
        <ToneSelect value={tone} onChange={setTone} />
        <Button size="sm" onClick={add} disabled={!name.trim()}>Ajouter</Button>
      </div>
      <div className="label text-ink-faint mt-2">L'ambiance donne la couleur en jeu : {TONE.warm.emoji} le meilleur · {TONE.spicy.emoji} le pire · {TONE.fun.emoji} pour rire</div>
    </Card>
  );
}

function CategoryRow({ c, canDelete, reload, onErr }: { c: Category; canDelete: boolean; reload: () => void; onErr: (e: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [emoji, setEmoji] = useState(c.emoji);
  const [tone, setTone] = useState<Tone>(c.tone);

  async function save() {
    try {
      await api(`/categories/${c.id}`, { method: "PUT", body: JSON.stringify({ name, emoji, tone }) });
      setEditing(false);
      reload();
    } catch (e) { onErr(e); }
  }
  async function del() {
    if (!confirm(c.count > 0 ? `Supprimer « ${c.name} » ? Ses ${c.count} questions seront déplacées vers une autre catégorie.` : `Supprimer « ${c.name} » ?`)) return;
    try { await api(`/categories/${c.id}`, { method: "DELETE" }); reload(); }
    catch (e) { onErr(e); }
  }

  if (editing) {
    return (
      <div className="rounded-2xl p-2.5 flex flex-wrap items-center gap-2" style={{ background: "#FFF1E9" }}>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="w-12 rounded-lg bg-white px-2 py-2 text-center text-lg outline-none" />
        <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[120px] rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF5E8A]" />
        <ToneSelect value={tone} onChange={setTone} />
        <Button size="sm" onClick={save}>OK</Button>
        <button onClick={() => { setEditing(false); setName(c.name); setEmoji(c.emoji); setTone(c.tone); }} className="label text-ink-soft px-2">Annuler</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl px-3 py-2.5 flex items-center gap-3" style={{ background: "#FFF1E9" }}>
      <span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ background: `linear-gradient(135deg, ${TONE[c.tone].a}, ${TONE[c.tone].b})` }}>
        {c.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-ink leading-tight">{c.name}</div>
        <div className="label text-ink-faint">{TONE[c.tone].label} · {c.count} question{c.count > 1 ? "s" : ""}</div>
      </div>
      <button onClick={() => setEditing(true)} className="label text-ink-soft hover:text-ink shrink-0">Éditer</button>
      {canDelete && <button onClick={del} className="label text-[#E03E73] hover:opacity-70 shrink-0">✕</button>}
    </div>
  );
}

// ─── Toggle ───
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative shrink-0 rounded-full transition-colors"
      style={{ width: 40, height: 24, background: on ? "linear-gradient(135deg,#FF5E8A,#FF9F43)" : "rgba(36,27,51,0.18)" }}
      aria-pressed={on}
    >
      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 20, height: 20, left: on ? 18 : 2, boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
    </button>
  );
}
