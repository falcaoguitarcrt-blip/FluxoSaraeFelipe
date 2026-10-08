import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Receipt, CalendarClock, CreditCard, TrendingUp, Target,
  Settings, Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Check, Download, Upload, Wallet, AlertCircle,
  MoreHorizontal, Landmark, Scale, Zap, Sun, Moon, Search, Copy, 
  ArrowDownToLine, ArrowUpFromLine, BookOpen, LineChart as LineChartIcon, Lock, KeyRound, ShieldCheck
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

const FONT_LINK_ID = "fluxo-casal-fonts";
const STORAGE_KEY = "fluxo-casal-v4";
const THEME_KEY = "fluxo-casal-theme";
const PIN_KEY = "fluxo-casal-pin";

const INK = "var(--c-ink, #20281F)";
const PAPER = "var(--c-paper, #F5F4EF)";
const SURFACE = "var(--c-surface, #FFFFFF)";
const COUPLE = "var(--c-couple, #6B3FCA)"; 
const INCOME = "var(--c-income, #3F7D5C)";
const EXPENSE = "var(--c-expense, #A6432E)";
const CARD_BLUE = "var(--c-cardblue, #3B5A73)";
const MUTED = "var(--c-muted, #7A7A6F)";
const BORDER = "var(--c-border, #E4E1D6)";
const BORDER_SOFT = "var(--c-border-soft, #D8D5C8)";
const INCOME_BG = "var(--c-income-bg, #E8F1EB)";
const EXPENSE_BG = "var(--c-expense-bg, #F5E7E2)";
const PANEL = "var(--c-panel, #F0EEE5)";
const ALERT_BG = "var(--c-alert-bg, #FBF1EC)";
const ALERT_BORDER = "var(--c-alert-border, #E6C9C0)";
const MUTED_PANEL = "var(--c-muted-panel, #E9E5D6)";
const FELIPE = "var(--c-felipe, #1D5FE0)";
const SARA = "var(--c-sara, #9B1FC7)";
const OTHER = "var(--c-other, #C62828)";

const PAPER_TINT = `color-mix(in srgb, ${COUPLE} 3%, ${PAPER})`;
const SURFACE_TINT = `color-mix(in srgb, ${COUPLE} 2%, ${SURFACE})`;
const PANEL_TINT = `color-mix(in srgb, ${COUPLE} 7%, ${PANEL})`;

const THEMES = {
  light: {
    "--c-ink": "#1E251D", "--c-paper": "#F8F7F2", "--c-surface": "#FFFFFF",
    "--c-couple": "#6B3FCA", "--c-couple-grad": "linear-gradient(135deg, #1D5FE0, #9B1FC7)",
    "--c-income": "#2F6B4C", "--c-expense": "#9C3A27", "--c-cardblue": "#35526A",
    "--c-muted": "#6E6E63", "--c-border": "#E2DFD2", "--c-border-soft": "#D1CEC0",
    "--c-income-bg": "#E5EFEB", "--c-expense-bg": "#F5E4E0", "--c-panel": "#EEECE1",
    "--c-alert-bg": "#FCEFEB", "--c-alert-border": "#E4C5BC", "--c-muted-panel": "#E5E1D0",
    "--c-felipe": "#1D5FE0", "--c-sara": "#9B1FC7", "--c-other": "#C62828",
  },
  dark: {
    "--c-ink": "#F0EDE2", "--c-paper": "#12140F", "--c-surface": "#1B1D15",
    "--c-couple": "#A370F2", "--c-couple-grad": "linear-gradient(135deg, #4C8DFF, #D64CF0)",
    "--c-income": "#56B680", "--c-expense": "#E0755C", "--c-cardblue": "#72A4D1",
    "--c-muted": "#A3A293", "--c-border": "#2E3125", "--c-border-soft": "#3A3D2F",
    "--c-income-bg": "#19281F", "--c-expense-bg": "#33221C", "--c-panel": "#20231A",
    "--c-alert-bg": "#33241D", "--c-alert-border": "#543A2F", "--c-muted-panel": "#26291E",
    "--c-felipe": "#4C8DFF", "--c-sara": "#D64CF0", "--c-other": "#EF5350",
  },
};

function profileColor(data, profileKey) {
  if (!data || !data.profiles) return COUPLE;
  const idx = data.profiles.findIndex((p) => p.key === profileKey);
  if (idx === 0) return FELIPE;
  if (idx === 1) return SARA;
  if (profileKey === "p3") return OTHER;
  return COUPLE;
}

function transactionStatusInfo(transaction) {
  const direction = transaction?.direction || "out";
  const status = transaction?.status || (direction === "in" ? "received" : "paid");
  if (direction === "in") {
    return status === "pending"
      ? { label: "Pendente", color: COUPLE, bg: PAPER + "22", nextStatus: "received", nextLabel: "Recebido" }
      : { label: "Recebido", color: INCOME, bg: INCOME_BG, nextStatus: "pending", nextLabel: "Pendente" };
  }
  return status === "pending"
    ? { label: "Pendente", color: COUPLE, bg: PAPER + "22", nextStatus: "paid", nextLabel: "Paga" }
    : { label: "Paga", color: INCOME, bg: INCOME_BG, nextStatus: "pending", nextLabel: "Pendente" };
}

const transactionAffectsBalance = (transaction) => transaction?.status !== "pending";

