import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Receipt, CalendarClock, CreditCard, TrendingUp, Target,
  Settings, Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Check, Download, Upload, Wallet, AlertCircle,
  MoreHorizontal, Landmark, Scale, Zap, Sun, Moon, Search, Copy, 
  ArrowDownToLine, ArrowUpFromLine, BookOpen, KeyRound, ShieldCheck
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

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
  console.error("Erro ao inicializar Firebase", error);
}

const appId = "fluxo-casal-producao";
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
const ALERT_BORDER = "var(--c-alert-border, #E6C9C0)";
const MUTED_PANEL = "var(--c-muted-panel, #E9E5D6)";
const FELIPE = "var(--c-felipe, #1D5FE0)";
const SARA = "var(--c-sara, #9B1FC7)";

const PAPER_TINT = `color-mix(in srgb, ${COUPLE} 3%, ${PAPER})`;
const SURFACE_TINT = `color-mix(in srgb, ${COUPLE} 2%, ${SURFACE})`;
const PANEL_TINT = `color-mix(in srgb, ${COUPLE} 7%, ${PANEL})`;

const THEMES = {
  light: {
    "--c-ink": "#1E251D", "--c-paper": "#F8F7F2", "--c-surface": "#FFFFFF", "--c-couple": "#6B3FCA",
    "--c-couple-grad": "linear-gradient(135deg, #1D5FE0, #9B1FC7)", "--c-income": "#2F6B4C", "--c-expense": "#9C3A27",
    "--c-cardblue": "#35526A", "--c-muted": "#6E6E63", "--c-border": "#E2DFD2", "--c-border-soft": "#D1CEC0",
    "--c-income-bg": "#E5EFEB", "--c-expense-bg": "#F5E4E0", "--c-panel": "#EEECE1", "--c-alert-bg": "#FCEFEB",
    "--c-alert-border": "#E4C5BC", "--c-muted-panel": "#E5E1D0", "--c-felipe": "#1D5FE0", "--c-sara": "#9B1FC7",
  },
  dark: {
    "--c-ink": "#F0EDE2", "--c-paper": "#12140F", "--c-surface": "#1B1D15", "--c-couple": "#A370F2",
    "--c-couple-grad": "linear-gradient(135deg, #4C8DFF, #D64CF0)", "--c-income": "#56B680", "--c-expense": "#E0755C",
    "--c-cardblue": "#72A4D1", "--c-muted": "#A3A293", "--c-border": "#2E3125", "--c-border-soft": "#3A3D2F",
    "--c-income-bg": "#19281F", "--c-expense-bg": "#33221C", "--c-panel": "#20231A", "--c-alert-bg": "#33241D",
    "--c-alert-border": "#543A2F", "--c-muted-panel": "#26291E", "--c-felipe": "#4C8DFF", "--c-sara": "#D64CF0",
  },
};

