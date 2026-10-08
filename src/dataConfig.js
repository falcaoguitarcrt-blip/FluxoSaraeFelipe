export const DEFAULT_STATE = {
  lastAutoBackup: 0,
  initialBalances: { p1: 0, p2: 0, p3: 0 },
  profiles: [{ key: "p1", name: "Felipe" }, { key: "p2", name: "Sara" }, { key: "p3", name: "Outros" }],
  incomeCategories: ["Salário", "Freelance", "Rendimentos", "Reembolso", "Outros"],
  expenseCategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Cuidado pessoal", "Pets", "Outros"],
  banks: ["Nubank", "Itaú", "Bradesco", "Caixa", "Banco do Brasil", "Inter", "Carteira"],
  investmentCategories: ["Renda fixa", "Renda variável", "Fundos", "Cripto", "Previdência", "Outros"],
  goalCategories: ["Reserva de emergência", "Viagem", "Compra grande", "Educação", "Presente", "Outros"],
  incomeCategoryCatalog: [
    { id: "income_salary", name: "Salário", active: true, order: 1, profileKey: null },
    { id: "income_freelance", name: "Freelance", active: true, order: 2, profileKey: null },
    { id: "income_returns", name: "Rendimentos", active: true, order: 3, profileKey: null },
    { id: "income_refund", name: "Reembolso", active: true, order: 4, profileKey: null },
    { id: "income_other", name: "Outros", active: true, order: 5, profileKey: null }
  ],
  expenseCategoryCatalog: [
    { id: "expense_home", name: "Moradia", active: true, order: 1, profileKey: null },
    { id: "expense_food", name: "Alimentação", active: true, order: 2, profileKey: null },
    { id: "expense_transport", name: "Transporte", active: true, order: 3, profileKey: null },
    { id: "expense_health", name: "Saúde", active: true, order: 4, profileKey: null },
    { id: "expense_education", name: "Educação", active: true, order: 5, profileKey: null },
    { id: "expense_leisure", name: "Lazer", active: true, order: 6, profileKey: null },
    { id: "expense_subscriptions", name: "Assinaturas", active: true, order: 7, profileKey: null },
    { id: "expense_shopping", name: "Compras", active: true, order: 8, profileKey: null },
    { id: "expense_personal", name: "Cuidado pessoal", active: true, order: 9, profileKey: null },
    { id: "expense_pets", name: "Pets", active: true, order: 10, profileKey: null },
    { id: "expense_other", name: "Outros", active: true, order: 11, profileKey: null }
  ],
  financialInstitutions: [
    { id: "fi_nubank", name: "Nubank", active: true, kind: "bank" },
    { id: "fi_itau", name: "Itaú", active: true, kind: "bank" },
    { id: "fi_bradesco", name: "Bradesco", active: true, kind: "bank" },
    { id: "fi_caixa", name: "Caixa", active: true, kind: "bank" },
    { id: "fi_bb", name: "Banco do Brasil", active: true, kind: "bank" },
    { id: "fi_inter", name: "Inter", active: true, kind: "bank" }
  ],
  accounts: [
    { id: "account_wallet_p1", profileKey: "p1", institutionId: null, accountName: "Carteira", type: "wallet", active: true },
    { id: "account_wallet_p2", profileKey: "p2", institutionId: null, accountName: "Carteira", type: "wallet", active: true },
    { id: "account_wallet_p3", profileKey: "p3", institutionId: null, accountName: "Carteira", type: "wallet", active: true }
  ],
  cardBrands: [
    { id: "brand_visa", name: "Visa", active: true },
    { id: "brand_mastercard", name: "Mastercard", active: true },
    { id: "brand_elo", name: "Elo", active: true },
    { id: "brand_amex", name: "American Express", active: true },
    { id: "brand_hipercard", name: "Hipercard", active: true }
  ],
  investmentCategoryCatalog: [
    { id: "invest_fixed", name: "Renda fixa", active: true, order: 1, profileKey: null },
    { id: "invest_variable", name: "Renda variável", active: true, order: 2, profileKey: null },
    { id: "invest_funds", name: "Fundos", active: true, order: 3, profileKey: null },
    { id: "invest_crypto", name: "Cripto", active: true, order: 4, profileKey: null },
    { id: "invest_pension", name: "Previdência", active: true, order: 5, profileKey: null },
    { id: "invest_other", name: "Outros", active: true, order: 6, profileKey: null }
  ],
  investmentInstitutions: [
    { id: "invinst_xp", name: "XP", active: true },
    { id: "invinst_rico", name: "Rico", active: true },
    { id: "invinst_btg", name: "BTG Pactual", active: true },
    { id: "invinst_inter", name: "Inter", active: true }
  ],
  goalCategoryCatalog: [
    { id: "goal_emergency", name: "Reserva de emergência", active: true, order: 1, profileKey: null },
    { id: "goal_trip", name: "Viagem", active: true, order: 2, profileKey: null },
    { id: "goal_big", name: "Compra grande", active: true, order: 3, profileKey: null },
    { id: "goal_education", name: "Educação", active: true, order: 4, profileKey: null },
    { id: "goal_gift", name: "Presente", active: true, order: 5, profileKey: null },
    { id: "goal_other", name: "Outros", active: true, order: 6, profileKey: null }
  ],
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

function catalogStableId(prefix, name, profileKey) {
  const input = String(prefix) + "|" + String(profileKey || "global") + "|" + String(name || "").trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return String(prefix) + "_" + (hash >>> 0).toString(36);
}

function normalizeCatalog(list, prefix, fallback) {
  const source = Array.isArray(list) && list.length ? list : fallback;
  const out = [];
  (source || []).forEach((item, index) => {
    const name = typeof item === "string" ? item.trim() : String(item?.name || "").trim();
    if (!name) return;
    const profileKey = typeof item === "string" ? null : (item?.profileKey ?? null);
    const id = typeof item === "string" ? catalogStableId(prefix, name, profileKey) : (item.id || catalogStableId(prefix, name, profileKey));
    if (out.some((x) => x.name.toLowerCase() === name.toLowerCase() && (x.profileKey || null) === profileKey)) return;
    out.push({ id, name, active: typeof item === "string" ? true : item.active !== false, order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index + 1, profileKey });
  });
  return out.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name));
}

