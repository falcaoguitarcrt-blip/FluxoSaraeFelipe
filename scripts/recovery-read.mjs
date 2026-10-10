import { readFileSync } from "node:fs";

const source = readFileSync("src/App.jsx", "utf8");
const key = source.match(/apiKey:\s*"([^"]+)"/)?.[1];
const project = source.match(/projectId:\s*"([^"]+)"/)?.[1];
if (!key || !project) throw new Error("config missing");

const authRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + key, {
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({returnSecureToken:true})
});
const auth = await authRes.json();
if (!authRes.ok) throw new Error(JSON.stringify(auth));
const headers = {Authorization:"Bearer " + auth.idToken};

const base = "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents";
const dbMeta = "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)";
const metaRes = await fetch(dbMeta,{headers});
const metaBody = await metaRes.json();
console.log("DB_META",metaRes.status,JSON.stringify(metaRes.ok ? {pointInTimeRecoveryEnablement:metaBody.pointInTimeRecoveryEnablement,versionRetentionPeriod:metaBody.versionRetentionPeriod,earliestVersionTime:metaBody.earliestVersionTime,updateTime:metaBody.updateTime}:metaBody?.error||metaBody));
const apps = ["fluxo-casal-producao","fluxo-casal-compartilhado-oficial-2026"];

function pathFor(app) {
  return base + "/artifacts/" + encodeURIComponent(app) + "/public/data/finances/shared_state";
}
function counts(body) {
  const f=body?.fields||{};
  const get=k=>Array.isArray(f[k]?.arrayValue?.values)?f[k].arrayValue.values.length:0;
  const mapKeys=k=>f[k]?.mapValue?.fields ? Object.keys(f[k].mapValue.fields).length : 0;
  const scalar=k=>Object.keys(f[k]||{})[0] ? f[k] : null;
  return {
    profiles:get("profiles"),
    transactions:get("transactions"),
    cards:get("cards"),
    cardPurchases:get("cardPurchases"),
    investments:get("investments"),
    goals:get("goals"),
    netWorthHistory:get("netWorthHistory"),
    bills:get("bills"),
    incomeCategoryCatalog:get("incomeCategoryCatalog"),
    expenseCategoryCatalog:get("expenseCategoryCatalog"),
    financialInstitutions:get("financialInstitutions"),
    accounts:get("accounts"),
    investmentCategoryCatalog:get("investmentCategoryCatalog"),
    investmentInstitutions:get("investmentInstitutions"),
    goalCategoryCatalog:get("goalCategoryCatalog"),
    paidStatementsKeys:mapKeys("paidStatements"),
    budgetLimitsKeys:mapKeys("budgetLimits"),
    initialBalances:scalar("initialBalances"),
    keys:Object.keys(f).length
  };
}

const now = new Date();
const samples = [
  new Date(now.getTime()-5*60*1000),
  new Date(Date.parse("2026-10-09T20:00:00Z")),
  new Date(Date.parse("2026-10-09T18:00:00Z")),
  new Date(Date.parse("2026-10-09T16:00:00Z")),
  new Date(Date.parse("2026-10-09T12:00:00Z")),
  new Date(Date.parse("2026-10-09T00:00:00Z")),
  new Date(Date.parse("2026-10-08T23:00:00Z")),
  new Date(Date.parse("2026-10-08T22:00:00Z")),
  new Date(Date.parse("2026-10-08T21:00:00Z")),
  new Date(Date.parse("2026-10-08T20:00:00Z")),
  new Date(Date.parse("2026-10-08T19:00:00Z")),
  new Date(Date.parse("2026-10-08T18:00:00Z")),
  new Date(Date.parse("2026-10-08T17:00:00Z")),
  new Date(Date.parse("2026-10-08T16:00:00Z"))
];

for (const app of apps) {
  for (const t of samples) {
    const readTime = t.toISOString().replace(/\.\d{3}Z$/, "Z");
    const res = await fetch(pathFor(app) + "?readTime=" + encodeURIComponent(readTime), {headers});
    const body = await res.json();
    const s=counts(body);
    console.log("PITR",app,readTime,"status="+res.status,"summary="+JSON.stringify(s),"error="+(body?.error?.message||""));
  }
}


