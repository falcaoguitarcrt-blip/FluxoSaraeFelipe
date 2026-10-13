import assert from "node:assert/strict";
import { hasMeaningfulUserData, clonePersistedData, createHistoryRecord, isValidHistoryRecord } from "../src/dataProtection.js";

const empty = {
  transactions: [], bills: [], cards: [], cardPurchases: [], investments: [], goals: [], netWorthHistory: [],
  accounts: [{ id: "account_wallet_p1" }, { id: "account_wallet_p2" }, { id: "account_wallet_p3" }],
  profiles: [{ key: "p1", name: "Felipe" }, { key: "p2", name: "Sara" }, { key: "p3", name: "Outros" }],
  initialBalances: { p1: 0, p2: 0, p3: 0 },
  financialInstitutions: [{ id: "fi_nubank" }, { id: "fi_itau" }, { id: "fi_bradesco" }, { id: "fi_caixa" }, { id: "fi_bb" }, { id: "fi_inter" }],
  cardBrands: [{ id: "brand_visa" }, { id: "brand_mastercard" }, { id: "brand_elo" }, { id: "brand_amex" }, { id: "brand_hipercard" }],
  investmentInstitutions: [{ id: "invinst_xp" }, { id: "invinst_rico" }, { id: "invinst_btg" }, { id: "invinst_inter" }],
  incomeCategories: ["Salário", "Freelance", "Rendimentos", "Reembolso", "Outros"],
  expenseCategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Cuidado pessoal", "Pets", "Outros"],
  investmentCategories: ["Renda fixa", "Renda variável", "Fundos", "Cripto", "Previdência", "Outros"],
  goalCategories: ["Reserva de emergência", "Viagem", "Compra grande", "Educação", "Presente", "Outros"],
  banks: ["Nubank", "Itaú", "Bradesco", "Caixa", "Banco do Brasil", "Inter", "Carteira"],
  incomeCategoryCatalog: [{ id: "income_salary", profileKey: null }, { id: "income_freelance", profileKey: null }],
  expenseCategoryCatalog: [{ id: "expense_home", profileKey: null }, { id: "expense_food", profileKey: null }],
  investmentCategoryCatalog: [{ id: "invest_fixed", profileKey: null }],
  goalCategoryCatalog: [{ id: "goal_trip", profileKey: null }],
  budgetLimits: {}, paidStatements: {}, lastAutoBackup: 0
};

assert.equal(hasMeaningfulUserData(empty), false, "seeded defaults must not count as user data");
assert.equal(hasMeaningfulUserData({ ...empty, transactions: [{ id: "tx1", amount: 5 }] }), true, "transactions count as data");
assert.equal(hasMeaningfulUserData({ ...empty, bills: [{ id: "bill1", amount: 5 }] }), true, "bills count as data");
assert.equal(hasMeaningfulUserData({ ...empty, cards: [{ id: "card1" }] }), true, "cards count as data");
assert.equal(hasMeaningfulUserData({ ...empty, accounts: [...empty.accounts, { id: "custom-account" }] }), true, "custom accounts count as data");
assert.equal(hasMeaningfulUserData({ ...empty, expenseCategoryCatalog: [...empty.expenseCategoryCatalog, { id: "custom-cat", profileKey: "p1" }] }), true, "custom categories count as data");
assert.equal(hasMeaningfulUserData({ ...empty, budgetLimits: { p1: { "2026-10": 900 } } }), true, "budget limits count as data");
assert.equal(hasMeaningfulUserData({ ...empty, paidStatements: { paid1: true } }), true, "paid statements count as data");
assert.equal(hasMeaningfulUserData({ ...empty, futureOpaqueField: { keep: true } }), true, "unknown populated fields count as data");
assert.equal(hasMeaningfulUserData(null), false, "null is not data");
assert.equal(hasMeaningfulUserData([]), false, "array root is not a persisted object");
const original = { transactions: [{ id: "tx", nested: { keep: true } }] };
const copy = clonePersistedData(original);
assert.deepEqual(copy, original, "clone preserves nested fields");
copy.transactions[0].nested.keep = false;
assert.equal(original.transactions[0].nested.keep, true, "clone does not mutate source object");
const historySource = {
  transactions: [{ id: "tx-history", amount: 42, customFutureField: { keep: "yes" } }],
  unknownRootField: { preserve: true }
};
const history = createHistoryRecord({
  versionId: "fake-version-001",
  createdAt: "2026-10-13T12:00:00.000Z",
  source: "test-fixture",
  data: historySource
});
assert.equal(isValidHistoryRecord(history), true, "well-formed history record is valid");
assert.deepEqual(history.data, historySource, "history record preserves unknown root and nested fields");
assert.notEqual(history.data, historySource, "history record clones its source snapshot");
assert.equal(isValidHistoryRecord({ ...history, data: [] }), false, "array snapshot is invalid");
assert.equal(isValidHistoryRecord({ ...history, versionId: "" }), false, "missing version ID is invalid");
assert.throws(() => createHistoryRecord({ versionId: "", createdAt: "now", data: historySource }), TypeError);
assert.throws(() => createHistoryRecord({ versionId: "fake", createdAt: "now", data: [] }), TypeError);
console.log("20 assertions passed: defaults, finance data, unknown fields, cloning, and history-record validation.");