function normalizeNamedCatalog(list, prefix, fallback) {
  const source = Array.isArray(list) && list.length ? list : fallback;
  const out = [];
  (source || []).forEach((item, index) => {
    const name = typeof item === "string" ? item.trim() : String(item?.name || "").trim();
    if (!name) return;
    const id = typeof item === "string" ? catalogStableId(prefix, name, null) : (item.id || catalogStableId(prefix, name, null));
    if (out.some((x) => x.name.toLowerCase() === name.toLowerCase())) return;
    out.push({ id, name, active: typeof item === "string" ? true : item.active !== false, order: Number(item?.order) || index + 1 });
  });
  return out;
}

export function migrateData(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const next = { ...DEFAULT_STATE, ...base };
  next.profiles = Array.isArray(base.profiles) && base.profiles.length
    ? (base.profiles.some((p) => p.key === "p3") ? base.profiles : [...base.profiles, { key: "p3", name: "Outros" }])
    : DEFAULT_STATE.profiles;
  next.initialBalances = { ...DEFAULT_STATE.initialBalances, ...(base.initialBalances || {}) };
  next.incomeCategoryCatalog = normalizeCatalog(base.incomeCategoryCatalog || base.incomeCategories, "incat", DEFAULT_STATE.incomeCategoryCatalog);
  next.expenseCategoryCatalog = normalizeCatalog(base.expenseCategoryCatalog || base.expenseCategories, "excat", DEFAULT_STATE.expenseCategoryCatalog);
  next.investmentCategoryCatalog = normalizeCatalog(base.investmentCategoryCatalog || base.investmentCategories, "ivcat", DEFAULT_STATE.investmentCategoryCatalog);
  next.goalCategoryCatalog = normalizeCatalog(base.goalCategoryCatalog || base.goalCategories, "glcat", DEFAULT_STATE.goalCategoryCatalog);

  const institutions = [];
  const pushInstitution = (rawInstitution) => {
    const name = typeof rawInstitution === "string" ? rawInstitution.trim() : String(rawInstitution?.name || "").trim();
    if (!name || name.toLowerCase() === "carteira") return null;
    let item = institutions.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!item) {
      item = typeof rawInstitution === "object" && rawInstitution.id
        ? { ...rawInstitution, name, active: rawInstitution.active !== false, kind: rawInstitution.kind || "bank" }
        : { id: catalogStableId("finst", name, null), name, active: true, kind: "bank" };
      institutions.push(item);
    }
    return item;
  };
  (Array.isArray(base.financialInstitutions) ? base.financialInstitutions : []).forEach(pushInstitution);
  (DEFAULT_STATE.financialInstitutions || []).forEach(pushInstitution);
  (Array.isArray(base.banks) ? base.banks : []).forEach(pushInstitution);
  next.financialInstitutions = institutions;

  const accounts = Array.isArray(base.accounts) ? base.accounts.map((a) => ({ ...a, active: a.active !== false })) : [];
  const ensureWallet = (profileKey) => {
    let item = accounts.find((a) => a.profileKey === profileKey && a.type === "wallet" && a.active !== false);
    if (!item) {
      item = { id: catalogStableId("acct", "Carteira", profileKey), profileKey, institutionId: null, accountName: "Carteira", type: "wallet", active: true };
      accounts.push(item);
    }
    return item;
  };
  next.profiles.forEach((p) => ensureWallet(p.key));

  const findInstitution = (name) => {
    const n = String(name || "").trim().toLowerCase();
    return next.financialInstitutions.find((x) => x.name.toLowerCase() === n);
  };

  const ensureAccountFromBank = (profileKey, bankName) => {
    const name = String(bankName || "Carteira").trim();
    if (!name || name.toLowerCase() === "carteira") return ensureWallet(profileKey);
    let institution = findInstitution(name);
    if (!institution) institution = pushInstitution(name);
    let account = accounts.find((a) => a.profileKey === profileKey && a.institutionId === institution.id && a.active !== false);
    if (!account) {
      account = { id: catalogStableId("acct", institution.id, profileKey), profileKey, institutionId: institution.id, accountName: "Conta principal", type: "digital", active: true };
      accounts.push(account);
    }
    return account;
  };

  const findScopedCatalog = (list, name, profileKey) => {
    const n = String(name || "").trim().toLowerCase();
    return list.find((x) => x.name.toLowerCase() === n && (x.profileKey == null || x.profileKey === profileKey));
  };

  next.transactions = (Array.isArray(base.transactions) ? base.transactions : []).map((t) => {
    const profileKey = t.profileKey || next.profiles[0]?.key || "p1";
    const bankName = String(t.bank || "Carteira").trim() || "Carteira";
    const account = t.accountId ? accounts.find((a) => a.id === t.accountId) : ensureAccountFromBank(profileKey, bankName);
    const catList = t.direction === "in" ? next.incomeCategoryCatalog : next.expenseCategoryCatalog;
    let cat = t.categoryId ? catList.find((c) => c.id === t.categoryId) : findScopedCatalog(catList, t.category || "", profileKey);
    if (!cat && t.category) {
      cat = { id: catalogStableId("autocat", t.category, profileKey), name: String(t.category).trim(), active: true, order: catList.length + 1, profileKey };
      catList.push(cat);
    }
    const institution = account?.institutionId ? next.financialInstitutions.find((i) => i.id === account.institutionId) : null;
    return { ...t, profileKey, categoryId: cat?.id || null, accountId: account?.id || null, bank: institution?.name || (account?.type === "wallet" ? "Carteira" : bankName) };
  });
  next.accounts = accounts;
  next.banks = next.financialInstitutions.map((i) => i.name).concat("Carteira");

  next.cardBrands = normalizeNamedCatalog(
    (Array.isArray(base.cardBrands) && base.cardBrands.length ? base.cardBrands : DEFAULT_STATE.cardBrands)
      .concat((base.cards || []).map((c) => c?.brand).filter(Boolean)),
    "brand",
    DEFAULT_STATE.cardBrands
  );
  next.cards = (Array.isArray(base.cards) ? base.cards : []).map((c) => {
    const rawBrand = String(c.brand || "Visa").trim();
    let brand = next.cardBrands.find((b) => b.name.toLowerCase() === rawBrand.toLowerCase());
    if (!brand) {
      brand = { id: catalogStableId("brand", rawBrand, null), name: rawBrand, active: true, order: next.cardBrands.length + 1 };
      next.cardBrands.push(brand);
    }
    let institutionId = c.institutionId || null;
    if (!institutionId && c.institution) {
      let inst = findInstitution(c.institution);
      if (!inst) inst = pushInstitution(c.institution);
      institutionId = inst?.id || null;
    }
    return { ...c, brand: rawBrand, brandId: brand.id, institutionId, closingDay: Number(c.closingDay) || 1, dueDay: Number(c.dueDay) || 10, active: c.active !== false };
  });

  next.investmentInstitutions = normalizeNamedCatalog(
    (Array.isArray(base.investmentInstitutions) && base.investmentInstitutions.length ? base.investmentInstitutions : DEFAULT_STATE.investmentInstitutions)
      .concat((base.investments || []).map((i) => i?.institution).filter(Boolean)),
    "invinst",
    DEFAULT_STATE.investmentInstitutions
  );
  next.investments = (Array.isArray(base.investments) ? base.investments : []).map((inv) => {
    const profileKey = inv.profileKey || "p1";
    const cat = inv.categoryId ? next.investmentCategoryCatalog.find((c) => c.id === inv.categoryId) : findScopedCatalog(next.investmentCategoryCatalog, inv.category || "Outros", profileKey);
    const institutionName = String(inv.institution || "XP").trim() || "XP";
    let institution = next.investmentInstitutions.find((x) => x.name.toLowerCase() === institutionName.toLowerCase());
    if (!institution) {
      institution = { id: catalogStableId("invinst", institutionName, null), name: institutionName, active: true };
      next.investmentInstitutions.push(institution);
    }
    return { ...inv, profileKey, categoryId: cat?.id || null, institutionId: institution.id, institution: institution.name };
  });

  next.goals = (Array.isArray(base.goals) ? base.goals : []).map((g) => {
    const profileKey = g.profileKey || "p2";
    let cat = g.categoryId ? next.goalCategoryCatalog.find((c) => c.id === g.categoryId) : findScopedCatalog(next.goalCategoryCatalog, g.category || "Outros", profileKey);
    if (!cat) {
      const name = String(g.category || "Outros").trim() || "Outros";
      cat = { id: catalogStableId("glcat", name, profileKey), name, active: true, order: next.goalCategoryCatalog.length + 1, profileKey };
      next.goalCategoryCatalog.push(cat);
    }
    return { ...g, profileKey, categoryId: cat.id, category: cat.name };
  });

  return next;
}

export function getProfileCatalog(data, key, profileKey, includeInactive = false) {
  const list = Array.isArray(data?.[key]) ? data[key] : [];
  return list.filter((item) => {
    if (!includeInactive && item.active === false) return false;
    if (item.profileKey == null) return true;
    return item.profileKey === profileKey;
  }).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name));
}

export function getAccountsForProfile(data, profileKey, includeInactive = false) {
  return (Array.isArray(data?.accounts) ? data.accounts : [])
    .filter((a) => a.profileKey === profileKey && (includeInactive || a.active !== false))
    .sort((a, b) => String(a.accountName || "").localeCompare(String(b.accountName || "")));
}