function saraProfileKey(data) {
  if (!data || !data.profiles) return "p2";
  const byName = data.profiles.find((p) => p.name.trim().toLowerCase() === "sara");
  return (byName || data.profiles[1] || data.profiles[0])?.key;
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);
const fmtCurrency = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s) => {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtMonthLabel = (m) => {
  if (!m) return "";
  const d = new Date(m + "-01T00:00:00");
  const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const addMonths = (m, delta) => {
  if (!m) return currentMonthStr();
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const DEFAULT_STATE = {
  lastAutoBackup: 0,
  initialBalances: { p1: 0, p2: 0, p3: 0 },
  profiles: [{ key: "p1", name: "Felipe" }, { key: "p2", name: "Sara" }, { key: "p3", name: "Outros" }],
  incomeCategories: ["Salário", "Freelance", "Rendimentos", "Reembolso", "Outros"],
  expenseCategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Cuidado pessoal", "Pets", "Outros"],
  banks: ["Nubank", "Itaú", "Bradesco", "Caixa", "Banco do Brasil", "Inter", "Carteira"],
  investmentCategories: ["Renda fixa", "Renda variável", "Fundos", "Cripto", "Previdência", "Outros"],
  goalCategories: ["Reserva de emergência", "Viagem", "Compra grande", "Educação", "Presente", "Outros"],
  budgetLimits: {},
  transactions: [],
  bills: [],
  cards: [],
  cardPurchases: [],
  investments: [],
  goals: [],
  netWorthHistory: [],
  paidStatements: {},
};

const firebaseConfig = {
  apiKey: "AIzaSyAvdngV2HMKdAIUmK1f9IF0gm4uEXPdd44", 
  authDomain: "fluxo-de-caixa-59dd1.firebaseapp.com",
  projectId: "fluxo-de-caixa-59dd1",
  storageBucket: "fluxo-de-caixa-59dd1.appspot.com",
  messagingSenderId: "367352854109",
  appId: "1:367352854109:web:a6273752e5a7ea891c305e"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

const appId = "fluxo-casal-producao"; 

async function loadTheme() {
  try { const res = localStorage.getItem(THEME_KEY); if (res) return res; } catch (e) {}
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

async function loadPin() {
  try {
    let p = localStorage.getItem(PIN_KEY);
    if (!p) { p = "0403"; localStorage.setItem(PIN_KEY, p); }
    return p;
  } catch (e) { return "0403"; }
}

async function savePin(pin) {
  try { localStorage.setItem(PIN_KEY, pin); } catch (e) {}
}

async function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function Money({ value, tone }) {
  const color = tone === "income" ? INCOME : tone === "expense" ? EXPENSE : INK;
  return <span style={{ fontFamily: "'Source Serif 4', serif", color, fontVariantNumeric: "tabular-nums" }}>{fmtCurrency(value)}</span>;
}

function SectionTitle({ children, subtitle }) {
  return (
    <div className="mb-4">
      <h2 style={{ fontFamily: "'Source Serif 4', serif", background: "var(--c-couple-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent", display: "inline-block" }} className="text-xl font-semibold tracking-tight">{children}</h2>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: MUTED }}>{subtitle}</p>}
    </div>
  );
}

function Card({ children, className = "", style = {} }) {
  return <div className={`border rounded-2xl shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md ${className}`} style={{ borderColor: BORDER, backgroundColor: SURFACE_TINT, ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", type = "button", className = "", disabled }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 shadow-sm active:scale-95 cursor-pointer";
  const styles = {
    primary: { backgroundColor: INK, color: PAPER },
    couple: { background: "var(--c-couple-grad)", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(107, 63, 202, 0.3)" },
    ghost: { backgroundColor: "transparent", color: INK, border: `1px solid ${BORDER_SOFT}`, shadow: "none" },
    danger: { backgroundColor: "transparent", color: EXPENSE, border: `1px solid ${ALERT_BORDER}`, shadow: "none" },
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={styles[variant]}>{children}</button>;
}

function Field({ label, children }) {
  return (
    <label className="block text-sm mb-4">
      <span className="block mb-1.5 font-semibold text-xs uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm";
const inputStyle = { borderColor: BORDER_SOFT, backgroundColor: SURFACE, color: INK, colorScheme: "light", "--tw-ring-color": `${COUPLE}55` };

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95`} style={{ backgroundColor: PANEL_TINT, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur-md" style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: `${PANEL_TINT}F0`, zIndex: 10 }}>
          <h3 style={{ fontFamily: "'Source Serif 4', serif", background: "var(--c-couple-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent" }} className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center bg-white cursor-pointer hover:scale-105 transition-transform shadow-sm" style={{ border: `1px solid ${BORDER_SOFT}`, color: INK }}><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: INK }}>{message}</p>
      <div className="flex gap-3"><Btn variant="ghost" className="flex-1 justify-center py-3" onClick={onClose}>Cancelar</Btn><Btn variant="danger" className="flex-1 justify-center py-3" onClick={onConfirm}>Excluir</Btn></div>
    </Modal>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: PANEL_TINT }}><Icon size={28} style={{ color: COUPLE }} /></div>
      <p className="font-semibold text-base" style={{ color: INK }}>{title}</p>
      {hint && <p className="text-sm mt-1.5 max-w-xs mx-auto leading-relaxed" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

function ProfileBadge({ name, size = "sm", color }) {
  const initials = (name || "?").slice(0, 1).toUpperCase();
  const dim = size === "sm" ? 26 : 36;
  return <span className="inline-flex items-center justify-center rounded-full font-bold shrink-0 shadow-sm" style={{ width: dim, height: dim, backgroundColor: color || MUTED_PANEL, color: "#fff", fontSize: dim * 0.42, border: `2px solid ${SURFACE}` }} title={name}>{initials}</span>;
}

function Dot({ color }) { return <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle shadow-sm" style={{ backgroundColor: color }} />; }

function PinLockScreen({ onUnlock, savedPin, setSavedPin, theme, toggleTheme }) {
  const [enteredPin, setEnteredPin] = useState(""); const [error, setError] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false); const [confirmPin, setConfirmPin] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSettingUp) {
      if (!confirmPin) { if (enteredPin.length < 4) { setError(true); return; } setConfirmPin(enteredPin); setEnteredPin(""); setError(false); }
      else { if (enteredPin === confirmPin) { savePin(enteredPin).then(() => { setSavedPin(enteredPin); onUnlock(); }); } else { setError(true); setEnteredPin(""); setConfirmPin(""); } }
    } else { if (enteredPin === (savedPin || "0403")) { onUnlock(); } else { setError(true); setEnteredPin(""); } }
  };
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden" style={{ ...THEMES[theme], backgroundColor: PAPER_TINT, color: INK, fontFamily: "'Inter', sans-serif" }}>
      <div className="absolute top-6 right-6 z-20"><button onClick={toggleTheme} className="w-12 h-12 rounded-full flex items-center justify-center border shrink-0 bg-transparent cursor-pointer hover:scale-105 transition-all shadow-md" style={{ borderColor: BORDER_SOFT, color: MUTED, backgroundColor: SURFACE }}>{theme === "light" ? <Moon size={22} /> : <Sun size={22} />}</button></div>
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl shadow-2xl border backdrop-blur-xl flex flex-col items-center animate-in zoom-in-95 duration-500 z-10" style={{ backgroundColor: SURFACE_TINT, borderColor: BORDER }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl text-white animate-bounce-subtle" style={{ background: "var(--c-couple-grad)" }}><ShieldCheck size={40} /></div>
        <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2" style={{ backgroundColor: `${COUPLE}15`, color: COUPLE }}>Segurança Profissional</span>
        <h1 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-3xl font-black mb-2 text-center">{isSettingUp ? (confirmPin ? "Confirme o novo PIN" : "Criar novo PIN") : "Fluxo do Casal"}</h1>
        <p className="text-xs text-center mb-8 font-medium leading-relaxed max-w-xs" style={{ color: MUTED }}>{isSettingUp ? (confirmPin ? "Digite o PIN novamente para confirmar a alteração." : "Digite uma nova senha numérica de 4 dígitos.") : "Insira seu PIN de segurança para acessar o painel financeiro compartilhado (Padrão: 0403)."}</p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-5">
          <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus className={`w-full text-center text-4xl font-black tracking-[0.5em] py-4 rounded-2xl border-2 transition-all shadow-inner focus:outline-none ${error ? "border-red-500 bg-red-50 text-red-500 animate-shake" : ""}`} style={{ borderColor: error ? "#EF4444" : COUPLE, backgroundColor: SURFACE, color: INK }} value={enteredPin} onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, "")); setError(false); }} placeholder="••••" />
          {error && <p className="text-xs font-bold text-red-500 text-center animate-pulse">PIN incorreto. Tente novamente.</p>}
          <Btn type="submit" variant="couple" className="w-full justify-center py-4 text-base font-bold shadow-xl tracking-wide">DESBLOQUEAR PAINEL</Btn>
        </form>
        {!isSettingUp && <button onClick={() => { setIsSettingUp(true); setEnteredPin(""); setError(false); setConfirmPin(""); }} className="text-xs underline font-semibold mt-6 cursor-pointer hover:opacity-80 transition-opacity" style={{ color: MUTED }}>Alterar PIN de segurança</button>}
      </div>
    </div>
  );
}

function GlobalFAB({ setModal, isDesktop }) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (fabRef.current && !fabRef.current.contains(e.target)) setIsOpen(false); };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);
  const actions = [
    { icon: ArrowUpCircle, label: "Nova Receita", color: INCOME, onClick: () => setModal({ type: "transaction", direction: "in" }) },
    { icon: ArrowDownCircle, label: "Nova Despesa", color: EXPENSE, onClick: () => setModal({ type: "transaction", direction: "out" }) },
    { icon: CreditCard, label: "Compra Cartão", color: CARD_BLUE, onClick: () => setModal({ type: "cardPurchase" }) },
  ];
  return (
    <div ref={fabRef} className={`fixed ${isDesktop ? 'bottom-8 right-8 absolute' : 'bottom-20 right-4 lg:bottom-8 lg:right-8'} z-40 flex flex-col items-end gap-3`}>
      {isOpen && (
        <div className="flex flex-col gap-2.5 items-end mb-1 animate-in slide-in-from-bottom-3 fade-in duration-200">
          {actions.map((a, i) => (
             <button key={i} onClick={() => { a.onClick(); setIsOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
               <span className="text-sm font-bold" style={{ color: INK }}>{a.label}</span>
               <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: a.color }}><a.icon size={18} /></div>
             </button>
          ))}
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(107,63,202,0.4)] hover:shadow-[0_12px_32px_rgba(107,63,202,0.6)] transition-all duration-300 cursor-pointer active:scale-90" style={{ background: "var(--c-couple-grad)", color: "#fff", transform: isOpen ? 'rotate(45deg)' : 'none' }} title="Adicionar Novo"><Plus size={28} strokeWidth={2.5} /></button>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [savedPin, setSavedPin] = useState("0403");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileFilter, setProfileFilter] = useState("all");
  const [month, setMonth] = useState(currentMonthStr());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState("connecting");
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef(null);
  const skipNextSave = useRef(true);
  const saveTimer = useRef(null);

  useEffect(() => { loadPin().then((p) => { setSavedPin(p || "0403"); }); }, []);
  useEffect(() => { loadTheme().then((t) => { setTheme(t); }); }, []);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const update = (w) => setIsDesktop(w >= 768);
    update(el.getBoundingClientRect().width);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => { for (const e of entries) update(e.contentRect.width); });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [ready]);

  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement("link"); link.id = FONT_LINK_ID; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const toggleTheme = useCallback(() => { setTheme((prev) => { const next = prev === "light" ? "dark" : "light"; saveTheme(next); return next; }); }, []);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances', 'shared_state');
    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const serverData = snapshot.data();
        const profiles = Array.isArray(serverData.profiles) && serverData.profiles.length
          ? serverData.profiles.some((p) => p.key === "p3")
            ? serverData.profiles
            : [...serverData.profiles, { key: "p3", name: "Outros" }]
          : DEFAULT_STATE.profiles;
        const initialBalances = { ...DEFAULT_STATE.initialBalances, ...(serverData.initialBalances || {}) };
        setData({ ...DEFAULT_STATE, ...serverData, profiles, initialBalances });
        setReady(true);
        setSyncStatus("synced");
      } else {
        await setDoc(docRef, DEFAULT_STATE);
        setData(DEFAULT_STATE);
        setReady(true);
        setSyncStatus("synced");
      }
    }, (err) => {
      console.error("Sync error", err);
      setSyncStatus("error");
      setReady(true); 
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!ready || !data || !user || !db) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    
    setSyncStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances', 'shared_state');
        await setDoc(docRef, data);
        setSyncStatus("synced");
      } catch(e) {
        console.error("Save err", e);
        setSyncStatus("error");
      }
    }, 1000);
    return () => clearTimeout(saveTimer.current);
  }, [data, ready, user]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);
  const addItem = useCallback((key, item) => { setData((prev) => ({ ...prev, [key]: [...(prev[key] || []), { id: uid(), ...item }] })); }, []);
  const updateItem = useCallback((key, id, patch) => { setData((prev) => ({ ...prev, [key]: (prev[key] || []).map((it) => (it.id === id ? { ...it, ...patch } : it)) })); }, []);
  const removeItem = useCallback((key, id) => { setData((prev) => ({ ...prev, [key]: (prev[key] || []).filter((it) => it.id !== id) })); }, []);
  const addCategory = useCallback((direction, name) => {
    if (!name || !name.trim()) return;
    setData((prev) => {
      const listKey = direction === "in" ? "incomeCategories" : "expenseCategories";
      if ((prev[listKey] || []).some((c) => c.toLowerCase() === name.trim().toLowerCase())) return prev;
      return { ...prev, [listKey]: [...(prev[listKey] || []), name.trim()] };
    });
  }, []);
  const addBank = useCallback((name) => {
    if (!name || !name.trim()) return;
    setData((prev) => {
      if ((prev.banks || []).some((b) => b.toLowerCase() === name.trim().toLowerCase())) return prev;
      return { ...prev, banks: [...(prev.banks || []), name.trim()] };
    });
  }, []);

  if (!ready || !data || !data.profiles) {
    return (
      <div className="min-h-[520px] h-screen flex flex-col items-center justify-center w-full" style={{ backgroundColor: PAPER }}>
        <div className="flex flex-col items-center gap-5">
           <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin shadow-md" style={{ borderColor: `${COUPLE}33`, borderTopColor: COUPLE }} />
           <p style={{ color: MUTED, fontFamily: "'Inter', sans-serif" }} className="text-sm font-semibold animate-pulse tracking-wide">Carregando Nuvem Firebase...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return <PinLockScreen onUnlock={() => setIsUnlocked(true)} savedPin={savedPin} setSavedPin={setSavedPin} theme={theme} toggleTheme={toggleTheme} />;
  }

  const profileName = (key) => (data.profiles || []).find((p) => p.key === key)?.name || key;
  const isOtherProfile = profileFilter === "p3";

  const NAV = [
    { key: "dashboard", label: "Início", icon: LayoutDashboard },
    { key: "transactions", label: "Lançamentos", icon: Receipt },
    { key: "bills", label: "Contas", icon: CalendarClock },
    { key: "cards", label: "Cartões", icon: CreditCard },
  ];
  const MORE_NAV = [
    { key: "investments", label: "Investimentos", icon: TrendingUp },
    { key: "budgets", label: "Orçamento", icon: Target },
    { key: "psalms", label: "Salmos", icon: BookOpen },
    { key: "settings", label: "Ajustes", icon: Settings },
  ];
  const ALL_NAV = [...NAV, ...MORE_NAV];
  const PROFILE_NAV = isOtherProfile ? NAV.filter((n) => ["dashboard", "transactions", "bills"].includes(n.key)) : ALL_NAV;
  const activeMeta = PROFILE_NAV.find((n) => n.key === tab) || ALL_NAV.find((n) => n.key === tab);

  const accentStyle = {};
  if (profileFilter !== "all") {
    const idx = (data.profiles || []).findIndex((p) => p.key === profileFilter);
    if (idx === 0) {
      accentStyle["--c-couple"] = "var(--c-felipe)";
      accentStyle["--c-couple-grad"] = theme === "dark" ? "linear-gradient(135deg, #3B82F6, #1E40AF)" : "linear-gradient(135deg, #2563EB, #93C5FD)";
    } else if (idx === 1) {
      accentStyle["--c-couple"] = "var(--c-sara)";
      accentStyle["--c-couple-grad"] = theme === "dark" ? "linear-gradient(135deg, #EC4899, #7C3AED)" : "linear-gradient(135deg, #9333EA, #F472B6)";
    } else if (data.profiles[idx]?.key === "p3") {
      accentStyle["--c-couple"] = "var(--c-other)";
      accentStyle["--c-couple-grad"] = theme === "dark" ? "linear-gradient(135deg, #B71C1C, #EF5350)" : "linear-gradient(135deg, #B71C1C, #EF5350)";
    }
  } else {
    accentStyle["--c-couple-grad"] = theme === "dark" ? "linear-gradient(135deg, #4C8DFF, #D64CF0)" : "linear-gradient(135deg, #1D5FE0, #9B1FC7)";
  }

  const content = (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-300">
      {tab === "dashboard" && <Dashboard data={data} month={month} profileFilter={profileFilter} profileName={profileName} setTab={setTab} setModal={setModal} setData={setData} showToast={showToast} />}
      {tab === "transactions" && <TransactionsTab data={data} month={month} profileFilter={profileFilter} profileName={profileName} setModal={setModal} removeItem={removeItem} addItem={addItem} updateItem={updateItem} showToast={showToast} />}
      {tab === "bills" && <BillsTab data={data} month={month} profileFilter={profileFilter} profileName={profileName} setModal={setModal} removeItem={removeItem} updateItem={updateItem} addItem={addItem} showToast={showToast} />}
      {tab === "cards" && <CardsTab data={data} month={month} profileFilter={profileFilter} profileName={profileName} setModal={setModal} removeItem={removeItem} paidStatements={data.paidStatements || {}} togglePaidStatement={(cardId, m) => setData((prev) => { const k = `${cardId}-${m}`; const next = { ...(prev.paidStatements || {}) }; if (next[k]) delete next[k]; else next[k] = true; return { ...prev, paidStatements: next }; })} />}
      {tab === "investments" && <InvestmentsTab data={data} profileFilter={profileFilter} profileName={profileName} setModal={setModal} removeItem={removeItem} updateItem={updateItem} showToast={showToast} setData={setData} />}
      {tab === "budgets" && <BudgetsTab data={data} month={month} profileFilter={profileFilter} setData={setData} showToast={showToast} />}
      {tab === "psalms" && <PsalmsTab />}
      {tab === "settings" && <SettingsTab data={data} setData={setData} showToast={showToast} skipNextSave={skipNextSave} setModal={setModal} savedPin={savedPin} setSavedPin={setSavedPin} db={db} appId={appId} />}
    </div>
  );

  const monthNavVisible = ["dashboard", "transactions", "bills", "cards", "budgets"].includes(tab);
  const monthNav = (
    <div className="flex items-center gap-1 shrink-0 bg-white/70 backdrop-blur-md rounded-full p-1 border shadow-sm" style={{ borderColor: BORDER_SOFT, backgroundColor: SURFACE }}>
      <button onClick={() => setMonth((m) => addMonths(m, -1))} className="p-2 rounded-full hover:bg-black/5 cursor-pointer transition-colors"><ChevronLeft size={16} /></button>
      <span className="text-xs sm:text-sm font-bold px-2.5 whitespace-nowrap" style={{ minWidth: 120, textAlign: "center", color: INK }}>{fmtMonthLabel(month)}</span>
      <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-2 rounded-full hover:bg-black/5 cursor-pointer transition-colors"><ChevronRight size={16} /></button>
    </div>
  );

  const profileChips = (vertical) => (
    <div className={vertical ? "flex flex-col gap-2" : "flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar"}>
      <button onClick={() => setProfileFilter("all")} className={`px-4 py-2 rounded-full text-xs font-bold border shrink-0 cursor-pointer shadow-sm transition-all hover:opacity-90 ${vertical ? "text-left" : ""}`} style={profileFilter === "all" ? { background: accentStyle["--c-couple-grad"] || "var(--c-couple-grad)", color: "#fff", borderColor: "transparent" } : { borderColor: BORDER_SOFT, color: INK, backgroundColor: SURFACE }}>Casal (Visão Geral)</button>
      {(data.profiles || []).map((p, idx) => {
        const color = profileColor(data, p.key);
        const isActive = profileFilter === p.key;
        const activeGrad = idx === 0
          ? (theme === "dark" ? "linear-gradient(135deg, #3B82F6, #1E40AF)" : "linear-gradient(135deg, #2563EB, #93C5FD)")
          : idx === 1
            ? (theme === "dark" ? "linear-gradient(135deg, #EC4899, #7C3AED)" : "linear-gradient(135deg, #9333EA, #F472B6)")
            : (theme === "dark" ? "linear-gradient(135deg, #B71C1C, #EF5350)" : "linear-gradient(135deg, #B71C1C, #EF5350)");
        return <button key={p.key} onClick={() => { setProfileFilter(p.key); if (p.key === "p3" && !["dashboard", "transactions", "bills"].includes(tab)) setTab("dashboard"); }} className={`px-4 py-2 rounded-full text-xs font-bold border shrink-0 cursor-pointer shadow-sm transition-all hover:opacity-90 ${vertical ? "text-left" : ""}`} style={isActive ? { background: activeGrad, color: "#fff", borderColor: color } : { borderColor: BORDER_SOFT, color: INK, backgroundColor: SURFACE }}>{p.name}</button>;
      })}
    </div>
  );

  const themeToggleBtn = <button onClick={toggleTheme} className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 bg-transparent cursor-pointer hover:bg-black/5 transition-all shadow-sm" style={{ borderColor: BORDER_SOFT, color: MUTED, backgroundColor: SURFACE }} title={theme === "light" ? "Modo escuro" : "Modo claro"}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>;

  const desktopView = (
      <div className="w-full h-full min-h-screen flex mx-auto transition-colors duration-300" style={{ ...THEMES[theme], ...accentStyle, backgroundColor: PAPER_TINT, color: INK, fontFamily: "'Inter', sans-serif" }}>
        <div className="shrink-0 flex flex-col justify-between p-6 z-10 w-72 lg:w-80 border-r shadow-sm" style={{ borderColor: BORDER, backgroundColor: PANEL_TINT }}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md text-white" style={{ background: accentStyle["--c-couple-grad"] || "var(--c-couple-grad)" }}><Wallet size={22} /></div>
              <h1 style={{ fontFamily: "'Source Serif 4', serif", background: accentStyle["--c-couple-grad"] || "var(--c-couple-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent", display: "inline-block" }} className="text-2xl font-black leading-none">Fluxo do Casal</h1>
            </div>
            <p className="text-xs mb-6 font-medium px-1 flex items-center gap-1.5" style={{ color: MUTED }}>
              {syncStatus === "connecting" ? "☁️ Conectando..." : syncStatus === "saving" ? "⏳ Sincronizando..." : syncStatus === "error" ? "⚠️ Erro de conexão" : "☁️ Nuvem Sincronizada"}
            </p>
            <div className="flex items-center -space-x-2 mb-6 px-1">{(data.profiles || []).map((p) => <ProfileBadge key={p.key} name={p.name} color={profileColor(data, p.key)} size="md" />)}</div>
            <div className="mb-6">{profileChips(true)}</div>
            <div className="my-6 border-t" style={{ borderColor: BORDER }} />
            <div className="flex flex-col gap-2">
              {PROFILE_NAV.map((n) => (
                <button key={n.key} onClick={() => setTab(n.key)} className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold text-left cursor-pointer transition-all duration-200" style={tab === n.key ? { background: accentStyle["--c-couple-grad"] || "var(--c-couple-grad)", color: "#fff", boxShadow: "0 4px 16px rgba(107, 63, 202, 0.3)" } : { color: MUTED }}>
                  <n.icon size={20} />{n.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 flex justify-between items-center px-1 pt-4 border-t" style={{ borderColor: BORDER }}><span className="text-xs font-semibold" style={{ color: MUTED }}>Modo de Aparência</span>{themeToggleBtn}</div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col relative max-h-screen overflow-hidden">
          <div className="flex items-center justify-between px-8 lg:px-12 pt-8 pb-6 shrink-0 border-b bg-white/40 backdrop-blur-md z-20" style={{ borderColor: BORDER, backgroundColor: `${PANEL_TINT}99` }}>
            <div><h2 style={{ fontFamily: "'Source Serif 4', serif", color: accentStyle["--c-couple"] || COUPLE }} className="text-2xl font-black">{activeMeta?.label}</h2><p className="text-xs font-medium mt-0.5" style={{ color: MUTED }}>{isOtherProfile ? "Painel financeiro independente" : "Painel financeiro colaborativo do casal"}</p></div>
            {monthNavVisible && monthNav}
          </div>
          <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-8 pb-32">{content}</div>
          <GlobalFAB setModal={setModal} isDesktop={true} />
        </div>
      </div>
  );

  const mobileView = (
    <div className="w-full min-h-screen flex flex-col relative transition-colors duration-300" style={{ ...THEMES[theme], ...accentStyle, backgroundColor: PAPER_TINT, color: INK, fontFamily: "'Inter', sans-serif" }}>
      <div className="sticky top-0 z-30 shadow-sm backdrop-blur-xl" style={{ backgroundColor: `${PANEL_TINT}F5`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm text-white" style={{ background: accentStyle["--c-couple-grad"] || "var(--c-couple-grad)" }}><Wallet size={16} /></div>
              <h1 style={{ fontFamily: "'Source Serif 4', serif", background: accentStyle["--c-couple-grad"] || "var(--c-couple-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent", display: "inline-block" }} className="text-xl font-black leading-none">Fluxo do Casal</h1>
            </div>
            <p className="text-[11px] mt-1.5 font-medium flex items-center gap-1" style={{ color: MUTED }}>
              {syncStatus === "connecting" ? "☁️ Conectando..." : syncStatus === "saving" ? "⏳ Sincronizando..." : syncStatus === "error" ? "⚠️ Erro na Nuvem" : "☁️ Nuvem Sincronizada"}
            </p>
          </div>
          <div className="flex items-center gap-3">{themeToggleBtn}<div className="flex items-center -space-x-1.5">{(data.profiles || []).map((p) => <ProfileBadge key={p.key} name={p.name} color={profileColor(data, p.key)} />)}</div></div>
        </div>
        <div className="px-5 pb-3 flex items-center gap-2">{profileChips(false)}</div>
        {monthNavVisible && <div className="px-5 pb-3 flex justify-end">{monthNav}</div>}
      </div>
      <div className="flex-1 px-4 sm:px-6 py-6 pb-32 w-full max-w-3xl mx-auto">{content}</div>
      <GlobalFAB setModal={setModal} isDesktop={false} />
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <div className="w-full pointer-events-auto border-t pb-safe shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl" style={{ borderColor: BORDER, backgroundColor: PANEL_TINT }}>
          <div className={`grid ${isOtherProfile ? "grid-cols-3" : "grid-cols-5"} max-w-md mx-auto">
            {(isOtherProfile ? NAV.filter((n) => ["dashboard", "transactions", "bills"].includes(n.key)) : NAV).map((n) => <NavBtn key={n.key} n={n} active={tab === n.key} onClick={() => { setTab(n.key); setMoreOpen(false); }} accentColor={accentStyle["--c-couple"] || COUPLE} />)}
            {!isOtherProfile && <button onClick={() => setMoreOpen((v) => !v)} className="flex flex-col items-center justify-center gap-1 py-3 cursor-pointer transition-colors" style={{ color: MORE_NAV.some((n) => n.key === tab) ? (accentStyle["--c-couple"] || COUPLE) : MUTED, borderTop: MORE_NAV.some((n) => n.key === tab) ? "3px solid " + (accentStyle["--c-couple"] || COUPLE) : "3px solid transparent" }}><MoreHorizontal size={22} /><span className="text-[10px] font-bold tracking-wide">Mais</span></button>}
          </div>
        </div>
      </div>
      {moreOpen && !isOtherProfile && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setMoreOpen(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom-8 border-t" style={{ backgroundColor: PANEL_TINT, borderColor: BORDER, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 px-2"><span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Menu de Ferramentas</span><button onClick={() => setMoreOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ border: `1px solid ${BORDER_SOFT}`, color: INK, backgroundColor: SURFACE }}><X size={16}/></button></div>
            <div className="grid grid-cols-2 gap-3">
              {MORE_NAV.map((n) => (
                <button key={n.key} onClick={() => { setTab(n.key); setMoreOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer shadow-sm border active:scale-95 transition-all text-left" style={{ color: tab === n.key ? (accentStyle["--c-couple"] || COUPLE) : INK, borderColor: BORDER, backgroundColor: SURFACE }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: tab === n.key ? (accentStyle["--c-couple-grad"] || "var(--c-couple-grad)") : MUTED_PANEL }}><n.icon size={20} /></div><span className="text-xs font-bold">{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="w-full relative bg-black/5">
      {isDesktop ? desktopView : mobileView}
      {toast && <div className="fixed bottom-24 lg:bottom-12 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl animate-in slide-in-from-bottom-4 flex items-center gap-2.5" style={{ backgroundColor: INK, border: `1px solid ${BORDER_SOFT}` }}><Check size={18} style={{ color: INCOME }} />{toast}</div>}
      {modal && <ModalRouter modal={modal} onClose={() => setModal(null)} data={data} setData={setData} addItem={addItem} updateItem={updateItem} removeItem={removeItem} addCategory={addCategory} addBank={addBank} month={month} profileFilter={profileFilter} showToast={showToast} />}
    </div>
  );
}

function NavBtn({ n, active, onClick, accentColor }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 py-3 cursor-pointer transition-colors" style={{ color: active ? accentColor : MUTED, borderTop: active ? `3px solid ${accentColor}` : "3px solid transparent" }}>
      <n.icon size={22} strokeWidth={active ? 2.5 : 2} /><span className="text-[10px] font-bold tracking-wide">{n.label}</span>
    </button>
  );
}

function PsalmsTab() {
  const psalms = [
    { ref: "Salmos 23:1", text: "O Senhor é o meu pastor; de nada me faltará." },
    { ref: "Salmos 91:1", text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará." },
    { ref: "Salmos 119:105", text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho." },
    { ref: "Salmos 121:1-2", text: "Elevo os meus olhos para os montes; de onde me vem o socorro? O meu socorro vem do Senhor, que fez os céus e a terra." },
    { ref: "Salmos 46:1", text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia." },
    { ref: "Salmos 37:5", text: "Entrega o teu caminho ao Senhor; confia nele, e ele o fará." }
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => { const interval = setInterval(() => { setIdx((prev) => (prev + 1) % psalms.length); }, 10000); return () => clearInterval(interval); }, []);
  const p = psalms[idx];
  return (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[55vh] px-4 animate-in fade-in zoom-in-95 duration-700">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-md" style={{ backgroundColor: PANEL_TINT }}><BookOpen size={36} style={{ color: COUPLE }} /></div>
      <h2 style={{ fontFamily: "'Source Serif 4', serif", color: INK }} className="text-2xl md:text-4xl font-medium italic mb-8 leading-relaxed max-w-2xl">"{p.text}"</h2>
      <span className="px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-colors shadow-sm" style={{ background: "var(--c-couple-grad)", color: "#fff" }}>{p.ref}</span>
    </div>
  );
}

function BudgetsTab({ data, month, profileFilter, setData, showToast }) {
  const limits = data.budgetLimits || {};
  const monthTx = (data.transactions || []).filter((t) => t.date && t.date.startsWith(month) && t.direction === "out" && (profileFilter === "all" ? (t.profileKey === "p1" || t.profileKey === "p2") : t.profileKey === profileFilter) && transactionAffectsBalance(t));
  const spentMap = {}; monthTx.forEach((t) => { spentMap[t.category] = (spentMap[t.category] || 0) + Number(t.amount); });
  const setLimit = (cat, val) => {
    const num = Number(val.replace(",", "."));
    setData((prev) => { const next = { ...(prev.budgetLimits || {}) }; if (isNaN(num) || num <= 0) delete next[cat]; else next[cat] = num; return { ...prev, budgetLimits: next }; });
    showToast("Orçamento atualizado");
  };
  return (
    <div>
      <SectionTitle subtitle={`Defina tetos máximos de gastos por categoria para ${fmtMonthLabel(month)}`}>Orçamento e Limites</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data.expenseCategories || []).map((cat) => {
          const spent = spentMap[cat] || 0; const limit = limits[cat] || 0;
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const isOver = limit > 0 && spent > limit; const isNear = limit > 0 && !isOver && pct >= 80;
          return (
            <Card key={cat} className="p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-bold" style={{ color: INK }}>{cat}</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shadow-inner" style={{ borderColor: BORDER_SOFT, backgroundColor: SURFACE }}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: MUTED }}>Teto:</span>
                  <input type="number" step="50" min="0" className="w-20 text-right bg-transparent outline-none font-bold text-sm" style={{ color: INK }} value={limit || ""} placeholder="Ilimitado" onChange={(e) => setLimit(cat, e.target.value)} />
                </div>
              </div>
              <div>
                 <div className="flex justify-between items-end mb-2.5"><span className="text-xs font-semibold" style={{ color: MUTED }}>Gasto atual</span><span className="text-base font-bold"><Money value={spent} tone={isOver ? "expense" : undefined} /></span></div>
                {limit > 0 && (
                  <><div className="h-3 rounded-full overflow-hidden mb-2.5 shadow-inner" style={{ backgroundColor: MUTED_PANEL }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: isOver ? EXPENSE : isNear ? "#E2A03F" : "var(--c-couple-grad)" }} /></div>
                  <div className="flex justify-between text-xs font-bold" style={{ color: MUTED }}><span>{pct.toFixed(0)}% utilizado</span>{isOver && <span style={{ color: EXPENSE }}>Estourou {fmtCurrency(spent - limit)}!</span>}{isNear && <span style={{ color: "#E2A03F" }}>Atenção (80%)</span>}{!isOver && !isNear && <span>Restam {fmtCurrency(Math.max(0, limit - spent))}</span>}</div></>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ data, month, profileFilter, profileName, setTab, setModal, setData, showToast }) {
  const monthTx = (data.transactions || []).filter((t) => t.date && t.date.startsWith(month) && (profileFilter === "all" ? (t.profileKey === "p1" || t.profileKey === "p2") : t.profileKey === profileFilter));
  const realizedMonthTx = monthTx.filter(transactionAffectsBalance);
  const income = realizedMonthTx.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
  const expense = realizedMonthTx.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
  const monthNet = income - expense;

  const initialBalances = { p1: 0, p2: 0, p3: 0, ...(data.initialBalances || {}) };
  const getCumulativeForProfile = (pkey) => {
    const allUp = (data.transactions || []).filter((t) => t.date && t.date <= `${month}-31` && t.profileKey === pkey && transactionAffectsBalance(t));
    const inc = allUp.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
    const exp = allUp.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
    return (Number(initialBalances[pkey]) || 0) + inc - exp;
  };

  const realBalance = profileFilter === "all" 
    ? (data.profiles || []).filter((p) => p.key === "p1" || p.key === "p2").reduce((acc, p) => acc + getCumulativeForProfile(p.key), 0)
    : getCumulativeForProfile(profileFilter);

  const handleEditInitialBalance = () => {
    if (profileFilter === "all") {
      showToast("Selecione um perfil específico para alterar a base inicial.");
      return;
    }
    const currentVal = initialBalances[profileFilter] || 0;
    const val = prompt(`Informe o Saldo Inicial acumulado de ${profileName(profileFilter)} (R$):`, currentVal);
    if (val !== null && !isNaN(Number(val.replace(",", ".")))) {
      const num = Number(val.replace(",", "."));
      setData((prev) => ({
        ...prev,
        initialBalances: { ...(prev.initialBalances || {}), [profileFilter]: num }
      }));
      showToast("Base inicial atualizada com sucesso!");
    }
  };

  const catMap = {}; realizedMonthTx.filter((t) => t.direction === "out").forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount); });
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const PIE_COLORS = ["#A6432E", "#6B3FCA", "#3B5A73", "#3F7D5C", "#7A7A6F", "#8C5B3F", "#5C4B7A", "#6B7A3F"];

  const splitByProfile = (data.profiles || []).filter((p) => p.key === "p1" || p.key === "p2").map((p) => {
    const tx = (data.transactions || []).filter((t) => t.date && t.date.startsWith(month) && t.profileKey === p.key && transactionAffectsBalance(t));
    return { name: p.name, receitas: tx.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0), despesas: tx.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0) };
  });
  const totalIncomeAll = splitByProfile.reduce((s, p) => s + p.receitas, 0); const totalExpenseAll = splitByProfile.reduce((s, p) => s + p.despesas, 0);

  const bankMap = {}; realizedMonthTx.forEach((t) => { const b = t.bank || "Carteira"; bankMap[b] = (bankMap[b] || 0) + (t.direction === "in" ? Number(t.amount) : -Number(t.amount)); });
  const bankRows = Object.entries(bankMap).filter(([_, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  const recentTx = monthTx.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div>
      <SectionTitle subtitle={profileFilter === "all" ? "Visão combinada e consolidada do casal" : `Visão detalhada de ${profileName(profileFilter)}`}>Visão Geral de {fmtMonthLabel(month)}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-7 mb-6 relative overflow-hidden shadow-md" style={{ borderLeft: `6px solid ${COUPLE}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2" style={{ color: MUTED }}>
                <Zap size={18} style={{ color: COUPLE }} />
                <span className="text-sm font-bold uppercase tracking-wider">Saldo Real Acumulado</span>
              </div>
              <button onClick={handleEditInitialBalance} className="text-xs font-bold underline cursor-pointer hover:opacity-80 transition-opacity" style={{ color: COUPLE }}>
                {profileFilter === "all" ? "Ajustar por perfil" : "Ajustar base inicial"}
              </button>
            </div>
            <div className="text-4xl md:text-5xl font-black mb-3 tracking-tight"><Money value={realBalance} tone={realBalance >= 0 ? "income" : "expense"} /></div>
            <p className="text-sm font-semibold" style={{ color: MUTED }}>Balanço em {fmtMonthLabel(month)}: <Money value={monthNet} tone={monthNet >= 0 ? "income" : "expense"} /> <span className="opacity-75">({fmtCurrency(income)} rec − {fmtCurrency(expense)} desp)</span></p>
          </Card>
          <div className="grid grid-cols-2 gap-5 mb-6">
            <Card className="p-6"><div className="flex items-center gap-2 mb-2" style={{ color: MUTED }}><ArrowUpCircle size={18} style={{ color: INCOME }} /><span className="text-xs font-bold uppercase tracking-wider">Receitas</span></div><div className="text-2xl font-black"><Money value={income} tone="income" /></div></Card>
            <Card className="p-6"><div className="flex items-center gap-2 mb-2" style={{ color: MUTED }}><ArrowDownCircle size={18} style={{ color: EXPENSE }} /><span className="text-xs font-bold uppercase tracking-wider">Despesas</span></div><div className="text-2xl font-black"><Money value={expense} tone="expense" /></div></Card>
          </div>
          {bankRows.length > 0 && (
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-2 mb-4" style={{ color: MUTED }}><Landmark size={18} style={{ color: COUPLE }} /><span className="text-sm font-bold uppercase tracking-wider" style={{ color: INK }}>Bancos e Contas</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{bankRows.map(([b, v]) => (<div key={b} className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: PANEL, borderColor: BORDER_SOFT }}><p className="text-xs font-semibold truncate mb-1" style={{ color: MUTED }}>{b}</p><p className="text-sm font-bold"><Money value={v} tone={v >= 0 ? "income" : "expense"} /></p></div>))}</div>
            </Card>
          )}
          {pieData.length > 0 && (
            <Card className="p-6 mb-6">
              <p className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: MUTED }}>Despesas por Categoria</p>
              <div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>{pieData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: SURFACE, color: INK }} /></PieChart></ResponsiveContainer></div>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 mt-6 justify-center">{pieData.slice(0, 6).map((c, i) => (<div key={c.name} className="flex items-center gap-2 text-xs font-semibold" style={{ color: MUTED }}><span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />{c.name}</div>))}</div>
            </Card>
          )}
          <div>
            <div className="mb-4 flex items-center justify-between"><p className="text-base font-bold">Últimos Lançamentos</p><button onClick={() => setTab("transactions")} className="text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity" style={{ color: COUPLE }}>Ver todos</button></div>
            {recentTx.length === 0 ? <Card className="p-8"><EmptyState icon={Receipt} title="Nenhum lançamento" /></Card> : <Card>{recentTx.map((t, i) => (<div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-black/5 transition-colors cursor-pointer" onClick={() => setModal({ type: "transaction", item: t })} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}><div><p className="text-sm font-bold mb-1">{t.description}</p><p className="text-xs font-semibold" style={{ color: MUTED }}>{t.category} · {fmtDate(t.date)} · <Dot color={profileColor(data, t.profileKey)} />{profileName(t.profileKey)}</p></div><span className="text-base font-black"><Money value={t.amount} tone={t.direction === "in" ? "income" : "expense"} /></span></div>))}</Card>}
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          {profileFilter === "all" && (data.profiles || []).length > 1 && (
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-2 mb-4" style={{ color: MUTED }}><Scale size={18} style={{ color: COUPLE }} /><span className="text-sm font-bold uppercase tracking-wider" style={{ color: INK }}>Divisão do Casal</span></div>
              <div style={{ height: 190 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={splitByProfile} margin={{ left: -18, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12, fill: MUTED, fontWeight: 700 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={50} /><Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: SURFACE, color: INK }} /><Bar dataKey="receitas" fill={INCOME} radius={[6, 6, 0, 0]} /><Bar dataKey="despesas" fill={EXPENSE} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="flex justify-between text-xs mt-4 font-semibold bg-black/5 p-3 rounded-xl" style={{ color: MUTED }}>{splitByProfile.map((p) => (<span key={p.name} className="flex flex-col items-center flex-1 text-center"><span className="font-black text-sm mb-1" style={{ color: INK }}>{p.name}</span><span>{totalIncomeAll > 0 ? ((p.receitas / totalIncomeAll) * 100).toFixed(0) : 0}% da renda</span><span>{totalExpenseAll > 0 ? ((p.despesas / totalExpenseAll) * 100).toFixed(0) : 0}% dos gastos</span></span>))}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ data, month, profileFilter, profileName, setModal, removeItem, addItem, updateItem, showToast }) {
  const [search, setSearch] = useState(""); const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const items = (data.transactions || []).filter((t) => t.date && t.date.startsWith(month) && (profileFilter === "all" ? (t.profileKey === "p1" || t.profileKey === "p2") : t.profileKey === profileFilter)).filter((t) => !search.trim() || t.description.toLowerCase().includes(search.trim().toLowerCase()) || t.category.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><SectionTitle subtitle={`${items.length} registros`}>Lançamentos</SectionTitle></div>
      <div className="relative mb-6"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: MUTED }} /><input className={inputCls} style={{ ...inputStyle, paddingLeft: 44 }} placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {items.length === 0 ? <Card className="p-8"><EmptyState icon={Receipt} title="Nenhum lançamento" /></Card> : (
        <Card>
          {items.map((t, i) => (
            <div key={t.id} className="flex items-center gap-4 px-6 py-4.5 hover:bg-black/5 transition-colors" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
              <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => setModal({ type: "transaction", item: t })}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: t.direction === "in" ? INCOME_BG : EXPENSE_BG }}>{t.direction === "in" ? <ArrowUpCircle size={20} style={{ color: INCOME }} /> : <ArrowDownCircle size={20} style={{ color: EXPENSE }} />}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate mb-1">{t.description}</p><p className="text-xs font-semibold truncate" style={{ color: MUTED }}>{t.category} · {fmtDate(t.date)} · <Dot color={profileColor(data, t.profileKey)} />{profileName(t.profileKey)}</p></div>
              </div>
               <div className="flex flex-col items-end gap-1.5 shrink-0">
                 <span className="text-base font-black"><Money value={t.amount} tone={t.direction === "in" ? "income" : "expense"} /></span>
                 {(() => {
                   const status = transactionStatusInfo(t);
                   return <button onClick={() => { updateItem("transactions", t.id, { status: status.nextStatus }); showToast(status.nextStatus === "pending" ? "Marcado como pendente" : status.nextLabel + " com sucesso"); }} className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border cursor-pointer hover:opacity-80 transition-opacity" style={{ color: status.color, backgroundColor: status.bg, borderColor: status.color + "55" }} title={"Marcar como " + status.nextLabel.toLowerCase()}>{status.label}</button>;
                 })()}
               </div>
              <div className="flex items-center gap-1.5"><button onClick={() => { const { id, ...rest } = t; addItem("transactions", { ...rest, date: todayStr() }); showToast("Duplicado"); }} className="p-2.5 shrink-0 cursor-pointer hover:bg-black/10 rounded-xl" style={{ color: MUTED }}><Copy size={16} /></button><button onClick={() => setConfirmDeleteId(t.id)} className="p-2.5 shrink-0 cursor-pointer hover:bg-black/10 rounded-xl" style={{ color: EXPENSE }}><Trash2 size={16} /></button></div>
            </div>
          ))}
        </Card>
      )}
      {confirmDeleteId && <ConfirmDialog title="Excluir?" message="Apagar lançamento permanentemente?" onConfirm={() => { removeItem("transactions", confirmDeleteId); setConfirmDeleteId(null); showToast("Excluído"); }} onClose={() => setConfirmDeleteId(null)} />}
    </div>
  );
}

function BillsTab({ data, month, profileFilter, profileName, setModal, removeItem, updateItem, addItem, showToast }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const items = (data.bills || [])
    .filter((b) => b.dueDate && b.dueDate.startsWith(month) && (profileFilter === "all" ? (b.profileKey === "p1" || b.profileKey === "p2") : b.profileKey === profileFilter))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const getEffectiveStatus = (bill) => {
    if (bill.status === "paid") return "paid";
    if (bill.status === "late") return "late";
    return bill.dueDate && bill.dueDate < todayStr() ? "late" : "pending";
  };

  const statusMeta = {
    pending: { label: "Pendente", color: COUPLE, bg: PANEL_TINT },
    paid: { label: "Paga", color: INCOME, bg: INCOME_BG },
    late: { label: "Atrasada", color: EXPENSE, bg: EXPENSE_BG },
  };

  const pendingItems = items.filter((b) => getEffectiveStatus(b) === "pending");
  const paidItems = items.filter((b) => getEffectiveStatus(b) === "paid");
  const lateItems = items.filter((b) => getEffectiveStatus(b) === "late");
  const pendingTotal = pendingItems.reduce((s, b) => s + Number(b.amount || 0), 0);
  const paidTotal = paidItems.reduce((s, b) => s + Number(b.amount || 0), 0);
  const lateTotal = lateItems.reduce((s, b) => s + Number(b.amount || 0), 0);

  const visibleItems = statusFilter === "all"
    ? items
    : items.filter((b) => getEffectiveStatus(b) === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle subtitle="Organize vencimentos sem perder o histórico">Contas a Pagar</SectionTitle>
        <Btn variant="couple" onClick={() => setModal({ type: "bill" })}><Plus size={16} /> Nova</Btn>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")} className="text-left cursor-pointer">
          <Card className="p-5 hover:shadow-md transition-shadow" style={{ borderColor: statusFilter === "pending" ? COUPLE : BORDER }}>
            <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: COUPLE }}>Pendentes</p>
            <p className="text-xl font-black"><Money value={pendingTotal} /></p>
            <p className="text-xs font-semibold mt-1" style={{ color: MUTED }}>{pendingItems.length} {pendingItems.length === 1 ? "conta" : "contas"}</p>
          </Card>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "late" ? "all" : "late")} className="text-left cursor-pointer">
          <Card className="p-5 hover:shadow-md transition-shadow" style={{ borderColor: statusFilter === "late" ? EXPENSE : BORDER }}>
            <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: EXPENSE }}>Atrasadas</p>
            <p className="text-xl font-black"><Money value={lateTotal} tone="expense" /></p>
            <p className="text-xs font-semibold mt-1" style={{ color: MUTED }}>{lateItems.length} {lateItems.length === 1 ? "conta" : "contas"}</p>
          </Card>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "paid" ? "all" : "paid")} className="text-left cursor-pointer">
          <Card className="p-5 hover:shadow-md transition-shadow" style={{ borderColor: statusFilter === "paid" ? INCOME : BORDER }}>
            <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: INCOME }}>Pagas</p>
            <p className="text-xl font-black"><Money value={paidTotal} tone="income" /></p>
            <p className="text-xs font-semibold mt-1" style={{ color: MUTED }}>{paidItems.length} {paidItems.length === 1 ? "conta" : "contas"}</p>
          </Card>
        </button>
      </div>

      {statusFilter !== "all" && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>
            Exibindo: {statusMeta[statusFilter].label}
          </p>
          <button onClick={() => setStatusFilter("all")} className="text-xs font-bold underline cursor-pointer" style={{ color: COUPLE }}>
            Mostrar todas
          </button>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <Card className="p-8"><EmptyState icon={CalendarClock} title={statusFilter === "all" ? "Nenhuma conta" : "Nenhuma conta neste status"} hint={statusFilter === "all" ? "Cadastre suas contas para acompanhar vencimentos e pagamentos." : "Altere o filtro acima para visualizar outras contas."} /></Card>
      ) : (
        <Card>
          {visibleItems.map((b, i) => {
            const effectiveStatus = getEffectiveStatus(b);
            const meta = statusMeta[effectiveStatus];
            const isPaid = effectiveStatus === "paid";
            return (
              <div key={b.id} className="flex items-center gap-4 px-6 py-4.5 hover:bg-black/5 transition-colors" style={{ borderTop: i > 0 ? "1px solid " + BORDER : "none" }}>
                <button
                  onClick={() => {
                    updateItem("bills", b.id, { status: isPaid ? "pending" : "paid" });
                    showToast(isPaid ? "Conta marcada como pendente" : "Conta marcada como paga");
                  }}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  style={{ borderColor: isPaid ? INCOME : meta.color, backgroundColor: isPaid ? INCOME : "transparent" }}
                  title={isPaid ? "Voltar para pendente" : "Marcar como paga"}
                >
                  {isPaid && <Check size={16} color="#fff" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setModal({ type: "bill", item: b })}>
                  <p className="text-sm font-bold truncate mb-1">{b.description}</p>
                  <p className="text-xs font-semibold truncate" style={{ color: MUTED }}>
                    Vence {fmtDate(b.dueDate)} · <Dot color={profileColor(data, b.profileKey)} />{b.responsible || profileName(b.profileKey)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black"><Money value={b.amount} /></div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide mt-1" style={{ color: meta.color, backgroundColor: meta.bg }}>
                    {meta.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => { const { id, ...rest } = b; addItem("bills", { ...rest, dueDate: addMonths(month, 1) + "-" + b.dueDate.slice(8, 10), status: "pending" }); showToast("Duplicado para próximo mês"); }} className="p-2.5 shrink-0 cursor-pointer hover:bg-black/10 rounded-xl" style={{ color: MUTED }} title="Duplicar para o próximo mês"><Copy size={16} /></button>
                  <button onClick={() => setConfirmDeleteId(b.id)} className="p-2.5 shrink-0 cursor-pointer hover:bg-black/10 rounded-xl" style={{ color: EXPENSE }} title="Excluir conta"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <p className="text-xs leading-relaxed mt-4 px-1" style={{ color: MUTED }}>
        A aba Contas funciona como controle de obrigações e vencimentos. O saldo financeiro continua sendo movimentado pelos lançamentos efetivamente realizados.
      </p>

      {confirmDeleteId && <ConfirmDialog title="Excluir?" message="Apagar conta?" onConfirm={() => { removeItem("bills", confirmDeleteId); setConfirmDeleteId(null); showToast("Excluído"); }} onClose={() => setConfirmDeleteId(null)} />}
    </div>
  );
}

function statementMonthForInstallment(purchaseDate, offset) {
  const d = new Date(purchaseDate + "T00:00:00");
  let month = d.getMonth() + offset; let year = d.getFullYear();
  year += Math.floor(month / 12); month = ((month % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function installmentsForCardMonth(cardPurchases, card, month) {
  const rows = [];
  (cardPurchases || []).filter((p) => p.cardId === card.id).forEach((p) => {
    const total = Number(p.totalAmount) || 0; const n = Math.max(1, Number(p.installments) || 1);
    const baseVal = Math.floor((total / n) * 100) / 100;
    for (let i = 0; i < n; i++) {
      if (statementMonthForInstallment(p.purchaseDate, i) === month) {
        const per = (i === n - 1) ? Number((total - (baseVal * (n - 1))).toFixed(2)) : baseVal;
        rows.push({ id: `${p.id}-${i}`, description: p.description, amount: per, number: i + 1, of: n, purchase: p });
      }
    }
  });
  return rows;
}

function CardsTab({ data, month, profileFilter, profileName, setModal, removeItem, paidStatements, togglePaidStatement }) {
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState(null); const [confirmDeletePurchaseId, setConfirmDeletePurchaseId] = useState(null);
  const cards = (data.cards || []).filter((c) => profileFilter === "all" ? (c.profileKey === "p1" || c.profileKey === "p2") : c.profileKey === profileFilter);
  return (
    <div>
      <div className="flex items-center justify-between mb-5"><SectionTitle subtitle={`${cards.length} cartões`}>Cartões</SectionTitle><Btn variant="couple" onClick={() => setModal({ type: "card" })}><Plus size={16} /> Novo</Btn></div>
      {cards.length === 0 ? <Card className="p-8"><EmptyState icon={CreditCard} title="Nenhum cartão" /></Card> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((c) => {
            const rows = installmentsForCardMonth(data.cardPurchases, c, month);
            const total = rows.reduce((s, r) => s + r.amount, 0); const paid = !!(paidStatements || {})[`${c.id}-${month}`];
            return (
              <Card key={c.id} className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: c.color || CARD_BLUE }}><CreditCard size={20} /></div>
                      <div>
                        <p className="text-base font-bold mb-1">{c.name}</p>
                        <p className="text-xs font-semibold" style={{ color: MUTED }}>{c.brand} · <Dot color={profileColor(data, c.profileKey)} />{profileName(c.profileKey)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ type: "card", item: c })} className="p-2 hover:bg-black/5 rounded-lg" style={{ color: MUTED }}><Pencil size={15} /></button>
                      <button onClick={() => setConfirmDeleteCardId(c.id)} className="p-2 hover:bg-black/5 rounded-lg" style={{ color: EXPENSE }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3.5 border-t border-b mb-4" style={{ borderColor: BORDER }}><div><span className="block text-xs font-bold uppercase mb-1" style={{ color: MUTED }}>Fatura de {fmtMonthLabel(month)}</span><span className="text-[11px] font-semibold" style={{ color: MUTED }}>Vencimento {c.dueDay}</span></div><span className="text-xl font-black"><Money value={total} tone={total > 0 ? "expense" : undefined} /></span></div>
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 text-sm gap-2">
                      <button onClick={() => setModal({ type: "cardPurchase", cardId: c.id, item: r.purchase })} className="flex-1 text-left cursor-pointer"><span className="font-bold">{r.description} {r.of > 1 && `(${r.number}/${r.of})`}</span></button>
                      <span className="font-bold">{fmtCurrency(r.amount)}</span><button onClick={() => setConfirmDeletePurchaseId(r.purchase.id)} style={{ color: EXPENSE }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: BORDER }}><button onClick={() => togglePaidStatement(c.id, month)} className="text-sm font-bold flex items-center gap-2 cursor-pointer" style={{ color: paid ? INCOME : MUTED }}>{paid ? "✅ Fatura Paga" : "Marcar como paga"}</button><button onClick={() => setModal({ type: "cardPurchase", cardId: c.id })} className="text-sm font-bold cursor-pointer" style={{ color: COUPLE }}>+ Compra</button></div>
              </Card>
            );
          })}
        </div>
      )}
      {confirmDeleteCardId && <ConfirmDialog title="Excluir cartão?" message="As compras parceladas também serão removidas." onConfirm={() => { removeItem("cards", confirmDeleteCardId); setConfirmDeleteCardId(null); showToast("Excluído"); }} onClose={() => setConfirmDeleteCardId(null)} />}
      {confirmDeletePurchaseId && <ConfirmDialog title="Excluir compra?" message="Removerá de todas as faturas." onConfirm={() => { removeItem("cardPurchases", confirmDeletePurchaseId); setConfirmDeletePurchaseId(null); showToast("Excluída"); }} onClose={() => setConfirmDeletePurchaseId(null)} />}
    </div>
  );
}

function InvestmentsTab({ data, profileFilter, profileName, setModal, removeItem, updateItem, showToast, setData }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const items = (data.investments || []).filter((i) => profileFilter === "all" ? (i.profileKey === "p1" || i.profileKey === "p2") : i.profileKey === profileFilter);
  const invested = items.reduce((s, i) => s + Number(i.investedAmount), 0); const market = items.reduce((s, i) => s + Number(i.marketValue), 0);
  const gain = market - invested; const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
  const history = data.netWorthHistory || [];
  const handleRecordSnapshot = () => {
    const cur = currentMonthStr(); const idx = history.findIndex((h) => h.month === cur);
    const n = { month: cur, total: market };
    let next; if (idx >= 0) { next = [...history]; next[idx] = n; } else { next = [...history, n].sort((a, b) => a.month.localeCompare(b.month)); }
    setData((prev) => ({ ...prev, netWorthHistory: next })); showToast("Evolução registrada");
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-6"><SectionTitle subtitle="Patrimônio investido e Caixinhas">Investimentos</SectionTitle><div className="flex gap-3"><Btn variant="ghost" onClick={handleRecordSnapshot}>Registrar histórico</Btn><Btn variant="couple" onClick={() => setModal({ type: "investment" })}><Plus size={16} /> Novo Ativo</Btn></div></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6"><Card className="p-6"><p className="text-xs font-bold uppercase mb-2" style={{ color: MUTED }}>Investido</p><p className="text-2xl font-black"><Money value={invested} /></p></Card><Card className="p-6"><p className="text-xs font-bold uppercase mb-2" style={{ color: MUTED }}>Mercado</p><p className="text-2xl font-black"><Money value={market} /></p></Card><Card className="p-6 col-span-2 md:col-span-1"><p className="text-xs font-bold uppercase mb-2" style={{ color: MUTED }}>Resultado</p><p className="text-2xl font-black"><Money value={gain} tone={gain >= 0 ? "income" : "expense"} /> <span className="text-sm">({gainPct.toFixed(1)}%)</span></p></Card></div>
      {history.length > 0 && (
        <Card className="p-6 mb-8"><div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={history} margin={{ left: -10, right: 10, top: 10 }}><CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} tickFormatter={fmtMonthLabel} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(v) => fmtCurrency(v)} labelFormatter={fmtMonthLabel} contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: SURFACE, color: INK }} /><Line type="monotone" dataKey="total" stroke={COUPLE} strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
      )}
      <Card>
        {items.map((inv, i) => {
          const g = Number(inv.marketValue) - Number(inv.investedAmount);
          return (
            <div key={inv.id} className="flex items-center gap-4 px-6 py-4.5 cursor-pointer hover:bg-black/5 transition-colors" onClick={() => setModal({ type: "investment", item: inv })} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold">{inv.description}</p><p className="text-xs" style={{ color: MUTED }}>{inv.category} · {inv.institution}</p></div>
              <div className="text-right"><div className="text-base font-black"><Money value={inv.marketValue} /></div><div className="text-xs font-bold" style={{ color: g >= 0 ? INCOME : EXPENSE }}>{g >= 0 ? "+" : ""}{fmtCurrency(g)}</div></div>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(inv.id); }} style={{ color: EXPENSE }}><Trash2 size={16} /></button>
            </div>
          );
        })}
      </Card>
      {(profileFilter === saraProfileKey(data) || profileFilter === "all") && <GoalsSection data={data} profileFilter={profileFilter} profileName={profileName} setModal={setModal} removeItem={removeItem} updateItem={updateItem} showToast={showToast} />}
      {confirmDeleteId && <ConfirmDialog title="Excluir?" message="Apagar ativo?" onConfirm={() => { removeItem("investments", confirmDeleteId); setConfirmDeleteId(null); showToast("Excluído"); }} onClose={() => setConfirmDeleteId(null)} />}
    </div>
  );
}

function GoalsSection({ data, profileFilter, profileName, setModal, removeItem, updateItem, showToast }) {
  const items = (data.goals || []).filter((g) => profileFilter === "all" ? (g.profileKey === "p1" || g.profileKey === "p2") : g.profileKey === profileFilter);
  return (
    <div className="pt-8 mt-8 border-t-2 border-dashed" style={{ borderColor: BORDER }}>
      <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold">Caixinhas de Objetivos</h3><Btn variant="couple" onClick={() => setModal({ type: "goal" })}><Plus size={16} /> Nova</Btn></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((g) => {
          const pct = Math.min(100, (Number(g.currentAmount) / Math.max(1, Number(g.targetAmount))) * 100);
          return (
            <Card key={g.id} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between mb-2"><p className="font-bold cursor-pointer" onClick={() => setModal({ type: "goal", item: g })}>{g.name}</p><button onClick={() => removeItem("goals", g.id)} style={{ color: EXPENSE }}><Trash2 size={14} /></button></div>
                <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: MUTED_PANEL }}><div className="h-full" style={{ width: `${pct}%`, background: COUPLE }} /></div>
                <div className="flex justify-between text-xs font-bold" style={{ color: MUTED }}><span>{fmtCurrency(g.currentAmount)} / {fmtCurrency(g.targetAmount)}</span><span>{pct.toFixed(0)}%</span></div>
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t" style={{ borderColor: BORDER }}>
                <button onClick={() => setModal({ type: "goalAdjust", item: g, direction: "withdraw" })} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ color: EXPENSE, border: `1px solid ${ALERT_BORDER}` }}>Retirar</button>
                <button onClick={() => setModal({ type: "goalAdjust", item: g, direction: "add" })} className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: COUPLE }}>Guardar</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab({ data, setData, showToast, skipNextSave, setModal, savedPin, setSavedPin, db, appId }) {
  const fileRef = useRef(null);
  const exportData = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = `backup-${todayStr()}.json`; a.click(); showToast("Exportado"); };
  const importData = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { skipNextSave.current = false; setData({ ...DEFAULT_STATE, ...JSON.parse(r.result) }); showToast("Importado"); } catch(ex) { showToast("Erro"); } }; r.readAsText(f); e.target.value = ""; };
  const handleRestoreCloud = async () => {
    if (!db) return;
    try {
      const backupRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances', 'shared_state_backup_weekly');
      const snap = await getDoc(backupRef);
      if (snap.exists()) { skipNextSave.current = false; setData(snap.data()); showToast("Nuvem restaurada!"); } else { showToast("Sem backup na nuvem"); }
    } catch(e) { showToast("Erro na nuvem"); }
  };
  return (
    <div className="max-w-4xl">
      <SectionTitle subtitle="Preferências">Ajustes</SectionTitle>
      <Card className="p-7 mb-6"><p className="text-base font-bold mb-3">PIN de Segurança</p><div className="flex gap-3"><Btn variant="couple" onClick={() => { localStorage.setItem(PIN_KEY, "0403"); setSavedPin("0403"); showToast("PIN redefinido para 0403"); }}>Redefinir PIN (0403)</Btn><Btn variant="danger" onClick={() => { localStorage.removeItem(PIN_KEY); setSavedPin(""); showToast("Removido"); }}>Remover PIN</Btn></div></Card>
      <Card className="p-7 mb-6"><p className="text-base font-bold mb-3">Perfis</p><div className="grid grid-cols-2 gap-4">{(data.profiles || []).map((p) => <input key={p.key} className={inputCls} style={inputStyle} value={p.name} onChange={(e) => setData(pr => ({ ...pr, profiles: (pr.profiles || []).map(prr => prr.key === p.key ? { ...prr, name: e.target.value } : prr) }))} />)}</div></Card>
      <Card className="p-7"><p className="text-base font-bold mb-3">Backup de Dados</p><div className="flex gap-4"><Btn variant="couple" onClick={exportData}><Download size={16} /> Exportar Backup Manual</Btn><Btn variant="ghost" onClick={handleRestoreCloud}><Upload size={16} /> Restaurar Nuvem</Btn><Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restaurar Arquivo</Btn><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importData} /></div></Card>
    </div>
  );
}

