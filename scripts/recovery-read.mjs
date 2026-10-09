import { readFileSync } from "node:fs";

const source = readFileSync("src/App.jsx", "utf8");
const key = source.match(/apiKey:\s*"([^"]+)"/)?.[1];
const project = source.match(/projectId:\s*"([^"]+)"/)?.[1];
if (!key || !project) throw new Error("config missing");

const base = "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)";
const authUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + key;
const authRes = await fetch(authUrl, {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({returnSecureToken:true})
});
const auth = await authRes.json();
if (!authRes.ok) throw new Error(JSON.stringify(auth));

const hdr = {"Content-Type":"application/json", "Authorization":"Bearer " + auth.idToken};
const apps = ["fluxo-casal-producao","fluxo-casal-compartilhado-oficial-2026"];

function pathFor(app) {
  return base + "/documents/artifacts/" + encodeURIComponent(app) + "/public/data/finances/shared_state";
}
function count(f,k) {
  const a=f?.[k]?.arrayValue?.values;
  return Array.isArray(a) ? a.length : 0;
}
function info(item) {
  const f=item?.found?.fields||{};
  return {
    profiles:count(f,"profiles"),
    transactions:count(f,"transactions"),
    cards:count(f,"cards"),
    cardPurchases:count(f,"cardPurchases"),
    investments:count(f,"investments"),
    goals:count(f,"goals"),
    netWorthHistory:count(f,"netWorthHistory")
  };
}

const samples=[];
for (let h=0; h<=48; h++) {
  samples.push(new Date(Date.parse("2026-10-08T00:00:00Z")+h*3600000).toISOString());
}

let best=null;
for (const readTime of samples) {
  for (const app of apps) {
    const res=await fetch(base+"/documents:batchGet",{
      method:"POST",headers:hdr,
      body:JSON.stringify({documents:[pathFor(app)],readTime})
    });
    const body=await res.json();
    if (!res.ok) {
      console.log("READ_ERROR",app,readTime,body?.error?.message||res.status);
      continue;
    }
    const item=(body.responses||[])[0];
    const s=info(item);
    const score=s.transactions+s.cards+s.cardPurchases+s.investments+s.goals+s.netWorthHistory;
    if (score>0 && s.profiles>=2) {
      console.log("FOUND",app,readTime,JSON.stringify(s));
      if(!best || readTime>best.readTime || (readTime===best.readTime && score>best.score)) {
        best={app,readTime,score,summary:s,fields:item.found.fields};
      }
    }
  }
}
if (!best) {
  console.log("FOUND_NONE");
  process.exit(0);
}
console.log("BEST",JSON.stringify({app:best.app,readTime:best.readTime,summary:best.summary}));
