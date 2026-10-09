const source = await fetch("https://raw.githubusercontent.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/main/src/App.jsx").then(r=>r.text());
const key = source.match(/apiKey:\s*"([^"]+)"/)?.[1];
const project = source.match(/projectId:\s*"([^"]+)"/)?.[1];
const auth = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key="+key,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true})}).then(r=>r.json());
const headers={Authorization:"Bearer "+auth.idToken};
const base="https://firestore.googleapis.com/v1/projects/"+project+"/databases/(default)/documents/";
for(const app of ["fluxo-casal-producao","fluxo-casal-compartilhado-oficial-2026","fluxo-casal-compartilhado-oficial"]){
 const url=base+"artifacts/"+app+"/public/data/finances/shared_state";
 const r=await fetch(url,{headers}); const b=await r.json();
 console.log(app,r.status,"updateTime="+(b.updateTime||""));
}
