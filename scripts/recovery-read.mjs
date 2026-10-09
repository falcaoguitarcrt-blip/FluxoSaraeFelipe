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
const apps = ["fluxo-casal-producao","fluxo-casal-compartilhado-oficial-2026"];

function pathFor(app) {
  return base + "/artifacts/" + encodeURIComponent(app) + "/public/data/finances/shared_state";
}
function counts(body) {
  const f=body?.fields||{};
  const get=k=>Array.isArray(f[k]?.arrayValue?.values)?f[k].arrayValue.values.length:0;
  return {
    profiles:get("profiles"),
    transactions:get("transactions"),
    cards:get("cards"),
    cardPurchases:get("cardPurchases"),
    investments:get("investments"),
    goals:get("goals"),
    netWorthHistory:get("netWorthHistory"),
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
