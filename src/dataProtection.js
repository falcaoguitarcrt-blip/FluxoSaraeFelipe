/**
 * Helpers for conservative detection and copying of persisted finance state.
 * Seeded catalog rows are excluded; custom settings and unknown future fields count.
 */
export const PERSISTENCE_DATA_KEYS = [
  "transactions", "bills", "cards", "cardPurchases", "investments", "goals", "netWorthHistory",
  "accounts", "profiles", "banks", "financialInstitutions", "cardBrands", "investmentInstitutions",
  "incomeCategories", "expenseCategories", "investmentCategories", "goalCategories",
  "incomeCategoryCatalog", "expenseCategoryCatalog", "investmentCategoryCatalog", "goalCategoryCatalog",
  "budgetLimits", "paidStatements", "initialBalances"
];

const DEFAULT_ACCOUNT_IDS = new Set(["account_wallet_p1", "account_wallet_p2", "account_wallet_p3"]);
const DEFAULT_CATALOG_IDS = new Set([
  "income_salary", "income_freelance", "income_returns", "income_refund", "income_other",
  "expense_home", "expense_food", "expense_transport", "expense_health", "expense_education",
  "expense_leisure", "expense_subscriptions", "expense_shopping", "expense_personal",
  "expense_pets", "expense_other", "invest_fixed", "invest_variable", "invest_funds",
  "invest_crypto", "invest_pension", "invest_other", "goal_emergency", "goal_trip",
  "goal_big", "goal_education", "goal_gift", "goal_other"
]);
const DEFAULT_NAMED_IDS = new Set([
  "fi_nubank", "fi_itau", "fi_bradesco", "fi_caixa", "fi_bb", "fi_inter",
  "brand_visa", "brand_mastercard", "brand_elo", "brand_amex", "brand_hipercard",
  "invinst_xp", "invinst_rico", "invinst_btg", "invinst_inter"
]);
const DEFAULT_PROFILES = [
  { key: "p1", name: "Felipe" }, { key: "p2", name: "Sara" }, { key: "p3", name: "Outros" }
];
const DEFAULT_LISTS = {
  incomeCategories: ["Salário", "Freelance", "Rendimentos", "Reembolso", "Outros"],
  expenseCategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Cuidado pessoal", "Pets", "Outros"],
  investmentCategories: ["Renda fixa", "Renda variável", "Fundos", "Cripto", "Previdência", "Outros"],
  goalCategories: ["Reserva de emergência", "Viagem", "Compra grande", "Educação", "Presente", "Outros"],
  banks: ["Nubank", "Itaú", "Bradesco", "Caixa", "Banco do Brasil", "Inter", "Carteira"]
};

export function clonePersistedData(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function hasMeaningfulUserData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  for (const key of ["transactions", "bills", "cards", "cardPurchases", "investments", "goals", "netWorthHistory"]) {
    if (Array.isArray(value[key]) && value[key].length > 0) return true;
  }

  if ((Array.isArray(value.accounts) ? value.accounts : []).some((item) => item && !DEFAULT_ACCOUNT_IDS.has(item.id))) return true;

  for (const key of ["incomeCategoryCatalog", "expenseCategoryCatalog", "investmentCategoryCatalog", "goalCategoryCatalog"]) {
    const rows = Array.isArray(value[key]) ? value[key] : [];
    if (rows.some((row) => row && typeof row === "object" &&
      (row.profileKey != null || row.active === false || !DEFAULT_CATALOG_IDS.has(row.id)))) return true;
  }

  for (const [key, allowed] of Object.entries(DEFAULT_LISTS)) {
    if ((Array.isArray(value[key]) ? value[key] : []).some((item) => !allowed.includes(item))) return true;
  }

  for (const key of ["financialInstitutions", "cardBrands", "investmentInstitutions"]) {
    if ((Array.isArray(value[key]) ? value[key] : []).some((item) => item && !DEFAULT_NAMED_IDS.has(item.id))) return true;
  }

  if (Array.isArray(value.profiles) && JSON.stringify(value.profiles) !== JSON.stringify(DEFAULT_PROFILES)) return true;
  if (Object.values(value.initialBalances || {}).some((amount) => Number(amount) !== 0)) return true;
  if (value.budgetLimits && typeof value.budgetLimits === "object" && Object.keys(value.budgetLimits).length > 0) return true;
  if (value.paidStatements && typeof value.paidStatements === "object" && Object.keys(value.paidStatements).length > 0) return true;

  const knownKeys = new Set([...PERSISTENCE_DATA_KEYS, "lastAutoBackup"]);
  return Object.entries(value).some(([key, item]) => !knownKeys.has(key) && item != null && item !== "" &&
    item !== 0 && item !== false && !(Array.isArray(item) && item.length === 0) &&
    !(typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0));
}


/**
 * Builds a version envelope around a raw persisted snapshot without projecting
 * it onto a known schema. Unknown fields remain inside the cloned data object.
 */
export function createHistoryRecord({ versionId, createdAt, source = "before-client-save", data }) {
  if (typeof versionId !== "string" || !versionId.trim()) {
    throw new TypeError("A history version requires a non-empty versionId.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("A history version requires a persisted object snapshot.");
  }
  return {
    versionId,
    createdAt,
    source,
    schemaVersion: 1,
    data: clonePersistedData(data)
  };
}

export function isValidHistoryRecord(record) {
  return Boolean(
    record &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    typeof record.versionId === "string" &&
    record.versionId.length > 0 &&
    record.createdAt != null &&
    Number.isInteger(record.schemaVersion) &&
    record.schemaVersion >= 1 &&
    record.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
  );
}


/**
 * Compares plain persisted snapshots independent of object-key ordering.
 * Arrays remain ordered because transaction and statement order may be meaningful.
 * This intentionally supports Firestore's JSON-compatible persisted state only;
 * non-plain Firestore values must be normalized explicitly before calling it.
 */
export function stableSnapshotString(value) {
  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      const proto = Object.getPrototypeOf(item);
      if (proto !== Object.prototype && proto !== null) {
        throw new TypeError("Snapshot contains a non-plain object; comparison is unsafe.");
      }
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, normalize(item[key])]));
    }
    if (typeof item === "number" && !Number.isFinite(item)) {
      throw new TypeError("Snapshot contains a non-finite number; comparison is unsafe.");
    }
    if (typeof item === "undefined" || typeof item === "function" || typeof item === "symbol" || typeof item === "bigint") {
      throw new TypeError("Snapshot contains an unsupported value; comparison is unsafe.");
    }
    return item;
  };
  return JSON.stringify(normalize(value));
}

export function snapshotsEqual(left, right) {
  return stableSnapshotString(left) === stableSnapshotString(right);
}
