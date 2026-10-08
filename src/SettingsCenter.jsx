import React, { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Upload, Download } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

const MUTED = "var(--c-muted, #6E6E63)";
const INK = "var(--c-ink, #1E251D)";
const SURFACE = "var(--c-surface, #FFFFFF)";
const PANEL = "var(--c-panel, #EEECE1)";
const BORDER = "var(--c-border, #E2DFD2)";
const BORDER_SOFT = "var(--c-border-soft, #D1CEC0)";
const COUPLE = "var(--c-couple, #6B3FCA)";
const INCOME = "var(--c-income, #2F6B4C)";
const EXPENSE = "var(--c-expense, #9C3A27)";

const inputStyle = {
  borderColor: BORDER_SOFT,
  backgroundColor: SURFACE,
  color: INK,
  colorScheme: "light",
  "--tw-ring-color": COUPLE + "55"
};
const inputCls = "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm";

function SettingCard({ children, className = "" }) {
  return <div className={"border rounded-2xl shadow-sm " + className} style={{ borderColor: BORDER, backgroundColor: SURFACE }}>{children}</div>;
}

function SettingBtn({ children, onClick, variant = "primary", disabled = false }) {
  const styles = {
    primary: { background: "var(--c-couple-grad)", color: "#fff", border: "none" },
    ghost: { backgroundColor: "transparent", color: INK, border: "1px solid " + BORDER_SOFT },
    danger: { backgroundColor: "transparent", color: EXPENSE, border: "1px solid var(--c-alert-border, #E4C5BC)" }
  };
  return <button onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer shadow-sm" style={styles[variant]}>{children}</button>;
}

function ProfileChip({ profile, active }) {
  const color = profile.key === "p1" ? "var(--c-felipe)" : profile.key === "p2" ? "var(--c-sara)" : "var(--c-other)";
  return <span className="inline-flex items-center gap-2 text-xs font-bold"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />{profile.name}{active ? " · selecionado" : ""}</span>;
}

function CatalogManager({ title, subtitle, items, usageById, onAdd, onRename, onToggle, onDelete, onMerge, allowMerge = true }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [mergeTarget, setMergeTarget] = useState({});

  const sorted = [...(items || [])].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name));
  const submitAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name);
    setNewName("");
  };

  return (
    <SettingCard className="p-6">
      <div className="mb-4">
        <p className="text-base font-bold">{title}</p>
        {subtitle && <p className="text-xs mt-1" style={{ color: MUTED }}>{subtitle}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className={inputCls + " flex-1"} style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAdd()} placeholder="Adicionar novo item..." />
        <SettingBtn onClick={submitAdd}><Plus size={16} /> Adicionar</SettingBtn>
      </div>
      <div className="space-y-2">
        {sorted.map((item) => {
          const used = Number(usageById?.[item.id] || 0);
          const sameScope = sorted.filter((x) => x.id !== item.id && (x.profileKey || null) === (item.profileKey || null));
          const isEditing = editingId === item.id;
          return (
            <div key={item.id} className="rounded-2xl border p-3.5" style={{ borderColor: BORDER, backgroundColor: item.active === false ? PANEL : SURFACE }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input className={inputCls} style={inputStyle} value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                  ) : <p className="text-sm font-bold truncate">{item.name}</p>}
                  <p className="text-[11px] mt-1 font-semibold" style={{ color: item.active === false ? EXPENSE : MUTED }}>
                    {item.active === false ? "Desativado" : "Ativo"}{used > 0 ? " · em uso por " + used + " registro(s)" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button className="p-2 rounded-lg hover:bg-black/5" title="Salvar" onClick={() => { const name = editingName.trim(); if (name) onRename(item.id, name); setEditingId(null); }}><Check size={15} style={{ color: INCOME }} /></button>
                      <button className="p-2 rounded-lg hover:bg-black/5" title="Cancelar" onClick={() => setEditingId(null)}><X size={15} style={{ color: MUTED }} /></button>
                    </>
                  ) : (
                    <>
                      <button className="p-2 rounded-lg hover:bg-black/5" title="Editar" onClick={() => { setEditingId(item.id); setEditingName(item.name); }}><Pencil size={15} style={{ color: MUTED }} /></button>
                      <button className="p-2 rounded-lg hover:bg-black/5" title={item.active === false ? "Reativar" : "Desativar"} onClick={() => onToggle(item.id)}><span className="font-black" style={{ color: item.active === false ? INCOME : MUTED }}>{item.active === false ? "↻" : "⏸"}</span></button>
                      {used === 0 && <button className="p-2 rounded-lg hover:bg-black/5" title="Excluir" onClick={() => onDelete(item.id)}><Trash2 size={15} style={{ color: EXPENSE }} /></button>}
                    </>
                  )}
                </div>
              </div>
              {allowMerge && used > 0 && sameScope.length > 0 && (
                <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row gap-2" style={{ borderColor: BORDER }}>
                  <select className={inputCls + " flex-1"} style={inputStyle} value={mergeTarget[item.id] || ""} onChange={(e) => setMergeTarget((p) => ({ ...p, [item.id]: e.target.value }))}>
                    <option value="">Mesclar em...</option>
                    {sameScope.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <SettingBtn variant="ghost" disabled={!mergeTarget[item.id]} onClick={() => { const target = mergeTarget[item.id]; if (!target) return; onMerge(item.id, target); setMergeTarget((p) => ({ ...p, [item.id]: "" })); }}>Mesclar</SettingBtn>
                </div>
              )}
            </div>
          );
        })}
        {!sorted.length && <p className="text-sm py-2" style={{ color: MUTED }}>Nenhum cadastro encontrado.</p>}
      </div>
    </SettingCard>
  );
}