function ModalRouter({ modal, onClose, data, setData, addItem, updateItem, removeItem, addCategory, addBank, month, profileFilter, showToast }) {
  const defaultProfile = profileFilter !== "all" ? profileFilter : (data.profiles && data.profiles[0]?.key);
  if (modal.type === "transaction") return <TransactionForm modal={modal} onClose={onClose} data={data} addItem={addItem} updateItem={updateItem} addBank={addBank} month={month} defaultProfile={defaultProfile} showToast={showToast} />;
  if (modal.type === "bill") return <BillForm modal={modal} onClose={onClose} data={data} addItem={addItem} updateItem={updateItem} month={month} defaultProfile={defaultProfile} showToast={showToast} />;
  if (modal.type === "card") return <CardForm modal={modal} onClose={onClose} data={data} addItem={addItem} updateItem={updateItem} defaultProfile={defaultProfile} showToast={showToast} />;
  if (modal.type === "cardPurchase") return <CardPurchaseForm modal={modal} onClose={onClose} data={data} addItem={addItem} updateItem={updateItem} defaultProfile={defaultProfile} showToast={showToast} month={month} />;
  if (modal.type === "investment") return <InvestmentForm modal={modal} onClose={onClose} data={data} addItem={addItem} updateItem={updateItem} defaultProfile={defaultProfile} showToast={showToast} />;
  if (modal.type === "goal") return <GoalForm modal={modal} onClose={onClose} data={data} addItem={addItem} updateItem={updateItem} defaultProfile={defaultProfile} showToast={showToast} />;
  if (modal.type === "goalAdjust") return <GoalAdjustForm modal={modal} onClose={onClose} updateItem={updateItem} showToast={showToast} />;
  return null;
}

