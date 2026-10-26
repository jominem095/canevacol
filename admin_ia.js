/* CANEVA admin · Registrar con IA + Libretas (v2: lectura en vivo mientras escribes, prompts guardados, recordatorios con fecha y hora que suenan en el celular)
   A floating ✨ button on every tab: write or dictate what you want to register; Caneva AI proposes editable cards
   (proveedor, compra, pedido bajo pedido, prenda nueva, respuesta de WhatsApp, or a free "Libreta" entry) and nothing
   is saved until you tap "Registrar". Libretas keeps the free notes (gastos, ideas, citas, clientas VIP…) as tables.
   Loaded by admin_movil.html: needs API_BASE and the admin token in localStorage. */
(function(){
  if(window.CanevaIA)return;
  function base(){try{return API_BASE;}catch(e){return "https://caneva-ai.canevacol.workers.dev";}}
  function tok(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function norm(t){return String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();}
  function api(path,opt){opt=opt||{};return fetch(base()+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":tok()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function toast(t){var d=document.createElement("div");d.className="ia-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2800);}
  var T={supplier:["🤝","Proveedor"],purchase:["🧾","Compra a proveedor"],made:["🧵","Pedido bajo pedido"],product:["👗","Prenda nueva"],reply:["💬","Respuesta de WhatsApp"],record:["📒","Libreta"]};
  var LABEL={name:"Nombre",kind:"Tipo",contact:"Contacto",phone:"Celular",city:"Ciudad",categories:"Categorías",leadDays:"Días de entrega",terms:"Condiciones",notes:"Notas",
    supplier:"Proveedor",desc:"Descripción",total:"Valor total",paid:"Pagado",dueAt:"Fecha",prenda:"Prenda",size:"Talla",deposit:"Abono",measures:"Medidas",
    nombre:"Nombre",categoria:"Categoría",precio:"Precio",tallas:"Tallas",descripcion:"Descripción",tela:"Tela",title:"Título",cat:"Categoría",text:"Mensaje",collection:"Libreta",icon:"Ícono"};
  var EX=["Registra a Telas El Prado, 300 123 4567, me surte satín y lino","Le compré a Doña Rosa confección de 3 vestidos por 450 mil, le di 200","Laura pidió un vestido atelier talla M por 380 mil, abonó 150, para el 15 de noviembre","Prenda nueva: Body Luna, categoría bodies, 85 mil, tallas S-M-L","Anota gasto: bolsas y etiquetas 45 mil","Idea de contenido: video probándome el set deportivo en la playa"];
  var S={acts:[],hist:[],busy:false,prompts:null,text:""};
  // ---------- live reading while she types (no AI call: instant) ----------
  var DOW=["domingo","lunes","martes","miercoles","jueves","viernes","sabado"],MON=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  function fl(t){return String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function parseWhen(text){var t=" "+fl(text)+" ",now=new Date(),d=null,m;
    if(/pasado manana/.test(t)){d=new Date(now);d.setDate(d.getDate()+2);}
    else if(/ manana /.test(t.replace(/[.,!?]/g," "))&&!/(en|por) la manana/.test(t)){d=new Date(now);d.setDate(d.getDate()+1);}
    else if(/ hoy | esta (tarde|noche|manana)/.test(t)){d=new Date(now);}
    if(!d&&(m=t.match(/en (\d+|un|una|media) (minutos?|horas?|dias?|semanas?)/))){var n=m[1]==="un"||m[1]==="una"?1:m[1]==="media"?.5:+m[1],u=m[2];d=new Date(now.getTime()+n*(/min/.test(u)?6e4:/hora/.test(u)?36e5:/dia/.test(u)?864e5:6048e5));return {d:d,time:/min|hora/.test(u)};}
    if(!d)DOW.forEach(function(w,i){if(!d&&new RegExp("(el|este|proximo|pr[oó]ximo|para el) "+w+"|^ "+w+" ").test(t)){d=new Date(now);var add=(i-now.getDay()+7)%7||7;d.setDate(d.getDate()+add);}});
    if(!d&&(m=t.match(/(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/))){var mo=isNaN(+m[2])?MON.indexOf(m[2]):+m[2]-1;d=new Date(now.getFullYear(),mo,+m[1]);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d.setFullYear(d.getFullYear()+1);}
    if(!d&&(m=t.match(/el (\d{1,2})(?!\s*(?::|am|pm|de la|mil|k))\b/))){d=new Date(now.getFullYear(),now.getMonth(),+m[1]);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d.setMonth(d.getMonth()+1);}
    var h=null,mi=0;
    if((m=t.match(/(\d{1,2})[:.](\d{2})\s*(am|pm|a\.?\s?m|p\.?\s?m)?/))){h=+m[1];mi=+m[2];if(m[3]&&/p/.test(m[3])&&h<12)h+=12;if(m[3]&&/a/.test(m[3])&&h===12)h=0;}
    else if((m=t.match(/(?:a las|a la|tipo|las) (\d{1,2})(?:\s*(am|pm|de la (manana|tarde|noche)))?/))||(m=t.match(/(\d{1,2})\s*(am|pm)/))){h=+m[1];var suf=(m[2]||"")+" "+(m[3]||"");if(/pm|tarde|noche/.test(suf)&&h<12)h+=12;else if(/am|manana/.test(suf)){if(h===12)h=0;}else if(h>=1&&h<=6)h+=12;}
    else if(/mediodia/.test(t))h=12;else if(/en la noche|esta noche/.test(t))h=19;else if(/en la tarde|esta tarde/.test(t))h=15;else if(/(en|por) la manana/.test(t))h=9;
    if(!d&&h!==null){d=new Date(now);if(h*60+mi<=now.getHours()*60+now.getMinutes())d.setDate(d.getDate()+1);}
    if(!d)return null;d.setHours(h===null?9:h,h===null?0:mi,0,0);return {d:d,time:h!==null};}
  function parseMoney(text){var out=[],m,re=/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(mil|k|millones?|palos?|lucas?)?/gi,t=fl(text).replace(/(?:\+?57\s?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}/g," ").replace(/\d{1,2}[:.]\d{2}/g," ");
    while((m=re.exec(t))){var raw=m[1],u=m[2]||"",n;if(/[.,]\d{3}/.test(raw)&&!u)n=+raw.replace(/[.,]/g,"");else n=parseFloat(raw.replace(",","."));
      if(/mil|k|luca/.test(u))n*=1000;else if(/millon|palo/.test(u))n*=1e6;else if(n<1000)continue;if(n>=1000&&n<1e9&&!/^3\d{9}$/.test(String(n)))out.push(Math.round(n));}return out.slice(0,3);}
  function parsePhone(text){var m=String(text||"").replace(/[\s-]/g,"").match(/(?:\+?57)?(3\d{9})/);return m?m[1]:"";}
  var KINDS=[[/recuerd|avisa|no (se me )?olvid|tengo que|debo |pendiente|cita|llamar a|escribirle/,"🔔","Recordatorio"],[/gast|pague|pagu[eé] |compre (bolsas|etiquetas|cinta)|domicilio de|taxi|publicidad|pauta/,"💸","Gasto"],
    [/proveedor|me surte|registra a|taller de/,"🤝","Proveedor"],[/le compre a|le debo a|le pague a|abono a .* proveedor/,"🧾","Compra a proveedor"],[/pidio|encargo|abono|aparto|atelier|confeccion|medidas/,"🧵","Pedido bajo pedido"],
    [/prenda nueva|nueva prenda|subir prenda|producto nuevo/,"👗","Prenda nueva"],[/respuesta|mensaje para|plantilla|cuando me pregunten/,"💬","Respuesta de WhatsApp"],[/idea|contenido|reel|tiktok|historia de|post/,"💡","Idea"],[/clienta vip|vip/,"👑","Clienta VIP"]];
  function parseKind(text){var t=fl(text);for(var i=0;i<KINDS.length;i++)if(KINDS[i][0].test(t))return {i:KINDS[i][1],l:KINDS[i][2]};return null;}
  function fmtWhen(w){if(!w)return "";var d=w.d,now=new Date(),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),dd=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-t0)/864e5);
    var day=dd===0?"hoy":dd===1?"mañana":dd===2?"pasado mañana":d.toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"short"});
    return day+(w.time?" a las "+d.toLocaleTimeString("es-CO",{hour:"numeric",minute:"2-digit"}):" (9:00 a. m.)");}
  function rel(ms){var a=Math.abs(ms),m=Math.round(a/6e4),h=Math.floor(m/60),d=Math.floor(h/24);var s=d>=1?d+" día"+(d>1?"s":""):h>=1?h+" h"+(m%60?" "+m%60+" min":""):m+" min";return ms>=0?"en "+s:"hace "+s;}
  function liveHtml(text){
    if(!String(text||"").trim())return "";
    var k=parseKind(text),w=parseWhen(text),mo=parseMoney(text),ph=parsePhone(text),chips=[];
    if(k)chips.push('<span class="ia-lc k">'+k.i+' '+k.l+'</span>');
    if(w)chips.push('<span class="ia-lc w">⏰ '+esc(fmtWhen(w))+'</span>');
    mo.forEach(function(n){chips.push('<span class="ia-lc m">💵 '+money(n)+'</span>');});
    if(ph)chips.push('<span class="ia-lc p">📱 '+esc(ph.replace(/(\d{3})(\d{3})(\d{4})/,"$1 $2 $3"))+'</span>');
    var prev="";
    if(w&&(!k||k.l==="Recordatorio"))prev='🔔 Te aviso al celular <b>'+esc(fmtWhen(w))+'</b> <small>('+rel(w.d-Date.now())+')</small>';
    else if(k&&k.l==="Gasto"&&mo.length)prev='💸 Anoto un gasto de <b>'+money(mo[0])+'</b> en tu libreta Gastos';
    else if(k)prev=k.i+' Lo voy a registrar como <b>'+esc(k.l)+'</b>';
    var sug=(S.prompts||[]).filter(function(p){var a=fl(p.t),b=fl(text).trim();return b.length>=3&&a!==b&&a.indexOf(b)>=0;}).slice(0,3);
    return (chips.length?'<div class="ia-lchips">'+chips.join("")+'</div>':'')+(prev?'<div class="ia-lprev">'+prev+'</div>':'')+
      (sug.length?'<div class="ia-lsug">'+sug.map(function(p){return '<button type="button" data-usep="'+esc(p.t)+'">↩ '+esc(p.t)+'</button>';}).join("")+'</div>':'');}
  function loadPrompts(){return api("/admin/ai/prompts").then(function(d){S.prompts=d.prompts||[];return S.prompts;}).catch(function(){S.prompts=S.prompts||[];return S.prompts;});}
  function promptChips(){var P=(S.prompts||[]).slice(0,12);if(!P.length)return "";
    return '<div class="ia-pl">🕘 Tus prompts</div><div class="ia-ex ia-pr">'+P.map(function(p){return '<button type="button" data-usep="'+esc(p.t)+'" title="'+esc(p.t)+'">'+(p.pin?'⭐ ':'')+esc(p.t)+'</button>';}).join("")+'</div>';}

  function css(){if(document.getElementById("ia-css"))return;var s=document.createElement("style");s.id="ia-css";s.textContent=
    ".ia-fab{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:9000;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;font-size:24px;color:#050505;background:conic-gradient(from var(--iaa,0deg),#cfe6ff,#e6dcff,#ffffff,#8ef0c8,#cfe6ff);box-shadow:0 12px 34px rgba(0,0,0,.55),0 0 30px rgba(207,230,255,.35);animation:iaSpin 6s linear infinite}"+
    "@property --iaa{syntax:'<angle>';initial-value:0deg;inherits:false}@keyframes iaSpin{to{--iaa:360deg}}"+
    "body[style*=\"overflow: hidden\"] .ia-fab{display:none}.ia-fab span{position:absolute;inset:4px;border-radius:50%;background:#0b0b0d;color:#fff;display:grid;place-items:center}"+
    ".ia-ov{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center}@media(min-width:760px){.ia-ov{align-items:center}}"+
    ".ia-sh{width:min(620px,100%);max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#121215,#070708);border:1px solid rgba(207,230,255,.35);color:#f6f7f8;font-family:Inter,system-ui,sans-serif;animation:iaUp .25s}@media(min-width:760px){.ia-sh{border-radius:24px}}@keyframes iaUp{from{transform:translateY(30px);opacity:0}}"+
    ".ia-hd{display:flex;align-items:center;gap:10px}.ia-hd h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:26px}.ia-hd button{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(246,247,248,.25);background:none;color:#fff;font-size:18px;cursor:pointer}"+
    ".ia-sub{font-size:13px;color:rgba(246,247,248,.65);margin:4px 0 10px}"+
    ".ia-in{display:flex;gap:8px;align-items:flex-end}.ia-in textarea{flex:1;min-height:70px;background:#050505;border:1px solid rgba(207,230,255,.35);border-radius:16px;color:#fff;padding:12px;font:15px/1.4 Inter,sans-serif;resize:vertical}"+
    ".ia-in button{width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;font-size:18px}.ia-mic{background:rgba(255,255,255,.1);color:#fff}.ia-mic.rec{background:#ff4d6d;animation:iaPulse 1s infinite}@keyframes iaPulse{50%{box-shadow:0 0 0 8px rgba(255,77,109,.25)}}.ia-go{background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505}"+
    ".ia-ex{display:flex;gap:6px;overflow-x:auto;margin:10px 0 4px;scrollbar-width:none}.ia-ex::-webkit-scrollbar{display:none}.ia-ex button{flex:0 0 auto;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid rgba(246,247,248,.18);background:#121214;color:#f6f7f8;border-radius:999px;padding:7px 11px;font-size:12px;cursor:pointer}"+
    ".ia-rep{margin:12px 0;padding:12px;border-radius:16px;background:linear-gradient(135deg,rgba(159,211,255,.08),rgba(201,167,255,.08));border:1px solid rgba(207,230,255,.25);font-size:14px;line-height:1.45}"+
    ".ia-card{border-radius:18px;padding:12px;margin:10px 0;background:#0e0e10;border:1px solid rgba(246,247,248,.14)}.ia-card.done{border-color:rgba(142,240,200,.6);opacity:.75}.ia-ch{display:flex;align-items:center;gap:8px;font-weight:700}.ia-ch small{font-weight:400;color:rgba(246,247,248,.6)}"+
    ".ia-f{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.ia-f label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(246,247,248,.5)}.ia-f input,.ia-f textarea{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.18);border-radius:10px;color:#fff;padding:8px 9px;font:13.5px Inter,sans-serif;margin-top:3px}.ia-f .w{grid-column:1/-1}"+
    ".ia-act{display:flex;gap:6px;margin-top:10px}.ia-act button{border:0;border-radius:999px;padding:9px 14px;font:800 12px Inter,sans-serif;cursor:pointer}.ia-ok{background:#8ef0c8;color:#04140a}.ia-no{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.25)!important}"+
    ".ia-all{width:100%;margin-top:6px;border:0;border-radius:999px;padding:13px;font:800 14px Inter,sans-serif;background:linear-gradient(120deg,#8ef0c8,#cfe6ff);color:#04140a;cursor:pointer}"+
    ".ia-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#f6f7f8;color:#050505;border-radius:999px;padding:10px 16px;font:600 13px Inter,sans-serif;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.5)}"+
    ".ia-live{min-height:0;transition:all .2s}.ia-lchips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.ia-lc{font-size:12px;font-weight:700;border-radius:999px;padding:5px 10px;animation:iaPop .25s cubic-bezier(.2,.9,.3,1.4);border:1px solid}"+
    "@keyframes iaPop{from{transform:scale(.6);opacity:0}}.ia-lc.k{color:#d9c9ff;border-color:rgba(201,167,255,.45);background:rgba(201,167,255,.1)}.ia-lc.w{color:#ffe7a8;border-color:rgba(255,231,168,.5);background:rgba(255,231,168,.1)}.ia-lc.m{color:#8ef0c8;border-color:rgba(142,240,200,.45);background:rgba(142,240,200,.08)}.ia-lc.p{color:#cfe6ff;border-color:rgba(207,230,255,.45);background:rgba(207,230,255,.08)}"+
    ".ia-lprev{margin-top:8px;padding:10px 12px;border-radius:14px;font-size:13px;background:linear-gradient(120deg,rgba(255,231,168,.1),rgba(201,167,255,.08));border:1px dashed rgba(255,231,168,.4)}.ia-lprev small{opacity:.7}"+
    ".ia-lsug{display:flex;flex-direction:column;gap:4px;margin-top:8px}.ia-lsug button{text-align:left;border:0;background:rgba(255,255,255,.05);color:#f6f7f8;border-radius:10px;padding:8px 10px;font-size:12.5px;cursor:pointer}"+
    ".ia-pl{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,247,248,.5);margin:12px 0 0}.ia-pr button{border-color:rgba(255,231,168,.3)}"+
    ".ia-due{grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(255,231,168,.08);border:1px solid rgba(255,231,168,.35)}.ia-due input{flex:1;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:7px 8px;font:13.5px Inter,sans-serif;color-scheme:dark}"+
    /* Libretas */
    ".lb{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}.lb-hero{border-radius:24px;padding:18px;margin:4px 0 12px;background:radial-gradient(500px 240px at 0% 0%,rgba(142,240,200,.14),transparent 60%),#0c0c0e;border:1px solid rgba(142,240,200,.3)}"+
    ".lb-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px}.lb-hero p{margin:4px 0 12px;font-size:13px;color:rgba(246,247,248,.7)}.lb-hero button{border:0;border-radius:999px;padding:11px 16px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505;cursor:pointer}"+
    ".lb-c{border-radius:20px;padding:14px;margin:12px 0;background:#0e0e10;border:1px solid rgba(246,247,248,.12)}.lb-h{display:flex;align-items:center;gap:8px}.lb-h b{font-size:16px}.lb-h small{color:rgba(246,247,248,.55)}.lb-h .r{margin-left:auto;display:flex;gap:6px}"+
    ".lb-h .r button{border:1px solid rgba(246,247,248,.2);background:none;color:#f6f7f8;border-radius:999px;padding:6px 10px;font-size:11.5px;cursor:pointer}.lb-sum{margin:6px 0;font-size:13px;color:#8ef0c8}"+
    ".lb-tw{overflow-x:auto;margin-top:8px}.lb-t{width:100%;border-collapse:collapse;font-size:12.5px}.lb-t th{text-align:left;font-weight:600;color:rgba(246,247,248,.55);padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap}.lb-t td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:top}"+
    ".lb-t td button{border:0;background:none;color:rgba(246,247,248,.5);cursor:pointer}.lb-t td button:hover{color:#ffb4a8}.lb-empty{padding:30px 10px;text-align:center;color:rgba(246,247,248,.65)}"+
    ".ia-ov2{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px}.ia-dlg{width:min(380px,100%);border-radius:22px;padding:20px;background:#121214;border:1px solid rgba(255,120,100,.45);text-align:center;color:#f6f7f8;font-family:Inter,sans-serif}.ia-dlg h3{margin:6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:24px}.ia-dlg p{font-size:13px;color:rgba(246,247,248,.75)}.ia-dlg .row{display:flex;gap:8px}.ia-dlg button{flex:1;border:0;border-radius:999px;padding:12px;font:800 13px Inter,sans-serif;cursor:pointer}.ia-dlg .no{background:none;color:#fff;border:1px solid rgba(246,247,248,.3)}.ia-dlg .yes{background:#ff6b5e;color:#fff}";
    document.head.appendChild(s);}
  function ask(title,text,ok){return new Promise(function(res){var ov=document.createElement("div");ov.className="ia-ov2";ov.innerHTML='<div class="ia-dlg"><div style="font-size:36px">🗑</div><h3>'+esc(title)+'</h3><p>'+text+'</p><div class="row"><button type="button" class="no">Cancelar</button><button type="button" class="yes">'+esc(ok||"Sí, borrar")+'</button></div></div>';document.body.appendChild(ov);var done=function(v){ov.remove();res(v);};ov.querySelector(".no").onclick=function(){done(false);};ov.querySelector(".yes").onclick=function(){done(true);};});}

  // ---------- sheet ----------
  function open(pre,auto){
    css();close();var ov=document.createElement("div");ov.className="ia-ov";ov.id="iaOv";
    ov.innerHTML='<div class="ia-sh"><div class="ia-hd"><span style="font-size:24px">✨</span><h2>Registrar con IA</h2><button type="button" data-x aria-label="Cerrar">×</button></div>'+
      '<div class="ia-sub">Escríbelo o díctalo como se lo dirías a una asistente: un proveedor, una compra, un pedido, una prenda nueva, un gasto, una idea… lo que sea. Te muestro lo que entendí y tú confirmas.</div>'+
      '<div class="ia-in"><textarea id="iaTx" placeholder="Ej: le compré a Doña Rosa 3 vestidos por 450 mil y le di 200"></textarea><div style="display:flex;flex-direction:column;gap:6px"><button type="button" class="ia-mic" id="iaMic" title="Dictar">🎤</button><button type="button" class="ia-go" id="iaGo" title="Enviar">➤</button></div></div>'+
      '<div class="ia-live" id="iaLive"></div><div id="iaPrompts">'+promptChips()+'</div>'+
      '<div class="ia-pl">💡 Ejemplos</div><div class="ia-ex">'+EX.map(function(e){return '<button type="button" data-ex>'+esc(e)+'</button>';}).join("")+'</div><div id="iaOut"></div></div>';
    document.body.appendChild(ov);
    var tx=ov.querySelector("#iaTx");if(pre)tx.value=pre;setTimeout(function(){tx.focus();},200);
    var lv=ov.querySelector("#iaLive"),paintLive=function(){S.text=tx.value;lv.innerHTML=liveHtml(tx.value);};paintLive();
    tx.addEventListener("input",paintLive);
    loadPrompts().then(function(){var pp=ov.querySelector("#iaPrompts");if(pp)pp.innerHTML=promptChips();paintLive();});
    ov.addEventListener("click",function(e){
      if(e.target===ov||e.target.closest("[data-x]")){close();return;}
      var ex=e.target.closest("[data-ex]");if(ex){tx.value=ex.textContent;tx.focus();paintLive();return;}
      var up=e.target.closest("[data-usep]");if(up){tx.value=up.dataset.usep;tx.focus();paintLive();return;}
      if(e.target.closest("#iaGo")){send(tx.value);return;}
      if(e.target.closest("#iaMic")){mic(e.target.closest("#iaMic"),tx);return;}
      var ok=e.target.closest("[data-ok]");if(ok){run(+ok.dataset.ok);return;}
      var no=e.target.closest("[data-no]");if(no){var c=no.closest(".ia-card");if(c)c.remove();S.acts[+no.dataset.no]=null;return;}
      if(e.target.closest("[data-all]")){runAll();return;}
    });
    tx.addEventListener("keydown",function(e){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))send(tx.value);});
    if(auto&&pre)setTimeout(function(){send(pre);},80);
  }
  function close(){var o=document.getElementById("iaOv");if(o)o.remove();}
  function mic(btn,tx){var R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast("Tu navegador no permite dictar aquí: usa el micrófono del teclado");return;}
    var r=new R();r.lang="es-CO";r.interimResults=true;btn.classList.add("rec");var base=tx.value?tx.value+" ":"";
    r.onresult=function(ev){var t="";for(var i=0;i<ev.results.length;i++)t+=ev.results[i][0].transcript;tx.value=base+t;tx.dispatchEvent(new Event("input"));};r.onend=function(){btn.classList.remove("rec");};r.onerror=function(){btn.classList.remove("rec");};r.start();}
  function send(text){
    text=String(text||"").trim();if(!text||S.busy)return;S.busy=true;var out=document.getElementById("iaOut");out.innerHTML='<div class="ia-rep">✨ Entendiendo…</div>';
    api("/admin/ai/act",{method:"POST",body:{message:text,history:S.hist}}).then(function(d){
      S.hist=S.hist.concat([{role:"user",text:text},{role:"model",text:d.reply||""}]).slice(-6);S.acts=d.actions||[];S.sups=d.suppliers||[];
      out.innerHTML='<div class="ia-rep">'+esc(d.reply||"Esto es lo que entendí:")+'</div>'+S.acts.map(cardHtml).join("")+(S.acts.length>1?'<button type="button" class="ia-all" data-all>✓ Registrar todo ('+S.acts.length+')</button>':'');
    }).catch(function(e){out.innerHTML='<div class="ia-rep">⚠️ '+esc(e.message)+(/404|Ruta|actualizar/i.test(e.message)?'<br>Pega el Worker v88 en Cloudflare.':'')+'</div>';}).then(function(){S.busy=false;});
  }
  function fieldsOf(a){var d=a.data||{};if(a.type==="record"){return [["collection",d.collection||""],["icon",d.icon||"📒"]].concat(Object.keys(d.fields||{}).map(function(k){return ["f:"+k,d.fields[k]];}));}
    return Object.keys(d).map(function(k){var v=d[k];return [k,Array.isArray(v)?v.join(", "):v];});}
  function pad(n){return String(n).padStart(2,"0");}
  function localVal(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
  function dueOf(a){var f=(a.data&&a.data.fields)||{},d="",h="";Object.keys(f).forEach(function(k){var kk=fl(k),v=String(f[k]||"");if(!d&&/fecha|dia|cuando|cita|vence/.test(kk)){var m=v.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)d=m[1]+"-"+pad(m[2])+"-"+pad(m[3]);}if(!h&&/hora/.test(kk)){var t=v.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m|p\.?\s?m)?/i);if(t){var hh=+t[1];if(t[3]&&/p/i.test(t[3])&&hh<12)hh+=12;h=pad(hh)+":"+(t[2]||"00");}}});
    if(d)return d+"T"+(h||"09:00");var w=parseWhen(S.text);return w?localVal(w.d):"";}
  function cardHtml(a,i){var t=T[a.type]||["•",a.type];var due=a.type==="record"?dueOf(a):"";
    return '<div class="ia-card" data-i="'+i+'"><div class="ia-ch">'+t[0]+' '+t[1]+(a.summary?' <small>· '+esc(a.summary)+'</small>':'')+'</div><div class="ia-f">'+fieldsOf(a).map(function(f){var k=f[0],lab=k.indexOf("f:")===0?k.slice(2):(LABEL[k]||k),long=/text|notes|measures|descripcion|desc/.test(k)||String(f[1]||"").length>40;
      return '<div class="'+(long?'w':'')+'"><label>'+esc(lab)+'</label>'+(long?'<textarea data-k="'+esc(k)+'" rows="2">'+esc(f[1]==null?"":f[1])+'</textarea>':'<input data-k="'+esc(k)+'" value="'+esc(f[1]==null?"":f[1])+'">')+'</div>';}).join("")+
      (a.type==="record"?'<label class="ia-due"><span>⏰ Avisarme al celular</span><input type="datetime-local" data-due value="'+esc(due)+'"></label>':'')+'</div>'+
      '<div class="ia-act"><button type="button" class="ia-ok" data-ok="'+i+'">✓ Registrar</button><button type="button" class="ia-no" data-no="'+i+'">Descartar</button></div></div>';}
  function readCard(i){var c=document.querySelector('.ia-card[data-i="'+i+'"]'),a=S.acts[i];if(!c||!a)return null;var d={},fields={};
    c.querySelectorAll("[data-k]").forEach(function(el){var k=el.dataset.k,v=el.value.trim();if(k.indexOf("f:")===0){if(v)fields[k.slice(2)]=/^\d+$/.test(v)?Number(v):v;}else d[k]=v;});
    if(a.type==="record"){d.fields=fields;var du=c.querySelector("[data-due]");d.due=du&&du.value?new Date(du.value).toISOString():"";}return {type:a.type,data:d,el:c};}
  function num(v){var t=String(v||""),n=parseInt(t.replace(/[^\d]/g,""),10)||0;if(n&&n<1000&&/mil|k\b/i.test(t))n*=1000;return n;}
  function exec(x){var d=x.data;
    if(x.type==="supplier")return api("/admin/suppliers",{method:"POST",body:{action:"save",supplier:Object.assign({},d,{categories:String(d.categories||"").split(/\s*,\s*/).filter(Boolean)})}}).then(function(){return "🤝 Proveedor "+d.name+" registrado";});
    if(x.type==="purchase")return api("/admin/suppliers").then(function(s){var sp=(s.suppliers||[]).filter(function(p){return norm(p.name)===norm(d.supplier);})[0]||(s.suppliers||[]).filter(function(p){return norm(p.name).indexOf(norm(d.supplier))>=0||norm(d.supplier).indexOf(norm(p.name))>=0;})[0];
      if(!sp)throw new Error("No encuentro al proveedor \""+d.supplier+"\". Regístralo primero.");
      return api("/admin/suppliers",{method:"POST",body:{action:"purchase",purchase:{supplierId:sp.id,desc:d.desc,total:num(d.total),paid:num(d.paid),dueAt:d.dueAt}}}).then(function(){return "🧾 Compra a "+sp.name+" registrada";});});
    if(x.type==="made")return api("/admin/made/note",{method:"POST",body:{name:d.name,phone:d.phone,prenda:d.prenda,kind:d.kind,size:d.size,total:num(d.total),deposit:num(d.deposit),dueAt:d.dueAt,measures:d.measures,notes:d.notes}}).then(function(){return "🧵 Pedido de "+d.name+" anotado en el taller";});
    if(x.type==="product"){if(!window.cvNewProduct)return Promise.reject(new Error("Abre la pestaña Productos"));close();window.cvNewProduct(d);return Promise.resolve("👗 Revisa la prenda, ponle la foto y publícala");}
    if(x.type==="reply")return api("/admin/replies").then(function(r){var l=r.list||[];l.unshift({id:"m"+Date.now().toString(36),cat:d.cat||"Mías",title:d.title,text:d.text});return api("/admin/replies",{method:"POST",body:{list:l}});}).then(function(){return "💬 Respuesta guardada en Respuestas";});
    if(x.type==="record")return api("/admin/records",{method:"POST",body:{action:"add",collection:d.collection,icon:d.icon,fields:d.fields,due:d.due||undefined,prompt:S.text}}).then(function(){return (d.icon||"📒")+(d.due?" Listo: te aviso "+fmtWhen({d:new Date(d.due),time:true}):" Anotado en la libreta "+d.collection);});
    return Promise.reject(new Error("Tipo desconocido"));}
  function refresh(){var vis=function(id){var e=document.getElementById(id);return e&&e.firstChild;};try{if(window.CanevaProveedores&&vis("pvBody"))CanevaProveedores.reload();}catch(e){}try{if(window.CanevaMade&&vis("mkBody"))CanevaMade.reload();}catch(e){}try{if(window.CanevaLibretas&&L.el)CanevaLibretas.reload();}catch(e){}}
  function run(i){var x=readCard(i);if(!x)return Promise.resolve();var b=x.el.querySelector("[data-ok]");if(b){b.disabled=true;b.textContent="Guardando…";}
    return exec(x).then(function(m){toast("✓ "+m);x.el.classList.add("done");x.el.querySelector(".ia-act").innerHTML='<span style="color:#8ef0c8;font-weight:700">✓ Registrado</span>';S.acts[i]=null;refresh();})
      .catch(function(e){if(b){b.disabled=false;b.textContent="✓ Registrar";}toast("⚠️ "+e.message);throw e;});}
  function runAll(){var idx=S.acts.map(function(a,i){return a?i:-1;}).filter(function(i){return i>=0;});var p=Promise.resolve();idx.forEach(function(i){p=p.then(function(){return run(i).catch(function(){});});});}

  // ---------- Libretas v2: live reminders, editable date and time, prompts ----------
  var L={el:null,cols:[],timer:0,poll:0,editing:"",showDone:{}};
  function isRem(c){return /recordat|pendient|cita|tarea|agenda|llamad/.test(fl(c.name))||(c.items||[]).some(function(i){return i.due;});}
  function txtKey(f){var ks=Object.keys(f||{});return ks.find(function(x){return /tarea|recordar|pendiente|nota|que|asunto|idea|concepto|titulo|nombre/.test(fl(x));})||ks.find(function(x){return typeof f[x]==="string"&&!/fecha|hora/.test(fl(x));})||"";}
  function itemText(it){var k=txtKey(it.fields);return k?String(it.fields[k]):"";}
  function dayKey(d){return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();}
  function group(it){if(it.done)return "hechos";if(!it.due)return "sinfecha";var d=new Date(it.due),now=new Date();if(d<now)return "atrasados";
    if(dayKey(d)===dayKey(now))return "hoy";var t=new Date(now);t.setDate(t.getDate()+1);if(dayKey(d)===dayKey(t))return "manana";if(d-now<7*864e5)return "semana";return "despues";}
  var GROUPS=[["atrasados","⚠️ Atrasados"],["hoy","☀️ Hoy"],["manana","🌙 Mañana"],["semana","📅 Esta semana"],["despues","🗓 Más adelante"],["sinfecha","📝 Sin fecha"],["hechos","✅ Hechos"]];
  function whenTxt(it){if(!it.due)return "";var d=new Date(it.due);return d.toLocaleDateString("es-CO",{weekday:"short",day:"numeric",month:"short"})+" · "+d.toLocaleTimeString("es-CO",{hour:"numeric",minute:"2-digit"});}
  function stTxt(it){if(it.done)return "✓ Hecho"+(it.doneAt?" · "+new Date(it.doneAt).toLocaleDateString("es-CO",{day:"numeric",month:"short"}):"");if(!it.due)return "Sin aviso";var ms=Date.parse(it.due)-Date.now();
    return it.notifiedAt?"📲 Te avisé "+rel(Date.parse(it.notifiedAt)-Date.now()):ms<0?"⚠️ Venció "+rel(ms):"🔔 Te aviso "+rel(ms);}
  function lbCss(){if(document.getElementById("lb2-css"))return;var s=document.createElement("style");s.id="lb2-css";s.textContent=
    ".lb2{padding:4px 0 110px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif;max-width:980px;margin:0 auto}"+
    ".lb2-hero{position:relative;overflow:hidden;border-radius:26px;padding:20px;margin:4px 0 14px;background:radial-gradient(600px 260px at 100% 0%,rgba(255,231,168,.16),transparent 60%),radial-gradient(500px 240px at 0% 100%,rgba(142,240,200,.12),transparent 60%),#0b0b0d;border:1px solid rgba(255,231,168,.3)}"+
    ".lb2-hero:before{content:'';position:absolute;inset:-40%;background:conic-gradient(from var(--lba,0deg),transparent 0 80%,rgba(255,231,168,.08) 90%,transparent);animation:lbSpin 12s linear infinite;pointer-events:none}@property --lba{syntax:'<angle>';initial-value:0deg;inherits:false}@keyframes lbSpin{to{--lba:360deg}}"+
    ".lb2-top{position:relative;display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap}.lb2-clock{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;font-size:56px;line-height:.9;letter-spacing:-.01em}.lb2-clock small{font-size:22px;opacity:.6;margin-left:4px}.lb2-date{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:#ffe7a8;margin-top:6px}"+
    ".lb2-next{position:relative;flex:1;min-width:220px;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}.lb2-next small{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,247,248,.55)}.lb2-next b{display:block;font-size:15px;margin-top:4px}.lb2-next em{font-style:normal;color:#ffe7a8;font-weight:800;font-size:22px;display:block;margin-top:2px}"+
    ".lb2-pills{position:relative;display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 0}.lb2-pills span{font-size:12px;border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}.lb2-pills .bad{color:#ffb4a8;border-color:rgba(255,120,100,.4)}"+
    ".lb2-comp{position:relative;margin-top:14px;border-radius:18px;padding:3px;background:conic-gradient(from var(--iaa,0deg),#cfe6ff,#e6dcff,#ffe7a8,#8ef0c8,#cfe6ff);animation:iaSpin 6s linear infinite}.lb2-comp>div{display:flex;gap:6px;align-items:center;background:#08080a;border-radius:16px;padding:6px 6px 6px 12px}"+
    ".lb2-comp input{flex:1;min-width:0;background:none;border:0;color:#fff;font:15px Inter,sans-serif;padding:8px 0;outline:none}.lb2-comp button{border:0;border-radius:12px;padding:10px 14px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505;cursor:pointer}.lb2-comp .mic{background:rgba(255,255,255,.1);color:#fff;padding:10px 12px}"+
    ".lb2-push{position:relative;margin-top:10px;font-size:12px;color:rgba(246,247,248,.75)}.lb2-push button{width:100%;border:0;border-radius:999px;padding:11px;font:800 13px Inter,sans-serif;background:#25d366;color:#04140a;cursor:pointer;margin-top:4px}"+
    ".lb2-c{border-radius:22px;padding:14px;margin:14px 0;background:linear-gradient(180deg,#111114,#0a0a0c);border:1px solid rgba(246,247,248,.1)}.lb2-h{display:flex;align-items:center;gap:10px}.lb2-h .ic{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:rgba(255,255,255,.06)}.lb2-h b{font-size:16.5px}.lb2-h small{display:block;color:rgba(246,247,248,.55);font-size:12px}"+
    ".lb2-h .r{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.lb2-h .r button{border:1px solid rgba(246,247,248,.2);background:none;color:#f6f7f8;border-radius:999px;padding:6px 10px;font-size:11.5px;cursor:pointer}"+
    ".lb2-g{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,247,248,.5);margin:14px 2px 6px;display:flex;align-items:center;gap:8px}.lb2-g:after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}.lb2-g.bad{color:#ffb4a8}"+
    ".lr{position:relative;display:grid;grid-template-columns:34px 1fr;gap:10px;padding:12px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);margin:6px 0;transition:all .25s}.lr.late{border-color:rgba(255,120,100,.45);background:rgba(255,120,100,.06)}.lr.soon{border-color:rgba(255,231,168,.55);box-shadow:0 0 0 1px rgba(255,231,168,.15),0 0 24px rgba(255,231,168,.08)}.lr.done{opacity:.55}.lr.done .t{text-decoration:line-through}"+
    ".lr .ck{width:30px;height:30px;border-radius:50%;border:2px solid rgba(246,247,248,.35);background:none;color:transparent;font-size:15px;cursor:pointer;transition:all .2s}.lr .ck:hover{border-color:#8ef0c8}.lr.done .ck{background:#8ef0c8;border-color:#8ef0c8;color:#04140a;animation:iaPop .35s}"+
    ".lr .t{font-size:15px;font-weight:600;line-height:1.3;cursor:text;outline:none;border-radius:6px}.lr .t[contenteditable=true]{background:rgba(207,230,255,.08);padding:2px 6px;box-shadow:0 0 0 1px rgba(207,230,255,.35)}.lr .ex{font-size:12px;color:rgba(246,247,248,.6);margin-top:3px}"+
    ".lr .m{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.lr .when{position:relative;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700;background:rgba(255,231,168,.1);border:1px solid rgba(255,231,168,.35);color:#ffe7a8;cursor:pointer}"+
    ".lr .when input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;color-scheme:dark}.lr .st{font-size:11.5px;color:rgba(246,247,248,.65)}.lr.late .st{color:#ffb4a8}"+
    ".lr .acts{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}.lr .acts button{border:1px solid rgba(246,247,248,.18);background:none;color:#f6f7f8;border-radius:999px;padding:5px 10px;font-size:11.5px;cursor:pointer}.lr .acts .del{margin-left:auto;color:rgba(246,247,248,.5)}"+
    ".lg{display:grid;gap:8px}.lgi{padding:12px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}.lgi .f{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:13px}.lgi .f span{color:rgba(246,247,248,.55);font-size:11px;display:block}.lgi .f div{min-width:90px}"+
    ".lgi .bar{display:flex;gap:6px;align-items:center;margin-top:8px;font-size:11px;color:rgba(246,247,248,.5)}.lgi .bar button{border:1px solid rgba(246,247,248,.18);background:none;color:#f6f7f8;border-radius:999px;padding:4px 9px;font-size:11px;cursor:pointer}.lgi .bar .r{margin-left:auto;display:flex;gap:5px}"+
    ".lgi form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.lgi form label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(246,247,248,.5)}.lgi form input{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:8px;font:13px Inter,sans-serif;margin-top:3px;color-scheme:dark}.lgi form .w{grid-column:1/-1}.lgi form button{border:0;border-radius:999px;padding:10px;font:800 12.5px Inter,sans-serif;background:#8ef0c8;color:#04140a;cursor:pointer}"+
    ".lb2-sum{margin:8px 2px;font-size:13px;color:#8ef0c8}.lb2-pr{display:flex;flex-direction:column;gap:6px;margin-top:10px}.lb2-pr div{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);font-size:13px}.lb2-pr div p{flex:1;margin:0}.lb2-pr small{opacity:.5;white-space:nowrap}.lb2-pr button{border:0;background:none;color:#f6f7f8;cursor:pointer;font-size:14px;padding:4px}"+
    ".lb2-more{width:100%;margin-top:6px;border:1px dashed rgba(246,247,248,.2);background:none;color:rgba(246,247,248,.7);border-radius:14px;padding:9px;font-size:12px;cursor:pointer}";
    document.head.appendChild(s);}
  function remHtml(c,it){var g=group(it),ms=it.due?Date.parse(it.due)-Date.now():null,soon=!it.done&&ms!==null&&ms>0&&ms<36e5,k=txtKey(it.fields);
    var extra=Object.keys(it.fields||{}).filter(function(x){return x!==k&&!/^(fecha|hora|dia|cuando)$/i.test(fl(x));}).map(function(x){return esc(x)+": "+esc(it.fields[x]);}).join(" · ");
    return '<div class="lr'+(g==="atrasados"?' late':'')+(soon?' soon':'')+(it.done?' done':'')+'" data-id="'+esc(it.id)+'"><button type="button" class="ck" data-done title="Marcar hecho">✓</button><div>'+
      '<div class="t" data-edit title="Toca para editar">'+esc(itemText(it)||"(sin texto)")+'</div>'+(extra?'<div class="ex">'+extra+'</div>':'')+
      '<div class="m"><label class="when">⏰ '+(it.due?esc(whenTxt(it)):'Poner fecha y hora')+'<input type="datetime-local" data-due value="'+(it.due?localVal(new Date(it.due)):'')+'"></label><span class="st" data-st="'+esc(it.id)+'">'+esc(stTxt(it))+'</span></div>'+
      (it.done?'<div class="acts"><button type="button" data-undo>↩ Reabrir</button><button type="button" class="del" data-deli>✕</button></div>':'<div class="acts"><button type="button" data-snz="15">+15 min</button><button type="button" data-snz="60">+1 h</button><button type="button" data-tom>Mañana 9 a. m.</button><button type="button" data-wa>💬 WhatsApp</button><button type="button" class="del" data-deli>✕</button></div>')+'</div></div>';}
  function genHtml(c,it){var keys=Object.keys(it.fields||{});
    if(L.editing===it.id)return '<div class="lgi" data-id="'+esc(it.id)+'"><form data-form>'+keys.map(function(k){return '<div><label>'+esc(k)+'</label><input data-fk="'+esc(k)+'" value="'+esc(it.fields[k])+'"></div>';}).join("")+
      '<div><label>➕ Nuevo campo</label><input data-newk placeholder="Nombre: valor"></div><div class="w"><label>⏰ Avisarme (opcional)</label><input type="datetime-local" data-due value="'+(it.due?localVal(new Date(it.due)):'')+'"></div><button type="submit" class="w">✓ Guardar cambios</button></form></div>';
    return '<div class="lgi" data-id="'+esc(it.id)+'"><div class="f">'+keys.map(function(k){var v=it.fields[k];return '<div><span>'+esc(k)+'</span>'+esc(typeof v==="number"&&/valor|monto|total|precio|costo|gasto/i.test(k)?money(v):v)+'</div>';}).join("")+'</div>'+
      '<div class="bar">'+esc(new Date(it.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"}))+(it.due?' · ⏰ '+esc(whenTxt(it))+' · <span data-st="'+esc(it.id)+'">'+esc(stTxt(it))+'</span>':'')+'<div class="r"><button type="button" data-ed>✏️ Editar</button><button type="button" data-deli>✕</button></div></div></div>';}
  function lbPaint(){
    var el=L.el;if(!el)return;lbCss();
    var all=[];L.cols.forEach(function(c){(c.items||[]).forEach(function(it){all.push({c:c,it:it});});});
    var pend=all.filter(function(x){return x.it.due&&!x.it.done;}),late=pend.filter(function(x){return Date.parse(x.it.due)<Date.now();}),next=pend.filter(function(x){return Date.parse(x.it.due)>=Date.now();}).sort(function(a,b){return Date.parse(a.it.due)-Date.parse(b.it.due);})[0];
    var doneToday=all.filter(function(x){return x.it.done&&x.it.doneAt&&dayKey(new Date(x.it.doneAt))===dayKey(new Date());}).length;
    var perm=("Notification" in window)?Notification.permission:"na";
    el.innerHTML='<div class="lb2"><div class="lb2-hero"><div class="lb2-top"><div><div class="lb2-clock" id="lbClock"></div><div class="lb2-date" id="lbDate"></div></div>'+
      '<div class="lb2-next">'+(next?'<small>⏭ Tu próximo aviso</small><b>'+esc(next.c.icon||"🔔")+' '+esc(itemText(next.it))+'</b><em data-cd="'+esc(next.it.due)+'"></em>':'<small>⏭ Próximo aviso</small><b>Nada pendiente 🎉</b><span style="font-size:12px;opacity:.7">Escribe abajo: "recuérdame mañana a las 3 llamar a…"</span>')+'</div></div>'+
      '<div class="lb2-pills"><span>🔔 '+pend.length+' pendiente'+(pend.length===1?'':'s')+'</span>'+(late.length?'<span class="bad">⚠️ '+late.length+' atrasado'+(late.length===1?'':'s')+'</span>':'')+'<span>✅ '+doneToday+' hecho'+(doneToday===1?'':'s')+' hoy</span><span>📒 '+L.cols.length+' libreta'+(L.cols.length===1?'':'s')+'</span></div>'+
      '<div class="lb2-comp"><div><input id="lbIn" placeholder="✨ Escribe: recuérdame mañana a las 3 pedirle a Nay el pantalón beige…" autocomplete="off"><button type="button" class="mic" data-mic>🎤</button><button type="button" data-go>Anotar</button></div></div><div class="ia-live" id="lbLive"></div>'+
      '<div class="lb2-push" id="lbPush">Revisando los avisos de este dispositivo…</div></div>'+
      (L.cols.length?L.cols.map(function(c){
        var rem=isRem(c),items=c.items||[];
        var head='<div class="lb2-h"><span class="ic">'+esc(c.icon||"📒")+'</span><div><b>'+esc(c.name)+'</b><small>'+items.length+' registro'+(items.length===1?'':'s')+(rem?' · '+items.filter(function(i){return i.due&&!i.done;}).length+' con aviso':'')+'</small></div><div class="r"><button type="button" data-add>✨ Anotar</button><button type="button" data-csv>⬇ Excel</button><button type="button" data-delc>🗑</button></div></div>';
        if(rem){var by={};items.forEach(function(it){var g=group(it);(by[g]=by[g]||[]).push(it);});Object.keys(by).forEach(function(g){by[g].sort(function(a,b){return (Date.parse(a.due)||9e15)-(Date.parse(b.due)||9e15);});});
          return '<div class="lb2-c" data-c="'+esc(c.name)+'">'+head+GROUPS.map(function(G){var L2=by[G[0]]||[];if(!L2.length)return "";if(G[0]==="hechos"&&!L.showDone[c.name])return '<button type="button" class="lb2-more" data-showdone>✅ Ver '+L2.length+' hecho'+(L2.length===1?'':'s')+'</button>';
            return '<div class="lb2-g'+(G[0]==="atrasados"?' bad':'')+'">'+G[1]+' · '+L2.length+'</div>'+L2.map(function(it){return remHtml(c,it);}).join("");}).join("")+'</div>';}
        var keys=[];items.forEach(function(it){Object.keys(it.fields).forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});});
        var vk=keys.filter(function(k){return /valor|monto|total|precio|costo|gasto/i.test(k);})[0],sum=vk?items.reduce(function(a,it){return a+(Number(String(it.fields[vk]).replace(/[^\d]/g,""))||0);},0):0;
        return '<div class="lb2-c" data-c="'+esc(c.name)+'">'+head+(vk?'<div class="lb2-sum">Total '+esc(vk.toLowerCase())+': <b>'+money(sum)+'</b></div>':'')+'<div class="lg" style="margin-top:10px">'+items.slice(0,60).map(function(it){return genHtml(c,it);}).join("")+'</div></div>';}).join("")
       :'<div class="lb2-c" style="text-align:center;padding:30px">📒 Aún no hay libretas. Escribe arriba, por ejemplo: <b>"recuérdame el lunes a las 10 pagar la pauta"</b> o <b>"anota gasto: bolsas 45 mil"</b>.</div>')+
      '<div class="lb2-c" id="lbPr"><div class="lb2-h"><span class="ic">🕘</span><div><b>Tus prompts</b><small>Lo que le has pedido a la IA, para repetirlo en un toque. ⭐ = fijado arriba</small></div></div><div class="lb2-pr" id="lbPrList"><div style="opacity:.6">Cargando…</div></div></div></div>';
    tickUI();paintPrompts();bindLive();pushStatus();
  }
  // v2.1: real state of THIS device (permission + push subscription), activation and a test notice
  function pushStatus(){var el=document.getElementById("lbPush");if(!el)return;
    var dev=/iphone|ipad/i.test(navigator.userAgent)?"iPhone":/android/i.test(navigator.userAgent)?"celular":"computador";
    if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){el.innerHTML='📲 Para recibir los avisos en el iPhone, abre <b>Caneva Admin</b> desde el ícono de la pantalla de inicio (no desde Safari).';return;}
    if(Notification.permission==="denied"){el.innerHTML='🔕 Las notificaciones están bloqueadas en este '+dev+'. Actívalas en los ajustes del navegador o del celular (Notificaciones → Caneva Admin) y vuelve a abrir la app.';return;}
    navigator.serviceWorker.getRegistration("admin_movil.html").then(function(reg){return reg?reg.pushManager.getSubscription():null;}).catch(function(){return null;}).then(function(sub){
      if(sub&&Notification.permission==="granted"){el.innerHTML='✅ <b>Avisos activos en este '+dev+'.</b> Llegan a la hora exacta'+(dev==="iPhone"?'':', con botones <b>✓ Hecho</b> y <b>⏰ +1 hora</b>')+'.<button type="button" data-ptest style="background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505">🔔 Probar: avísame en 1 minuto</button>';return;}
      el.innerHTML='⚠️ <b>Este '+dev+' todavía no recibe avisos.</b> Tócalo una vez y acepta el permiso:<button type="button" id="cvPushOn">🔔 Activar avisos en este '+dev+'</button>';
      var b=el.querySelector("#cvPushOn");if(b)b.addEventListener("click",function(){setTimeout(pushStatus,2500);setTimeout(pushStatus,6000);});
    });}
  function paintPrompts(){var box=document.getElementById("lbPrList");if(!box)return;var P=S.prompts||[];
    box.innerHTML=P.length?P.slice(0,30).map(function(p){return '<div data-pid="'+esc(p.id)+'"><button type="button" data-pin title="Fijar">'+(p.pin?'⭐':'☆')+'</button><p>'+esc(p.t)+'</p><small>'+(p.n>1?'×'+p.n+' · ':'')+esc(new Date(p.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"}))+'</small><button type="button" data-use title="Usar">↩</button><button type="button" data-pdel title="Borrar">✕</button></div>';}).join(""):'<div style="opacity:.65">Aún no hay prompts guardados: se guardan solos cada vez que le escribes a la IA.</div>';}
  function bindLive(){var i=document.getElementById("lbIn"),lv=document.getElementById("lbLive");if(!i||i.__b)return;i.__b=1;
    i.addEventListener("input",function(){S.text=i.value;lv.innerHTML=liveHtml(i.value);});
    i.addEventListener("keydown",function(e){if(e.key==="Enter"&&i.value.trim()){open(i.value,true);}});}
  function tickUI(){var n=new Date(),c=document.getElementById("lbClock"),d=document.getElementById("lbDate");if(!c)return;
    var hh=(n.getHours()%12||12)+":"+String(n.getMinutes()).padStart(2,"0");c.innerHTML=esc(hh)+'<small>'+(n.getHours()<12?"a. m.":"p. m.")+'</small>';
    d.textContent=n.toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"});
    document.querySelectorAll("[data-cd]").forEach(function(e){var ms=Date.parse(e.dataset.cd)-Date.now();if(ms<=0){e.textContent="¡Es ahora! 🔔";return;}var s=Math.floor(ms/1e3),h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;e.textContent=(h?h+" h ":"")+String(m).padStart(h?2:1,"0")+" min "+(h?"":String(ss).padStart(2,"0")+" s");});
    L.cols.forEach(function(c){(c.items||[]).forEach(function(it){var e=document.querySelector('[data-st="'+it.id+'"]');if(e)e.textContent=stTxt(it);});});}
  function lbLoad(){if(!L.el)return Promise.resolve();return api("/admin/records").then(function(d){L.cols=d.collections||[];if(!L.editing&&!document.querySelector('.lr .t[contenteditable=true]')&&document.activeElement&&document.activeElement.id!=="lbIn")lbPaint();else if(!L.el.firstChild)lbPaint();})
    .catch(function(e){L.el.innerHTML='<div class="lb-empty">⚠️ '+esc(e.message)+'<br>Pega el Worker v88 en Cloudflare.</div>';});}
  function save(body,msg){return api("/admin/records",{method:"POST",body:body}).then(function(d){L.cols=d.collections||[];lbPaint();if(msg)toast(msg);}).catch(function(e){toast("⚠️ "+e.message);});}
  function findIt(name,id){var c=L.cols.filter(function(x){return x.name===name;})[0];return c?{c:c,it:(c.items||[]).filter(function(i){return i.id===id;})[0]}:{};}
  function csv(c){var keys=[];c.items.forEach(function(it){Object.keys(it.fields).forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});});
    var q=function(v){v=String(v==null?"":v);return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    var rows=[["Creado"].concat(keys).concat(["Aviso","Estado"]).map(q).join(";")].concat(c.items.map(function(it){return [new Date(it.at).toLocaleDateString("es-CO")].concat(keys.map(function(k){return it.fields[k];})).concat([it.due?new Date(it.due).toLocaleString("es-CO"):"",it.done?"Hecho":""]).map(q).join(";");}));
    var b=new Blob(["﻿"+rows.join("\n")],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="libreta-"+fl(c.name).replace(/\s+/g,"-")+".csv";document.body.appendChild(a);a.click();a.remove();}
  function editText(t,name,id){var x=findIt(name,id);if(!x.it||t.contentEditable==="true")return;t.__fin=0;t.contentEditable="true";t.focus();try{var r=document.createRange();r.selectNodeContents(t);var s2=getSelection();s2.removeAllRanges();s2.addRange(r);}catch(e){}
    var fin=function(ok){if(t.__fin)return;t.__fin=1;t.contentEditable="false";t.removeEventListener("blur",onb);t.removeEventListener("keydown",onk);var v=t.textContent.trim();if(!ok||!v||v===itemText(x.it)){t.textContent=itemText(x.it);return;}
      var f=Object.assign({},x.it.fields),k=txtKey(f)||"Tarea";f[k]=v;save({action:"update",collection:name,id:id,fields:f},"✏️ Guardado");};
    var onb=function(){fin(true);},onk=function(e){if(e.key==="Enter"){e.preventDefault();fin(true);}if(e.key==="Escape")fin(false);};t.addEventListener("blur",onb);t.addEventListener("keydown",onk);}
  function lbMount(el){L.el=el;css();lbCss();
    el.addEventListener("click",function(e){var b=e.target.closest("button,[data-edit]");if(!b)return;
      if(b.hasAttribute("data-go")){var i=document.getElementById("lbIn");if(i&&i.value.trim())open(i.value,true);else open("");return;}
      if(b.hasAttribute("data-mic")){var i2=document.getElementById("lbIn");mic(b,i2);return;}
      if(b.hasAttribute("data-ptest")){b.disabled=true;b.textContent="Programando…";var t=new Date(Date.now()+60000);
        api("/admin/records",{method:"POST",body:{action:"add",collection:"Recordatorios",icon:"🔔",fields:{Tarea:"Prueba de avisos CΛNEVΛ ✨"},due:t.toISOString()}}).then(function(d){L.cols=d.collections||[];lbPaint();toast("🔔 Listo: te llega en 1 a 5 minutos, aunque cierres la app");}).catch(function(x){b.disabled=false;toast("⚠️ "+x.message);});return;}
      var pr=b.closest("[data-pid]");if(pr&&b.closest("#lbPrList")){var pid=pr.dataset.pid,pp=(S.prompts||[]).filter(function(x){return x.id===pid;})[0];
        if(b.hasAttribute("data-use")&&pp){open(pp.t,true);return;}
        if(b.hasAttribute("data-pin")||b.hasAttribute("data-pdel"))api("/admin/ai/prompts",{method:"POST",body:{action:b.hasAttribute("data-pin")?"pin":"delete",id:pid}}).then(function(d){S.prompts=d.prompts;paintPrompts();}).catch(function(x){toast("⚠️ "+x.message);});return;}
      var c=b.closest("[data-c]");if(!c)return;var name=c.dataset.c,col=L.cols.filter(function(x){return x.name===name;})[0];
      if(b.hasAttribute("data-add")){open("En la libreta "+name+": ");return;}
      if(b.hasAttribute("data-csv")&&col){csv(col);return;}
      if(b.hasAttribute("data-showdone")){L.showDone[name]=1;lbPaint();return;}
      if(b.hasAttribute("data-delc")){ask("¿Seguro que deseas borrar?","Vas a borrar la libreta <b>"+esc(name)+"</b> con todos sus registros. No se puede deshacer.","Sí, borrar libreta").then(function(ok){if(ok)save({action:"delCollection",collection:name},"🗑 Libreta borrada");});return;}
      var row=b.closest("[data-id]");if(!row)return;var id=row.dataset.id,x=findIt(name,id);
      if(b.hasAttribute("data-edit")){editText(b,name,id);return;}
      if(b.hasAttribute("data-done")){row.classList.add("done");try{if(navigator.vibrate)navigator.vibrate(18);}catch(z){}save({action:"update",collection:name,id:id,done:!(x.it&&x.it.done)},x.it&&x.it.done?"↩ Reabierto":"✅ ¡Hecho!");return;}
      if(b.hasAttribute("data-undo")){save({action:"update",collection:name,id:id,done:false},"↩ Reabierto");return;}
      if(b.dataset.snz){save({action:"snooze",collection:name,id:id,minutes:+b.dataset.snz},"⏰ Te aviso en "+(b.dataset.snz==="60"?"1 hora":b.dataset.snz+" min"));return;}
      if(b.hasAttribute("data-tom")){var t=new Date();t.setDate(t.getDate()+1);t.setHours(9,0,0,0);save({action:"update",collection:name,id:id,due:t.toISOString()},"🌙 Te aviso mañana a las 9 a. m.");return;}
      if(b.hasAttribute("data-wa")&&x.it){window.open("https://wa.me/?text="+encodeURIComponent("🔔 "+itemText(x.it)+(x.it.due?" · "+whenTxt(x.it):"")),"_blank","noopener");return;}
      if(b.hasAttribute("data-ed")){L.editing=id;lbPaint();return;}
      if(b.hasAttribute("data-deli")){ask("¿Seguro que deseas borrar?","Vas a borrar este registro de <b>"+esc(name)+"</b>.","Sí, borrar").then(function(ok){if(ok)save({action:"delItem",collection:name,id:id},"🗑 Registro borrado");});return;}
    });
    el.addEventListener("change",function(e){var t=e.target;if(!t.hasAttribute("data-due")||t.closest("form"))return;var c=t.closest("[data-c]"),row=t.closest("[data-id]");if(!c||!row)return;
      save({action:"update",collection:c.dataset.c,id:row.dataset.id,due:t.value?new Date(t.value).toISOString():""},t.value?"⏰ Te aviso "+fmtWhen({d:new Date(t.value),time:true}):"Aviso quitado");});
    el.addEventListener("submit",function(e){var f=e.target.closest("[data-form]");if(!f)return;e.preventDefault();var c=f.closest("[data-c]"),row=f.closest("[data-id]"),fields={};
      f.querySelectorAll("[data-fk]").forEach(function(i){if(i.value.trim())fields[i.dataset.fk]=/^\d+$/.test(i.value.trim())?Number(i.value.trim()):i.value.trim();});
      var nk=f.querySelector("[data-newk]");if(nk&&nk.value.indexOf(":")>0){var p=nk.value.split(":");fields[p[0].trim()]=p.slice(1).join(":").trim();}
      var du=f.querySelector("[data-due]");L.editing="";save({action:"update",collection:c.dataset.c,id:row.dataset.id,fields:fields,due:du&&du.value?new Date(du.value).toISOString():""},"✓ Cambios guardados");});
    lbPaint();lbLoad();loadPrompts().then(paintPrompts);
    clearInterval(L.timer);L.timer=setInterval(function(){if(document.body.contains(L.el)&&L.el.offsetParent)tickUI();},1000);
    clearInterval(L.poll);L.poll=setInterval(function(){if(L.el&&L.el.offsetParent&&!document.hidden)lbLoad();},45000);
  }

  // ---------- floating button on every tab ----------
  function fab(){css();if(document.querySelector(".ia-fab"))return;var b=document.createElement("button");b.type="button";b.className="ia-fab";b.title="Registrar con IA";b.setAttribute("aria-label","Registrar con IA");b.innerHTML="<span>✨</span>";b.onclick=function(){if(!tok()){toast("Primero entra al admin");return;}open("");};document.body.appendChild(b);}
  if(document.readyState!=="loading")fab();else document.addEventListener("DOMContentLoaded",fab);
  window.CanevaIA={open:open};
  window.CanevaLibretas={mount:lbMount,reload:lbLoad};
})();