function AccountsManager({ data, profileKey, onSave, onDelete, onToggle }) {
  const institutions = (data.financialInstitutions || []).filter((x) => x.active !== false).sort((a, b) => a.name.localeCompare(b.name));
  const items = (data.accounts || []).filter((a) => a.profileKey === profileKey).sort((a, b) => a.accountName.localeCompare(b.accountName));
  const [editingId, setEditingId] = useState(null);
  const [accountName, setAccountName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [type, setType] = useState("digital");

  const reset = () => {
    setEditingId(null);
    setAccountName("");
    setInstitutionId(institutions[0]?.id || "");
    setType("digital");
  };

  useEffect(() => {
    if (!editingId && !institutionId && institutions.length) setInstitutionId(institutions[0].id);
  }, [institutions.length, editingId, institutionId]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setAccountName(item.accountName || "");
    setInstitutionId(item.institutionId || "");
    setType(item.type || "digital");
  };

  const save = () => {
    const name = accountName.trim();
    if (!name) return;
    if (type !== "wallet" && !institutionId) return;
    onSave({ id: editingId || null, profileKey, accountName: name, institutionId: type === "wallet" ? null : institutionId, type, active: true });
    reset();
  };

  const typeLabel = (value) => ({ checking: "Conta corrente", savings: "Poupança", digital: "Conta digital", wallet: "Carteira", other: "Outros" }[value] || "Outros");

  return (
    <SettingCard className="p-6">
      <div className="mb-4">
        <p className="text-base font-bold">Contas e carteiras · {profileKey}</p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>A conta passa a ser um cadastro real e padronizado, sem banco digitado livremente.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input className={inputCls} style={inputStyle} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nome da conta" />
        <select className={inputCls} style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="checking">Conta corrente</option>
          <option value="savings">Poupança</option>
          <option value="digital">Conta digital</option>
          <option value="wallet">Carteira</option>
          <option value="other">Outros</option>
        </select>
        <select className={inputCls} style={inputStyle} value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} disabled={type === "wallet"}>
          <option value="">Instituição...</option>
          {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mb-5">
        <SettingBtn onClick={save}>{editingId ? "Salvar alteração" : "Adicionar conta"}</SettingBtn>
        {editingId && <SettingBtn variant="ghost" onClick={reset}>Cancelar</SettingBtn>}
      </div>
      <div className="space-y-2">
        {items.map((account) => {
          const inst = (data.financialInstitutions || []).find((i) => i.id === account.institutionId);
          const used = (data.transactions || []).filter((t) => t.accountId === account.id).length;
          return (
            <div key={account.id} className="rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: BORDER, backgroundColor: account.active === false ? PANEL : SURFACE }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{account.accountName}</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>{account.type === "wallet" ? "Carteira" : inst?.name || "Instituição não definida"} · {typeLabel(account.type)}{used ? " · " + used + " lançamento(s)" : ""}</p>
              </div>
              <button className="p-2 rounded-lg hover:bg-black/5" title="Editar" onClick={() => startEdit(account)}><Pencil size={15} style={{ color: MUTED }} /></button>
              <button className="p-2 rounded-lg hover:bg-black/5" title={account.active === false ? "Reativar" : "Desativar"} onClick={() => onToggle(account.id)}>{account.active === false ? <Check size={15} style={{ color: INCOME }} /> : <span style={{ color: MUTED, fontWeight: 800 }}>⏸</span>}</button>
              {used === 0 && <button className="p-2 rounded-lg hover:bg-black/5" title="Excluir" onClick={() => onDelete(account.id)}><Trash2 size={15} style={{ color: EXPENSE }} /></button>}
            </div>
          );
        })}
        {!items.length && <p className="text-sm" style={{ color: MUTED }}>Nenhuma conta cadastrada.</p>}
      </div>
    </SettingCard>
  );
}

export default function SettingsTab({
  data,
  setData,
  showToast,
  skipNextSave,
  setModal,
  savedPin,
  setSavedPin,
  db,
  appId,
  contextTab = "dashboard",
  profileFilter = "all",
  migrateData
}) {
  const fileRef = useRef(null);
  const profileName = (key) => (data.profiles || []).find((p) => p.key === key)?.name || key;
  const [targetProfile, setTargetProfile] = useState(profileFilter === "all" ? "p1" : profileFilter);

  useEffect(() => {
    if (profileFilter !== "all") setTargetProfile(profileFilter);
    else if (contextTab === "cards" || contextTab === "investments") {
      if (targetProfile === "p3" || targetProfile === "global") setTargetProfile("p1");
    }
  }, [profileFilter, contextTab]);

  const contextLabel = contextTab === "transactions" ? "Lançamentos" : contextTab === "cards" ? "Cartões" : contextTab === "investments" ? "Investimentos" : "Visão Geral";
  const currentProfileLabel = profileFilter === "all" ? "Casal" : profileName(profileFilter);
  const selectedScopeLabel = targetProfile === "global" ? "Global" : profileName(targetProfile);
  const scopeProfiles = (data.profiles || []).filter((p) => contextTab === "cards" || contextTab === "investments" ? p.key === "p1" || p.key === "p2" : true);

  const scopedItems = (key, scope) => (data[key] || []).filter((item) => {
    if (scope === "global") return item.profileKey == null;
    return item.profileKey == null || item.profileKey === scope;
  }).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || "").localeCompare(String(b.name || "")));

  const usage = (catalogKey, item) => {
    const id = item.id;
    const name = String(item.name || "").toLowerCase();
    if (catalogKey === "incomeCategoryCatalog") return (data.transactions || []).filter((t) => t.direction === "in" && (t.categoryId === id || (!t.categoryId && String(t.category || "").toLowerCase() === name))).length;
    if (catalogKey === "expenseCategoryCatalog") return (data.transactions || []).filter((t) => t.direction === "out" && (t.categoryId === id || (!t.categoryId && String(t.category || "").toLowerCase() === name))).length;
    if (catalogKey === "investmentCategoryCatalog") return (data.investments || []).filter((i) => i.categoryId === id || (!i.categoryId && String(i.category || "").toLowerCase() === name)).length;
    if (catalogKey === "goalCategoryCatalog") return (data.goals || []).filter((g) => g.categoryId === id || (!g.categoryId && String(g.category || "").toLowerCase() === name)).length;
    if (catalogKey === "cardBrands") return (data.cards || []).filter((c) => c.brandId === id || (!c.brandId && String(c.brand || "").toLowerCase() === name)).length;
    if (catalogKey === "financialInstitutions") return (data.accounts || []).filter((a) => a.institutionId === id).length + (data.cards || []).filter((c) => c.institutionId === id).length;
    if (catalogKey === "investmentInstitutions") return (data.investments || []).filter((i) => i.institutionId === id).length;
    return 0;
  };

  const addCatalog = (key, name, scope, extra = {}) => {
    const profileKey = scope === "global" ? null : scope;
    setData((prev) => {
      const list = prev[key] || [];
      const duplicate = list.some((x) => String(x.name || "").trim().toLowerCase() === name.trim().toLowerCase() && (x.profileKey || null) === profileKey);
      if (duplicate) return prev;
      const order = Math.max(0, ...list.filter((x) => (x.profileKey || null) === profileKey).map((x) => Number(x.order) || 0)) + 1;
      const item = { id: "cfg_" + Math.random().toString(36).slice(2, 10), name: name.trim(), active: true, order, profileKey, ...extra };
      const next = { ...prev, [key]: [...list, item] };
      if (key === "financialInstitutions") next.banks = Array.from(new Set([...(prev.banks || []), item.name]));
      return next;
    });
    showToast("Cadastro criado");
  };

  const renameCatalog = (key, id, newName) => {
    const source = (data[key] || []).find((x) => x.id === id);
    if (!source) return;
    const oldName = source.name;
    setData((prev) => {
      const next = { ...prev, [key]: (prev[key] || []).map((x) => x.id === id ? { ...x, name: newName } : x) };
      const applies = (row) => !source.profileKey || row.profileKey === source.profileKey;
      if (key === "incomeCategoryCatalog" || key === "expenseCategoryCatalog") {
        next.transactions = (prev.transactions || []).map((t) => {
          const match = t.categoryId === id || (!t.categoryId && String(t.category || "").trim().toLowerCase() === oldName.toLowerCase() && applies(t));
          return match ? { ...t, categoryId: id, category: newName } : t;
        });
      }
      if (key === "investmentCategoryCatalog") {
        next.investments = (prev.investments || []).map((i) => i.categoryId === id || (!i.categoryId && String(i.category || "").trim().toLowerCase() === oldName.toLowerCase() && applies(i)) ? { ...i, categoryId: id, category: newName } : i);
      }
      if (key === "goalCategoryCatalog") {
        next.goals = (prev.goals || []).map((g) => g.categoryId === id || (!g.categoryId && String(g.category || "").trim().toLowerCase() === oldName.toLowerCase() && applies(g)) ? { ...g, categoryId: id, category: newName } : g);
      }
      if (key === "cardBrands") next.cards = (prev.cards || []).map((c) => c.brandId === id || (!c.brandId && String(c.brand || "").trim().toLowerCase() === oldName.toLowerCase()) ? { ...c, brandId: id, brand: newName } : c);
      if (key === "financialInstitutions") {
        next.banks = (prev.banks || []).map((b) => String(b).toLowerCase() === oldName.toLowerCase() ? newName : b);
        next.transactions = (prev.transactions || []).map((t) => String(t.bank || "").toLowerCase() === oldName.toLowerCase() ? { ...t, bank: newName } : t);
        next.cards = (prev.cards || []).map((c) => c.institutionId === id || String(c.institution || "").toLowerCase() === oldName.toLowerCase() ? { ...c, institutionId: id, institution: newName } : c);
      }
      if (key === "investmentInstitutions") next.investments = (prev.investments || []).map((i) => i.institutionId === id || String(i.institution || "").toLowerCase() === oldName.toLowerCase() ? { ...i, institutionId: id, institution: newName } : i);
      return next;
    });
    showToast("Nome atualizado");
  };

  const mergeCategory = (key, sourceId, targetId) => {
    const source = (data[key] || []).find((x) => x.id === sourceId);
    const target = (data[key] || []).find((x) => x.id === targetId);
    if (!source || !target) return;
    setData((prev) => {
      const next = { ...prev, [key]: (prev[key] || []).filter((x) => x.id !== sourceId) };
      const applies = (row) => !source.profileKey || row.profileKey === source.profileKey;
      if (key === "incomeCategoryCatalog" || key === "expenseCategoryCatalog") {
        next.transactions = (prev.transactions || []).map((t) => {
          const match = t.categoryId === sourceId || (!t.categoryId && String(t.category || "").trim().toLowerCase() === source.name.toLowerCase() && applies(t));
          return match ? { ...t, categoryId: targetId, category: target.name } : t;
        });
      }
      if (key === "investmentCategoryCatalog") next.investments = (prev.investments || []).map((i) => i.categoryId === sourceId || (!i.categoryId && String(i.category || "").trim().toLowerCase() === source.name.toLowerCase() && applies(i)) ? { ...i, categoryId: targetId, category: target.name } : i);
      if (key === "goalCategoryCatalog") next.goals = (prev.goals || []).map((g) => g.categoryId === sourceId || (!g.categoryId && String(g.category || "").trim().toLowerCase() === source.name.toLowerCase() && applies(g)) ? { ...g, categoryId: targetId, category: target.name } : g);
      return next;
    });
    showToast("Categorias mescladas");
  };

  const deleteCatalog = (key, id) => {
    const item = (data[key] || []).find((x) => x.id === id);
    if (!item) return;
    if (usage(key, item) > 0) return showToast("Item em uso: desative ou mescle");
    setData((prev) => ({ ...prev, [key]: (prev[key] || []).filter((x) => x.id !== id) }));
    showToast("Excluído");
  };

  const toggleCatalog = (key, id) => {
    setData((prev) => ({ ...prev, [key]: (prev[key] || []).map((x) => x.id === id ? { ...x, active: !x.active } : x) }));
  };

  const addAccount = (payload) => {
    setData((prev) => {
      const id = payload.id || "acct_" + Math.random().toString(36).slice(2, 10);
      const item = { ...payload, id };
      const exists = (prev.accounts || []).some((a) => a.id !== id && a.profileKey === payload.profileKey && String(a.accountName).trim().toLowerCase() === payload.accountName.trim().toLowerCase());
      if (exists) return prev;
      return payload.id
        ? { ...prev, accounts: (prev.accounts || []).map((a) => a.id === payload.id ? item : a) }
        : { ...prev, accounts: [...(prev.accounts || []), item] };
    });
    showToast(payload.id ? "Conta atualizada" : "Conta adicionada");
  };

  const accountDelete = (id) => {
    if ((data.transactions || []).some((t) => t.accountId === id)) return showToast("Conta em uso: desative em vez de excluir");
    setData((prev) => ({ ...prev, accounts: (prev.accounts || []).filter((a) => a.id !== id) }));
    showToast("Conta excluída");
  };

  const accountToggle = (id) => setData((prev) => ({ ...prev, accounts: (prev.accounts || []).map((a) => a.id === id ? { ...a, active: !a.active } : a) }));

  const addInstitution = (name) => addCatalog("financialInstitutions", name, "global", { kind: "bank" });

  const cardsForScope = (data.cards || []).filter((c) => c.profileKey === (targetProfile === "global" ? "p1" : targetProfile));
  const deleteCard = (id) => setData((prev) => ({ ...prev, cards: (prev.cards || []).filter((c) => c.id !== id), cardPurchases: (prev.cardPurchases || []).filter((p) => p.cardId !== id) }));

  const saveInitialBalance = (profileKey, value) => {
    const num = Number(String(value).replace(",", "."));
    if (!Number.isFinite(num)) return showToast("Saldo inválido");
    if (!window.confirm("Confirmar alteração do saldo inicial de " + profileName(profileKey) + "?")) return;
    setData((prev) => ({ ...prev, initialBalances: { ...(prev.initialBalances || {}), [profileKey]: num } }));
    showToast("Saldo inicial atualizado");
  };

  const exportData = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast("Backup exportado");
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        skipNextSave.current = false;
        setData(migrateData ? migrateData(JSON.parse(r.result)) : JSON.parse(r.result));
        showToast("Backup importado");
      } catch (e2) { showToast("Arquivo inválido"); }
    };
    r.readAsText(file);
    e.target.value = "";
  };

  const restoreCloud = async () => {
    if (!db) return;
    try {
      const ref = doc(db, "artifacts", appId, "public", "data", "finances", "shared_state_backup_weekly");
      const snap = await getDoc(ref);
      if (!snap.exists()) return showToast("Sem backup na nuvem");
      skipNextSave.current = false;
      setData(migrateData ? migrateData(snap.data()) : snap.data());
      showToast("Nuvem restaurada");
    } catch (e) { showToast("Erro na nuvem"); }
  };

  const catalogPanel = (key, scope, title, subtitle, merge = true) => {
    const items = key === "financialInstitutions" || key === "cardBrands" || key === "investmentInstitutions"
      ? [...(data[key] || [])].sort((a, b) => a.name.localeCompare(b.name))
      : scopedItems(key, scope);
    const usageById = Object.fromEntries(items.map((item) => [item.id, usage(key, item)]));
    return <CatalogManager key={key + "|" + scope} title={title} subtitle={subtitle} items={items} usageById={usageById}
      onAdd={(name) => addCatalog(key, name, scope)}
      onRename={(id, name) => renameCatalog(key, id, name)}
      onToggle={(id) => toggleCatalog(key, id)}
      onDelete={(id) => deleteCatalog(key, id)}
      onMerge={(source, target) => mergeCategory(key, source, target)}
      allowMerge={merge} />;
  };

  const selector = (allowGlobal) => profileFilter === "all" ? (
    <SettingCard className="p-5">
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Perfil para configurar</p>
      <select className={inputCls} style={inputStyle} value={targetProfile} onChange={(e) => setTargetProfile(e.target.value)}>
        {allowGlobal && <option value="global">Global</option>}
        {scopeProfiles.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
      </select>
    </SettingCard>
  ) : null;

  let contextBody = null;

  if (contextTab === "dashboard") {
    contextBody = (
      <div className="space-y-6">
        <SettingCard className="p-6">
          <p className="text-base font-bold mb-1">Saldo inicial</p>
          <p className="text-xs mb-5" style={{ color: MUTED }}>Base acumulada por perfil. Alterar este valor não modifica os lançamentos.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data.profiles || []).filter((p) => profileFilter === "all" || p.key === profileFilter).map((p) => (
              <div key={p.key} className="rounded-2xl border p-4" style={{ borderColor: BORDER }}>
                <div className="mb-3"><ProfileChip profile={p} /></div>
                <input id={"settings_initial_" + p.key} type="number" step="0.01" className={inputCls} style={inputStyle} defaultValue={Number(data.initialBalances?.[p.key] || 0)} />
                <button className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: "var(--c-couple-grad)" }} onClick={() => saveInitialBalance(p.key, document.getElementById("settings_initial_" + p.key)?.value)}>Salvar base</button>
              </div>
            ))}
          </div>
        </SettingCard>
      </div>
    );
  }

  if (contextTab === "transactions") {
    const scope = targetProfile;
    const accountProfile = scope === "global" ? (profileFilter === "all" ? "p1" : profileFilter) : scope;
    contextBody = (
      <div className="space-y-6">
        {selector(true)}
        {catalogPanel("incomeCategoryCatalog", scope, "Categorias de receita", scope === "global" ? "Compartilhadas entre os perfis." : "Globais + personalizadas de " + profileName(scope) + ".")}
        {catalogPanel("expenseCategoryCatalog", scope, "Categorias de despesa", scope === "global" ? "Compartilhadas entre os perfis." : "Globais + personalizadas de " + profileName(scope) + ".")}
        <AccountsManager data={data} profileKey={accountProfile} onSave={addAccount} onDelete={accountDelete} onToggle={accountToggle} />
        {scope === "global" && catalogPanel("financialInstitutions", "global", "Bancos e instituições financeiras", "Catálogo padronizado. Carteira fica separada como conta, não como banco.", false)}
        {scope !== "global" && (
          <SettingCard className="p-5">
            <p className="text-sm font-bold mb-1">Bancos padronizados</p>
            <p className="text-xs" style={{ color: MUTED }}>A lista de instituições é compartilhada. Para cadastrar um novo banco, altere o escopo para Global.</p>
          </SettingCard>
        )}
      </div>
    );
  }

  if (contextTab === "cards") {
    const scope = targetProfile;
    contextBody = (
      <div className="space-y-6">
        {selector(false)}
        <SettingCard className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div><p className="text-base font-bold">Cartões de {profileName(scope)}</p><p className="text-xs mt-1" style={{ color: MUTED }}>Cadastro completo, ciclo de fatura e perfil responsável.</p></div>
            <SettingBtn onClick={() => setModal({ type: "card" })}><Plus size={16} /> Novo</SettingBtn>
          </div>
          <div className="space-y-2">
            {cardsForScope.map((card) => {
              const brand = (data.cardBrands || []).find((b) => b.id === card.brandId);
              const inst = (data.financialInstitutions || []).find((i) => i.id === card.institutionId);
              return <div key={card.id} className="rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: BORDER }}>
                <div className="flex-1 min-w-0"><p className="font-bold text-sm">{card.name}</p><p className="text-xs mt-1" style={{ color: MUTED }}>{brand?.name || card.brand || "Sem bandeira"} · {inst?.name || card.institution || "Sem instituição"} · fecha {card.closingDay || 1} · vence {card.dueDay || 10}</p></div>
                <button className="p-2 rounded-lg hover:bg-black/5" onClick={() => setModal({ type: "card", item: card })}><Pencil size={15} style={{ color: MUTED }} /></button>
                <button className="p-2 rounded-lg hover:bg-black/5" onClick={() => { if (window.confirm("Excluir este cartão e suas compras parceladas?")) deleteCard(card.id); }}><Trash2 size={15} style={{ color: EXPENSE }} /></button>
              </div>;
            })}
            {!cardsForScope.length && <p className="text-sm" style={{ color: MUTED }}>Nenhum cartão cadastrado.</p>}
          </div>
        </SettingCard>
        {catalogPanel("cardBrands", "global", "Bandeiras", "Visa, Mastercard, Elo e outras.", false)}
        {catalogPanel("financialInstitutions", "global", "Instituições emissoras", "Catálogo compartilhado de bancos e instituições.", false)}
      </div>
    );
  }

  if (contextTab === "investments") {
    const scope = targetProfile === "global" ? "p1" : targetProfile;
    contextBody = (
      <div className="space-y-6">
        {selector(false)}
        {catalogPanel("investmentCategoryCatalog", scope, "Categorias de investimento", "Globais + personalizadas do perfil.")}
        {catalogPanel("investmentInstitutions", "global", "Instituições de investimento", "Instituições administráveis, sem deixar XP fixo no código.", false)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl pb-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: COUPLE }}>Centro de configuração</p>
        <h2 className="text-2xl font-black" style={{ fontFamily: "'Source Serif 4', serif", color: COUPLE }}>
          Ajustes de {contextLabel}{contextLabel === "Visão Geral" && profileFilter === "all" ? "" : " · " + currentProfileLabel}
        </h2>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Contexto atual: {currentProfileLabel}. Configurações individuais não são aplicadas silenciosamente a outros perfis.</p>
      </div>

      {contextBody}

      <div className="mt-10 pt-8 border-t-2 border-dashed" style={{ borderColor: BORDER }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Sistema</p>
        <h3 className="text-xl font-bold mb-5">Configurações Gerais</h3>

        <div className="space-y-6">
          <SettingCard className="p-6">
            <p className="text-base font-bold mb-1">PIN de Segurança</p>
            <p className="text-xs mb-4" style={{ color: MUTED }}>PIN atual permanece armazenado localmente neste dispositivo.</p>
            <div className="flex flex-wrap gap-2">
              <SettingBtn onClick={() => { localStorage.setItem("fluxo-casal-pin", "0403"); setSavedPin("0403"); showToast("PIN redefinido para 0403"); }}>Redefinir PIN (0403)</SettingBtn>
              <SettingBtn variant="danger" onClick={() => { localStorage.removeItem("fluxo-casal-pin"); setSavedPin(""); showToast("PIN removido"); }}>Remover PIN</SettingBtn>
            </div>
          </SettingCard>

          <SettingCard className="p-6">
            <p className="text-base font-bold mb-4">Perfis</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(data.profiles || []).map((p) => (
                <label key={p.key} className="block">
                  <span className="block mb-1.5 text-xs font-bold" style={{ color: p.key === "p1" ? "var(--c-felipe)" : p.key === "p2" ? "var(--c-sara)" : "var(--c-other)" }}>{p.name}</span>
                  <input className={inputCls} style={inputStyle} value={p.name} onChange={(e) => setData((prev) => ({ ...prev, profiles: (prev.profiles || []).map((x) => x.key === p.key ? { ...x, name: e.target.value } : x) }))} />
                </label>
              ))}
            </div>
          </SettingCard>

          <SettingCard className="p-6">
            <p className="text-base font-bold mb-1">Backup de Dados</p>
            <p className="text-xs mb-4" style={{ color: MUTED }}>Exportação local e restauração da cópia semanal da nuvem.</p>
            <div className="flex flex-wrap gap-2">
              <SettingBtn onClick={exportData}><Download size={16} /> Exportar Backup</SettingBtn>
              <SettingBtn variant="ghost" onClick={restoreCloud}><Upload size={16} /> Restaurar Nuvem</SettingBtn>
              <SettingBtn variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restaurar Arquivo</SettingBtn>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importData} />
            </div>
          </SettingCard>

          <SettingCard className="p-6">
            <p className="text-base font-bold mb-2">Informações do sistema</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div><span style={{ color: MUTED }}>Perfis</span><p className="font-black text-base">{(data.profiles || []).length}</p></div>
              <div><span style={{ color: MUTED }}>Lançamentos</span><p className="font-black text-base">{(data.transactions || []).length}</p></div>
              <div><span style={{ color: MUTED }}>Cartões</span><p className="font-black text-base">{(data.cards || []).length}</p></div>
              <div><span style={{ color: MUTED }}>Investimentos</span><p className="font-black text-base">{(data.investments || []).length}</p></div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}
