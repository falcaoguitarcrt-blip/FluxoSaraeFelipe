import assert from "node:assert/strict";

function hasMeaningfulUserData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const dataArrays = [
    "transactions", "bills", "cards", "cardPurchases", "investments", "goals",
    "netWorthHistory", "accounts", "financialInstitutions", "cardBrands", "investmentInstitutions"
  ];
  if (dataArrays.some((key) => Array.isArray(value[key]) && value[key].length > 0)) return true;
  const standardIds = /^(income|expense|invest|goal)_/;
  for (const key of ["incomeCategoryCatalog", "expenseCategoryCatalog", "investmentCategoryCatalog", "goalCategoryCatalog"]) {
    const rows = Array.isArray(value[key]) ? value[key] : [];
    if (rows.some((row) => row && typeof row === "object" &&
      (row.profileKey != null || row.active === false || !standardIds.test(String(row.id || "")))) return true;
  }
  const defaults = {
    incomeCategories: ["Salário", "Freelance", "Rendimentos", "Reembolso", "Outros"],
    expenseCategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Cuidado pessoal", "Pets", "Outros"],
    investmentCategories: ["Renda fixa", "Renda variável", "Fundos", "Cripto", "Previdência", "Outros"],
    goalCategories: ["Reserva de emergência", "Viagem", "Compra grande", "Educação", "Presente", "Outros"],
    banks: ["Nubank", "Itaú", "Bradesco", "Caixa", "Banco do Brasil", "Inter", "Carteira"]
  };
  for (const [key, allowed] of Object.entries(defaults)) {
    if ((Array.isArray(value[key]) ? value[key] : []).some((item) => !allowed.includes(item))) return true;
  }
  if (Object.values(value.initialBalances || {}).some((amount) => Number(amount) !== 0)) return true;
  if (value.budgetLimits && Object.keys(value.budgetLimits).length) return true;
  if (value.paidStatements && Object.keys(value.paidStatements).length) return true;
  const known = new Set([
    "transactions", "bills", "cards", "cardPurchases", "investments", "goals", "netWorthHistory",
    "accounts", "profiles", "banks", "financialInstitutions", "cardBrands", "investmentInstitutions",
    "incomeCategories", "expenseCategories", "investmentCategories", "goalCategories",
    "incomeCategoryCatalog", "expenseCategoryCatalog", "investmentCategoryCatalog", "goalCategoryCatalog",
    "budgetLimits", "paidStatements", "initialBalances", "lastAutoBackup"
  ]);
  return Object.entries(value).some(([key, item]) => !known.has(key) && item != null && item !== "" &&
    item !== 0 && item !== false && !(Array.isArray(item) && item.length === 0) &&
    !(typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0));
}

const empty = { transactions: [], bills: [], cards: [], cardPurchases: [], investments: [], goals: [], netWorthHistory: [], accounts: [], initialBalances: { p1: 0, p2: 0, p3: 0 } };
assert.equal(hasMeaningfulUserData(empty), false, "known empty state is empty");
assert.equal(hasMeaningfulUserData({ ...empty, bills: [{ id: "bill-1", amount: 10 }] }), true, "bills count as meaningful data");
assert.equal(hasMeaningfulUserData({ ...empty, accounts: [{ id: "acc-1" }] }), true, "accounts count as meaningful data");
assert.equal(hasMeaningfulUserData({ ...empty, expenseCategoryCatalog: [{ id: "custom-1", name: "Custom", profileKey: "p1" }] }), true, "custom category counts as meaningful data");
assert.equal(hasMeaningfulUserData({ ...empty, budgetLimits: { p1: { "2026-10": 900 } } }), true, "budget limits count as meaningful data");
assert.equal(hasMeaningfulUserData({ ...empty, paidStatements: { statement1: true } }), true, "paid statements count as meaningful data");
assert.equal(hasMeaningfulUserData({ ...empty, futureOpaqueField: { keep: true } }), true, "unknown non-empty fields count as meaningful data");
assert.equal(hasMeaningfulUserData(null), false, "null is not data");
assert.equal(hasMeaningfulUserData([]), false, "array root is rejected");
console.log("8 tests passed: meaningful data detection, custom configuration, unknown fields, empty/null guards.");