function TransactionForm({ modal, onClose, data, addItem, updateItem, addBank, month, defaultProfile, showToast }) {
  const editing = modal.item;
  const [direction, setDirection] = useState(editing?.direction || modal.direction || "out");
  const [profileKey, setProfileKey] = useState(editing?.profileKey || defaultProfile);
  const [date, setDate] = useState(editing?.date || (month === currentMonthStr() ? todayStr() : `${month}-01`));
  const [description, setDescription] = useState(editing?.description || "");
  const cats = direction === "in" ? (data.incomeCategories || []) : (data.expenseCategories || []);
  const [category, setCategory] = useState(editing?.category || cats[0] || "");
  const [bank, setBank] = useState(editing?.bank || (data.banks || [])[0] || "");
  const [amount, setAmount] = useState(editing?.amount ?? "");
  const [status, setStatus] = useState(editing ? (editing.status || (direction === "in" ? "received" : "paid")) : "pending");
  const save = () => {
    if (!description.trim() || !amount) return; addBank(bank);
    const p = { profileKey, date, description: description.trim(), category, bank: bank.trim() || "Carteira", direction, amount: Number(amount), status };
    if (editing) updateItem("transactions", editing.id, p); else addItem("transactions", p);
    showToast("Salvo"); onClose();
  };
  return (
    <Modal title={editing ? "Editar Lançamento" : "Novo Lançamento"} onClose={onClose}>
      <div className="flex gap-2 mb-4"><button onClick={() => { setDirection("in"); setStatus(editing?.status === "pending" ? "pending" : "received"); setCategory((data.incomeCategories || [])[0]); }} className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: direction === "in" ? INCOME : MUTED }}>Receita</button><button onClick={() => { setDirection("out"); setStatus(editing?.status === "pending" ? "pending" : "paid"); setCategory((data.expenseCategories || [])[0]); }} className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: direction === "out" ? EXPENSE : MUTED }}>Despesa</button></div>
      <Field label="Quem"><select className={inputCls} style={inputStyle} value={profileKey} onChange={(e) => setProfileKey(e.target.value)}>{(data.profiles || []).map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select></Field>
      <Field label="Descrição"><input className={inputCls} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-4"><Field label="Valor"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field><Field label="Data"><input type="date" className={inputCls} style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
      <Field label="Categoria"><select className={inputCls} style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
      <Field label={direction === "in" ? "Situação do recebimento" : "Situação da despesa"}>
        <select className={inputCls} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          {direction === "in" ? (
            <>
              <option value="pending">Pendente</option>
              <option value="received">Recebido</option>
            </>
          ) : (
            <>
              <option value="pending">Pendente</option>
              <option value="paid">Paga</option>
            </>
          )}
        </select>
      </Field>
      <Field label="Banco"><input list="banklist" className={inputCls} style={inputStyle} value={bank} onChange={(e) => setBank(e.target.value)} /><datalist id="banklist">{(data.banks || []).map(b => <option key={b} value={b} />)}</datalist></Field>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Salvar</Btn>
    </Modal>
  );
}