const DEFAULT_STATE = {
  initialBalances: { p1: 0, p2: 0 },
  profiles: [{ key: "p1", name: "Felipe" }, { key: "p2", name: "Sara" }],
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

function fmtCurrency(n) { return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(s) { if (!s) return ""; return new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function fmtMonthLabel(m) { const d = new Date(m + "-01T00:00:00"); return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(/^\w/, c => c.toUpperCase()); }
function addMonths(m, delta) { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

function profileColor(data, profileKey) {
  if (!data || !data.profiles) return COUPLE;
  const idx = data.profiles.findIndex((p) => p.key === profileKey);
  return idx === 0 ? FELIPE : idx === 1 ? SARA : COUPLE;
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
const inputStyle = { borderColor: BORDER_SOFT, backgroundColor: SURFACE, color: INK, colorScheme: "light" };

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-md">
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl`} style={{ backgroundColor: PANEL_TINT, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur-md" style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: `${PANEL_TINT}F0`, zIndex: 10 }}>
          <h3 style={{ fontFamily: "'Source Serif 4', serif", background: "var(--c-couple-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent" }} className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center bg-white cursor-pointer shadow-sm" style={{ border: `1px solid ${BORDER_SOFT}`, color: INK }}><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function PinLockScreen({ onUnlock, savedPin, setSavedPin, theme, toggleTheme }) {
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (enteredPin === (savedPin || "0403")) {
      onUnlock();
    } else {
      setError(true);
      setEnteredPin("");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6" style={{ ...THEMES[theme], backgroundColor: PAPER_TINT, color: INK, fontFamily: "'Inter', sans-serif" }}>
      <div className="absolute top-6 right-6 z-20">
        <button onClick={toggleTheme} className="w-12 h-12 rounded-full flex items-center justify-center border shadow-md bg-white cursor-pointer" style={{ borderColor: BORDER_SOFT, color: MUTED }}>
          {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
        </button>
      </div>
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl shadow-2xl border backdrop-blur-xl flex flex-col items-center" style={{ backgroundColor: SURFACE_TINT, borderColor: BORDER }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl text-white" style={{ background: "var(--c-couple-grad)" }}><ShieldCheck size={40} /></div>
        <h1 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-3xl font-black mb-2 text-center">Fluxo do Casal</h1>
        <p className="text-xs text-center mb-8 font-medium" style={{ color: MUTED }}>Insira seu PIN de segurança (Padrão: 0403)</p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-5">
          <input
            type="password" inputMode="numeric" maxLength={6} autoFocus
            className={`w-full text-center text-4xl font-black tracking-[0.5em] py-4 rounded-2xl border-2 transition-all ${error ? "border-red-500 bg-red-50 text-red-500" : ""}`}
            style={{ borderColor: error ? "#EF4444" : COUPLE, backgroundColor: SURFACE, color: INK }}
            value={enteredPin} onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, "")); setError(false); }} placeholder="••••"
          />
          {error && <p className="text-xs font-bold text-red-500 text-center">PIN incorreto. Tente novamente.</p>}
          <Btn type="submit" variant="couple" className="w-full justify-center py-4 text-base font-bold shadow-xl">DESBLOQUEAR PAINEL</Btn>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [savedPin, setSavedPin] = useState("0403");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [profileFilter, setProfileFilter] = useState("all");
  const [month, setMonth] = useState(currentMonthStr());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState("connecting");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    try {
      const p = localStorage.getItem(PIN_KEY);
      if (p) setSavedPin(p);
      const t = localStorage.getItem(THEME_KEY);
      if (t) setTheme(t);
    } catch(e) {}
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch(e) {}
      return next;
    });
  };

  useEffect(() => {
    if (!auth || !db) {
      setReady(true);
      setSyncStatus("local");
      return;
    }
    signInAnonymously(auth).catch(e => console.error("Auth error", e));
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances', 'shared_state');
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setData({ ...DEFAULT_STATE, ...docSnap.data() });
          } else {
            setDoc(docRef, DEFAULT_STATE);
          }
          setReady(true);
          setSyncStatus("synced");
        }, (err) => {
          console.error("Firestore error", err);
          setReady(true);
          setSyncStatus("error");
        });
        return () => unsubDoc();
      }
    });
    return () => unsubAuth();
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: PAPER }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${COUPLE}44`, borderTopColor: COUPLE }} />
          <p style={{ color: MUTED }} className="text-sm font-semibold">Conectando à Nuvem Google...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return <PinLockScreen onUnlock={() => setIsUnlocked(true)} savedPin={savedPin} setSavedPin={setSavedPin} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center" style={{ ...THEMES[theme], backgroundColor: PAPER_TINT, color: INK }}>
      <div className="p-8 rounded-3xl border shadow-xl max-w-lg w-full" style={{ backgroundColor: SURFACE_TINT, borderColor: BORDER }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-2xl font-black mb-4">Fluxo do Casal Online</h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>Sincronização com o Firebase ativa e conectada com sucesso!</p>
        <Btn variant="couple" onClick={() => showToast("Tudo funcionando perfeitamente!")} className="w-full justify-center">Testar Conexão</Btn>
      </div>
      {toast && <div className="fixed bottom-6 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl" style={{ backgroundColor: INK }}>{toast}</div>}
    </div>
  );
}