const denseTimes = [];
// Probe the recent historical window at 5-minute intervals.
const start = new Date(Date.now() - 55 * 60 * 1000);
for (let i = 0; i <= 11; i++) denseTimes.push(new Date(start.getTime() + i * 5 * 60 * 1000));

function detailed(field) {
  const v = field?.arrayValue?.values;
  if (!Array.isArray(v)) return [];
  return v.map((x, i) => {
    const f = x?.mapValue?.fields || {};
    const getString = (k) => f[k]?.stringValue ?? null;
    const getNumber = (k) => f[k]?.doubleValue ?? f[k]?.integerValue ?? null;
    return {
      i,
      id: getString("id"),
      profileKey: getString("profileKey"),
      description: getString("description"),
      category: getString("category"),
      institution: getString("institution"),
      amount: getNumber("amount"),
      investedAmount: getNumber("investedAmount"),
      marketValue: getNumber("marketValue")
    };
  });
}

for (const app of apps) {
  for (const t of denseTimes) {
    const readTime = t.toISOString().replace(/\.\d{3}Z$/, "Z");
    const res = await fetch(pathFor(app) + "?readTime=" + encodeURIComponent(readTime), {headers});
    const body = await res.json();
    const f = body?.fields || {};
    const s = counts(body);
    console.log("DENSE",app,readTime,"status="+res.status,"summary="+JSON.stringify(s),"transactions="+JSON.stringify(detailed(f.transactions)),"investments="+JSON.stringify(detailed(f.investments)));
  }
}

console.log("DENSE_AUDIT_VERSION=2026-10-10T02:31Z");


console.log("CURRENT_DOC_UPDATE_TIMES_BEGIN");
for (const app of ["fluxo-casal-producao","fluxo-casal-compartilhado-oficial","fluxo-casal-compartilhado-oficial-2026"]) {
  const res = await fetch(pathFor(app));
  const body = await res.json();
  console.log("CURRENT_UPDATE", app, res.status, body.updateTime || "", body.createTime || "");
}
console.log("CURRENT_DOC_UPDATE_TIMES_END");

console.log("=== RECURSIVE DISCOVERY ===");
async function listCollections(parentPath) {
  const url = base + "/" + (parentPath ? parentPath.split("/").map(encodeURIComponent).join("/") + "/" : "") + ":listCollectionIds";
  const res = await fetch(url, {method:"POST", headers:{...headers,"Content-Type":"application/json"}, body:JSON.stringify({pageSize:100})});
  const body = await res.json();
  return res.ok ? (body.collectionIds || []) : [];
}
async function listDocs(collectionPath) {
  const url = base + "/" + collectionPath.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(url, {headers});
  const body = await res.json();
  return res.ok ? (body.documents || []) : [];
}
async function walkDoc(docPath, depth=0) {
  if (depth > 8) return;
  const cols = await listCollections(docPath);
  for (const col of cols) {
    const colPath = docPath + "/" + col;
    const docs = await listDocs(colPath);
    for (const d of docs) {
      const f = d.fields || {};
      const keys = Object.keys(f);
      const summary = {
        keys: keys.length,
        profiles: countField(f,"profiles"),
        transactions: countField(f,"transactions"),
        cards: countField(f,"cards"),
        cardPurchases: countField(f,"cardPurchases"),
        investments: countField(f,"investments"),
        goals: countField(f,"goals"),
        netWorthHistory: countField(f,"netWorthHistory")
      };
      if (summary.transactions || summary.cards || summary.cardPurchases || summary.investments || summary.goals || summary.netWorthHistory) {
        console.log("RECURSIVE_FINANCE_DATA", d.name, JSON.stringify(summary));
        console.log("RECURSIVE_FINANCE_JSON", JSON.stringify(d));
      } else {
        console.log("RECURSIVE_DOC", d.name, JSON.stringify(summary));
      }
      await walkDoc(d.name.replace(base + "/",""), depth+1);
    }
  }
}
const topColls = ["artifacts","shared","users"];
for (const top of topColls) {
  const docs = await listDocs(top);
  console.log("RECURSIVE_TOP", top, "count="+docs.length);
  for (const d of docs) {
    await walkDoc(d.name.replace(base + "/",""), 0);
  }
}