function BillForm({ modal, onClose, data, addItem, updateItem, month, defaultProfile, showToast }) {
  const editing = modal.item;
  const [profileKey, setProfileKey] = useState(editing?.profileKey || defaultProfile);
  const [description, setDescription] = useState(editing?.description || "");
  const [dueDate, setDueDate] = useState(editing?.dueDate || `${month}-05`);
  const [amount, setAmount] = useState(editing?.amount ?? "");
  const save = () => { if (!description || !amount) return; const p = { profileKey, description, dueDate, amount: Number(amount), status: editing?.status || "pending" }; if (editing) updateItem("bills", editing.id, p); else addItem("bills", p); showToast("Salvo"); onClose(); };
  return (
    <Modal title="Conta a Pagar" onClose={onClose}>
      <Field label="Descrição"><input className={inputCls} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-4"><Field label="Valor"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field><Field label="Vencimento"><input type="date" className={inputCls} style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field></div>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Salvar</Btn>
    </Modal>
  );
}

function CardForm({ modal, onClose, data, addItem, updateItem, defaultProfile, showToast }) {
  const editing = modal.item;
  const [name, setName] = useState(editing?.name || "");
  const [brand, setBrand] = useState(editing?.brand || "");
  const [color, setColor] = useState(editing?.color || COUPLE);
  const colors = ["#6B3FCA", "#1D5FE0", "#3B5A73", "#3F7D5C", "#A6432E", "#9B1FC7", "#E2A03F", "#4C8DFF"];
  const save = () => {
    if (!name) return;
    const p = { profileKey: editing?.profileKey || defaultProfile, name, brand: brand || "Visa", closingDay: 1, dueDay: 10, color };
    if (editing) updateItem("cards", editing.id, p);
    else addItem("cards", p);
    showToast("Cartão salvo");
    onClose();
  };
  return (
    <Modal title={editing ? "Editar Cartão" : "Novo Cartão"} onClose={onClose}>
      <Field label="Nome do Cartão"><input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <Field label="Bandeira / Banco"><input className={inputCls} style={inputStyle} value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
      <Field label="Cor do Cartão">
        <div className="flex items-center gap-3 mt-2">
          {colors.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${color === c ? "scale-110 shadow-md ring-2 ring-offset-2" : "opacity-70"}`} style={{ backgroundColor: c, borderColor: color === c ? INK : "transparent" }} />
          ))}
        </div>
      </Field>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Salvar Cartão</Btn>
    </Modal>
  );
}

function CardPurchaseForm({ modal, onClose, data, addItem, updateItem, defaultProfile, showToast, month }) {
  const editing = modal.item;
  const [cardId, setCardId] = useState(editing?.cardId || modal.cardId || (data.cards || [])[0]?.id);
  const [description, setDescription] = useState(editing?.description || "");
  const [totalAmount, setTotalAmount] = useState(editing?.totalAmount ?? "");
  const [installments, setInstallments] = useState(editing?.installments ?? 1);
  const save = () => { if (!cardId || !description || !totalAmount) return; const p = { cardId, profileKey: defaultProfile, description, category: (data.expenseCategories || [])[0], purchaseDate: `${month}-01`, totalAmount: Number(totalAmount), installments: Number(installments) }; if (editing) updateItem("cardPurchases", editing.id, p); else addItem("cardPurchases", p); showToast("Salvo"); onClose(); };
  return (
    <Modal title="Compra no Cartão" onClose={onClose}>
      <Field label="Cartão"><select className={inputCls} style={inputStyle} value={cardId} onChange={(e) => setCardId(e.target.value)}>
        {(data.cards || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></Field>
      <Field label="Descrição"><input className={inputCls} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-4"><Field label="Valor Total (R$)"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} /></Field><Field label="Parcelas"><input type="number" min="1" className={inputCls} style={inputStyle} value={installments} onChange={(e) => setInstallments(e.target.value)} /></Field></div>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Lançar na Fatura</Btn>
    </Modal>
  );
}

function InvestmentForm({ modal, onClose, data, addItem, updateItem, defaultProfile, showToast }) {
  const editing = modal.item;
  const [description, setDescription] = useState(editing?.description || ""); const [investedAmount, setInvestedAmount] = useState(editing?.investedAmount ?? "");
  const save = () => { if (!description || !investedAmount) return; const p = { profileKey: defaultProfile, description, category: (data.investmentCategories || [])[0], institution: "XP", investedAmount: Number(investedAmount), marketValue: Number(investedAmount) }; if (editing) updateItem("investments", editing.id, p); else addItem("investments", p); showToast("Salvo"); onClose(); };
  return (
    <Modal title="Ativo de Investimento" onClose={onClose}>
      <Field label="Nome do Ativo"><input className={inputCls} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} autoFocus /></Field>
      <Field label="Valor Investido (R$)"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} /></Field>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Salvar</Btn>
    </Modal>
  );
}

function GoalForm({ modal, onClose, data, addItem, updateItem, defaultProfile, showToast }) {
  const editing = modal.item;
  const [name, setName] = useState(editing?.name || ""); const [targetAmount, setTargetAmount] = useState(editing?.targetAmount ?? "");
  const save = () => { if (!name || !targetAmount) return; const p = { profileKey: saraProfileKey(data), name, category: "Geral", targetAmount: Number(targetAmount), currentAmount: editing?.currentAmount || 0 }; if (editing) updateItem("goals", editing.id, p); else addItem("goals", p); showToast("Salvo"); onClose(); };
  return (
    <Modal title="Caixinha de Objetivo" onClose={onClose}>
      <Field label="Nome / Motivo"><input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <Field label="Valor Alvo (R$)"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} /></Field>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Salvar</Btn>
    </Modal>
  );
}

function GoalAdjustForm({ modal, onClose, updateItem, showToast }) {
  const [val, setVal] = useState(""); const goal = modal.item; const dir = modal.direction;
  const save = () => { const num = Number(val); if (!num) return; updateItem("goals", goal.id, { currentAmount: Math.max(0, goal.currentAmount + (dir === "add" ? num : -num)) }); showToast("Atualizado"); onClose(); };
  return (
    <Modal title={dir === "add" ? `Guardar em ${goal.name}` : `Retirar de ${goal.name}`} onClose={onClose}>
      <Field label="Valor (R$)"><input type="number" step="0.01" className={inputCls} style={inputStyle} value={val} onChange={(e) => setVal(e.target.value)} autoFocus /></Field>
      <Btn variant="couple" className="w-full justify-center mt-2 py-3" onClick={save}>Confirmar Movimentação</Btn>
    </Modal>
  );
}
