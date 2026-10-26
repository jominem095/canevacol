/* CANEVA admin · Inventario blindado (v2)
   - "Salud del inventario" card for the Hoy tab (garments without a count never discount; sizes not counted;
     sales of the last 30 days that did not move stock)
   - ⚡ Conteo rápido v2: every category, filters (por contar / contadas / agotadas / bajo pedido / todas), +/− steppers,
     live totals, progress ring, photo viewer, Enter jumps to the next size, save one or all.
   Needs Worker v87 (/admin/inventory/health with "all") and the existing /admin/inventory/move. */
(function(){
  if(window.CanevaStock&&window.CanevaStock.v>=2)return;
  function base(){try{return API_BASE;}catch(e){return "https://caneva-ai.canevacol.workers.dev";}}
  function tok(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function norm(t){return String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();}
  function api(path,opt){opt=opt||{};return fetch(base()+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":tok()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function toast(t,bad){var d=document.createElement("div");d.className="sk-toast"+(bad?" bad":"");d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},3000);}
  function when(iso){try{return new Date(iso).toLocaleDateString("es-CO",{day:"numeric",month:"short"});}catch(e){return "";}}
  function css(){if(document.getElementById("sk-css2"))return;var o=document.getElementById("sk-css");if(o)o.remove();var s=document.createElement("style");s.id="sk-css2";s.textContent=
    ".sk-card{margin:10px 0 8px;padding:14px;border-radius:16px;border:1px solid rgba(255,196,120,.4);background:linear-gradient(135deg,rgba(255,196,120,.08),rgba(255,120,100,.05));color:#f6f7f8;font-family:Inter,system-ui,sans-serif}.sk-card.ok{border-color:rgba(142,240,200,.4);background:rgba(142,240,200,.06)}"+
    ".sk-card .t{display:flex;align-items:center;gap:12px}.sk-card .t b{font-size:15px}.sk-card small{display:block;font-size:12px;opacity:.8;margin-top:2px}.sk-card .row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}"+
    ".sk-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 10px;font-size:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)}.sk-pill b{font-size:13px}"+
    ".sk-go{border:0;border-radius:999px;padding:10px 15px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505;cursor:pointer;margin-top:10px}"+
    ".sk-ov{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center}@media(min-width:760px){.sk-ov{align-items:center;padding:20px}}"+
    ".sk-sh{width:min(1100px,100%);height:96vh;display:flex;flex-direction:column;border-radius:26px 26px 0 0;background:radial-gradient(900px 300px at 0% 0%,rgba(207,230,255,.08),transparent 60%),linear-gradient(180deg,#111114,#060607);border:1px solid rgba(207,230,255,.28);color:#f6f7f8;font-family:Inter,system-ui,sans-serif;animation:skUp .25s;overflow:hidden}@media(min-width:760px){.sk-sh{border-radius:26px;height:92vh}}@keyframes skUp{from{transform:translateY(30px);opacity:0}}"+
    ".sk-hd{padding:16px 18px 6px;display:flex;align-items:center;gap:14px}.sk-ring{--p:0;width:54px;height:54px;border-radius:50%;flex:0 0 auto;background:conic-gradient(#8ef0c8 calc(var(--p)*1%),rgba(255,255,255,.1) 0);display:grid;place-items:center}.sk-ring i{width:44px;height:44px;border-radius:50%;background:#0d0d10;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px;color:#f6f7f8}"+
    ".sk-hd .tt{flex:1;min-width:0}.sk-hd h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:28px;line-height:1}.sk-hd small{display:block;font-size:12.5px;color:rgba(246,247,248,.68);margin-top:4px}.sk-hd .x{width:38px;height:38px;border-radius:50%;border:1px solid rgba(246,247,248,.25);background:none;color:#fff;font-size:19px;cursor:pointer}"+
    ".sk-tabs{display:flex;gap:6px;padding:6px 18px 8px;overflow-x:auto;scrollbar-width:none}.sk-tabs::-webkit-scrollbar{display:none}.sk-tabs button{flex:0 0 auto;border:1px solid rgba(246,247,248,.18);background:none;color:#f6f7f8;border-radius:999px;padding:8px 13px;font:600 12.5px Inter,sans-serif;cursor:pointer}.sk-tabs button.on{background:#f6f7f8;color:#050505;border-color:#f6f7f8}.sk-tabs b{margin-left:6px;background:rgba(255,255,255,.14);border-radius:999px;padding:1px 7px;font-size:11px}.sk-tabs button.on b{background:#050505;color:#fff}.sk-tabs .hot b{background:#ff6b5e;color:#fff}"+
    ".sk-tools{display:flex;gap:8px;padding:0 18px 8px;align-items:center}.sk-q{flex:1;min-width:0;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:14px;color:#fff;padding:11px 14px;font:14px Inter,sans-serif}.sk-q:focus{outline:none;border-color:#cfe6ff}"+
    ".sk-cats{display:flex;gap:6px;overflow-x:auto;padding:0 18px 10px;scrollbar-width:none}.sk-cats::-webkit-scrollbar{display:none}.sk-cats button{flex:0 0 auto;border:1px solid rgba(246,247,248,.15);background:#121214;color:#f6f7f8;border-radius:999px;padding:7px 12px;font-size:12.5px;cursor:pointer}.sk-cats button.on{border-color:#cfe6ff;background:rgba(207,230,255,.16)}.sk-cats small{opacity:.6;margin-left:5px}.sk-cats button.zero{opacity:.45}"+
    ".sk-body{flex:1;overflow:auto;padding:4px 18px 18px}.sk-grid{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:760px){.sk-grid{grid-template-columns:1fr 1fr}}@media(min-width:1050px){.sk-grid{grid-template-columns:1fr 1fr 1fr}}"+
    ".sk-help{font-size:12.5px;color:rgba(246,247,248,.72);line-height:1.5;margin:2px 0 12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}"+
    ".sk-it{position:relative;display:grid;grid-template-columns:86px 1fr;gap:12px;padding:12px;border-radius:20px;background:linear-gradient(180deg,#121215,#0b0b0d);border:1px solid rgba(246,247,248,.09);transition:border-color .2s}.sk-it.dirty{border-color:rgba(255,231,168,.65)}.sk-it.done{border-color:rgba(142,240,200,.6)}.sk-it.zero{border-color:rgba(255,120,100,.35)}"+
    ".sk-ph{width:86px;height:110px;border-radius:14px;overflow:hidden;background:#1b1b1f;display:grid;place-items:center;font-size:30px;cursor:zoom-in;position:relative}.sk-ph img{width:100%;height:100%;object-fit:cover;transition:transform .35s}.sk-ph:hover img{transform:scale(1.06)}.sk-ph b{position:absolute;left:5px;bottom:5px;font-size:10px;background:rgba(0,0,0,.7);border-radius:999px;padding:2px 6px}"+
    ".sk-nm{font-weight:700;font-size:14.5px;line-height:1.25;padding-right:74px}.sk-ct{font-size:11.5px;color:rgba(246,247,248,.55);margin-top:2px}.sk-badge{position:absolute;top:10px;right:10px;font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 8px}.sk-badge.new{background:rgba(255,196,120,.18);color:#ffc478}.sk-badge.ok{background:rgba(142,240,200,.16);color:#8ef0c8}.sk-badge.out{background:rgba(255,120,100,.18);color:#ff9d8f}.sk-badge.made{background:rgba(201,167,255,.18);color:#d9c9ff}"+
    ".sk-szs{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.sk-sz{display:flex;flex-direction:column;align-items:center;gap:3px}.sk-sz>span:first-child{font-size:10.5px;letter-spacing:.06em;color:rgba(246,247,248,.62);font-weight:700}.sk-st{display:flex;align-items:center;border:1px solid rgba(246,247,248,.18);border-radius:12px;overflow:hidden;background:#050505}.sk-st.ch{border-color:#ffe7a8}"+
    ".sk-st button{width:26px;height:34px;border:0;background:rgba(255,255,255,.05);color:#f6f7f8;font-size:16px;cursor:pointer}.sk-st button:active{background:rgba(255,255,255,.18)}.sk-st input{width:38px;height:34px;text-align:center;background:none;border:0;color:#fff;font:800 15px Inter,sans-serif;padding:0}.sk-st input:focus{outline:none;background:rgba(207,230,255,.1)}"+
    ".sk-acts{display:flex;gap:6px;align-items:center;margin-top:10px;flex-wrap:wrap}.sk-acts button{border:0;border-radius:999px;padding:8px 13px;font:800 12px Inter,sans-serif;cursor:pointer;background:#8ef0c8;color:#04140a}.sk-acts button:disabled{opacity:.35;cursor:default}.sk-acts .gh{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.22)}.sk-acts em{font-style:normal;font-size:12px;color:#8ef0c8}.sk-tot{margin-left:auto;font-size:12px;color:rgba(246,247,248,.7)}.sk-tot b{color:#fff;font-size:14px}"+
    ".sk-ft{padding:12px 18px calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.08);display:flex;gap:10px;align-items:center;background:rgba(0,0,0,.35)}.sk-ft .inf{font-size:12.5px;color:rgba(246,247,248,.7)}.sk-ft .inf b{color:#fff}.sk-ft button{flex:1;max-width:460px;margin-left:auto;border:0;border-radius:999px;padding:14px;font:800 14px Inter,sans-serif;background:linear-gradient(120deg,#8ef0c8,#cfe6ff);color:#04140a;cursor:pointer}.sk-ft button:disabled{opacity:.35;cursor:default}"+
    ".sk-sale{padding:12px 14px;border-radius:16px;background:#0e0e10;border:1px solid rgba(246,247,248,.1);margin:8px 0;font-size:13px;display:flex;gap:10px;align-items:center}.sk-sale img{width:44px;height:56px;border-radius:10px;object-fit:cover;background:#1b1b1f}.sk-sale .why{font-size:11.5px;margin-top:3px}.sk-sale .why.a{color:#ffc478}.sk-sale .why.b{color:#ff9d8f}"+
    ".sk-empty{padding:44px 10px;text-align:center;color:rgba(246,247,248,.72);font-size:14px;grid-column:1/-1}.sk-empty b{display:block;font-size:34px;margin-bottom:6px}.sk-toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:#f6f7f8;color:#050505;border-radius:999px;padding:10px 16px;font:600 13px Inter,sans-serif;z-index:100060}.sk-toast.bad{background:#ff6b5e;color:#fff}"+
    ".sk-conf{position:fixed;inset:0;pointer-events:none;z-index:100055;overflow:hidden}.sk-conf i{position:absolute;top:-10px;width:8px;height:14px;border-radius:2px;animation:skFall 1.6s ease-in forwards}@keyframes skFall{to{transform:translateY(105vh) rotate(540deg);opacity:.2}}";
    document.head.appendChild(s);}

  var S={d:null,tab:"contar",q:"",cat:"",draft:{},done:{},busy:{},onDone:null};
  function all(){return (S.d&&S.d.all)||[];}
  function sizesOf(p){var s=(p.sizes&&p.sizes.length?p.sizes:["Única"]).slice();Object.keys(p.stock||{}).forEach(function(k){if(s.indexOf(k)<0)s.push(k);});if(s.length>1&&s.indexOf("Única")>=0&&!(p.stock&&p.stock["Única"]))s.splice(s.indexOf("Única"),1);return s;}
  function cur(p,z){return p.stock&&p.stock[z]!=null?Math.max(0,p.stock[z]|0):null;}
  function val(p,z){var d=S.draft[p.id];if(d&&d[z]!==undefined&&d[z]!=="")return parseInt(d[z],10)||0;var c=cur(p,z);return c==null?0:c;}
  function isDirty(p){var d=S.draft[p.id];if(!d)return false;return Object.keys(d).some(function(z){if(d[z]===""||d[z]===undefined)return false;return !p.managed||(parseInt(d[z],10)||0)!==(cur(p,z)||0);});}
  function stateOf(p){if(!p.managed)return "new";return p.total>0?"ok":"out";}
  function inTab(p,t){if(t==="contar")return !p.managed&&!p.made&&!p.hidden;if(t==="made")return !p.managed&&p.made;if(t==="contadas")return p.managed&&p.total>0;if(t==="agotadas")return p.managed&&p.total<=0;if(t==="todas")return !p.hidden||p.managed;return false;}
  function count(t){return all().filter(function(p){return inTab(p,t);}).length;}

  // ---------- Hoy card ----------
  function card(v){
    css();var c=document.getElementById("hyStock");if(!c){c=document.createElement("div");c.id="hyStock";c.className="sk-card";}
    var anchor=v.querySelector(".hy-ai")||v.querySelector("#hyNotify");if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(c,anchor);else v.appendChild(c);
    c.innerHTML='<div class="t"><span style="font-size:22px">📦</span><div><b>Salud del inventario</b><small>Revisando…</small></div></div>';
    api("/admin/inventory/health").then(function(d){S.d=d;
      var bad=d.toCount.length+d.sizeIssues.length+d.notMoved,tot=d.counted+d.toCount.length,pct=tot?Math.round(d.counted/tot*100):100;
      c.className="sk-card"+(bad?"":" ok");
      c.innerHTML='<div class="t"><div class="sk-ring" style="--p:'+pct+'"><i>'+pct+'%</i></div><div><b>'+(bad?"Inventario con huecos":"Inventario al día")+'</b><small>'+
        (bad?'Las prendas sin contar <b>no se descuentan</b> cuando vendes y la tienda las deja comprar sin límite.':'Cada venta descuenta sola y la tienda no deja comprar lo que no hay.')+'</small></div></div>'+
        '<div class="row"><span class="sk-pill">✅ <b>'+d.counted+'</b> contadas</span>'+(d.toCount.length?'<span class="sk-pill">🔢 <b>'+d.toCount.length+'</b> sin contar</span>':'')+(d.sizeIssues.length?'<span class="sk-pill">📏 <b>'+d.sizeIssues.length+'</b> con tallas sin contar</span>':'')+
        (d.uncounted+d.notMoved?'<span class="sk-pill">🧾 <b>'+(d.uncounted+d.notMoved)+'</b> ventas sin descontar (30 días)</span>':'')+(d.made?'<span class="sk-pill">🧵 '+d.made+' bajo pedido</span>':'')+'</div>'+
        '<button type="button" class="sk-go" data-skopen>⚡ Conteo rápido</button>';
      c.querySelector("[data-skopen]").onclick=function(){open({});};
    }).catch(function(e){c.innerHTML='<div class="t"><span style="font-size:22px">📦</span><div><b>Salud del inventario</b><small>'+(/404|Ruta/.test(e.message)?"Pega el Worker v87 en Cloudflare para verla.":esc(e.message))+'</small></div></div>';});
  }

  // ---------- sheet ----------
  function open(o){css();o=o||{};S.onDone=o.onDone||null;S.draft={};S.done={};S.busy={};S.q="";S.cat="";S.tab=o.tab||"contar";
    var ov=document.createElement("div");ov.className="sk-ov";ov.id="skOv";
    ov.innerHTML='<div class="sk-sh"><div class="sk-hd"><div class="sk-ring" id="skRing"><i>…</i></div><div class="tt"><h2>Conteo rápido</h2><small id="skSub">Cargando tu bodega…</small></div><button type="button" class="x" data-skx aria-label="Cerrar">×</button></div>'+
      '<div class="sk-tabs" id="skTabs"></div><div class="sk-tools"><input class="sk-q" id="skQ" placeholder="🔎 Buscar prenda o categoría…" autocomplete="off"></div><div class="sk-cats" id="skCats"></div><div class="sk-body" id="skBody"><div class="sk-empty"><b>⏳</b>Cargando…</div></div><div class="sk-ft" id="skFt"></div></div>';
    document.body.appendChild(ov);document.body.style.overflow="hidden";
    ov.addEventListener("click",onClick);ov.addEventListener("input",onInput);ov.addEventListener("keydown",onKey);
    load();}
  function close(){var o=document.getElementById("skOv");if(o)o.remove();document.body.style.overflow="";var n=Object.keys(S.done).length;if(n&&S.onDone)try{S.onDone();}catch(e){}var v=document.getElementById("hyStock");if(n&&v&&v.parentNode)card(v.parentNode);}
  function load(){return api("/admin/inventory/health").then(function(d){S.d=d;if(!d.all){d.all=d.toCount.map(function(p){return Object.assign({managed:false,stock:null,total:null,made:false},p);});}paint();}).catch(function(e){var b=document.getElementById("skBody");if(b)b.innerHTML='<div class="sk-empty"><b>⚠️</b>'+esc(e.message)+'</div>';});}
  function header(){var A=all().filter(function(p){return !p.hidden||p.managed;}),c=A.filter(function(p){return p.managed;}).length,pct=A.length?Math.round(c/A.length*100):0;
    var r=document.getElementById("skRing");if(r){r.style.setProperty("--p",pct);r.innerHTML="<i>"+pct+"%</i>";}
    var sb=document.getElementById("skSub");if(sb)sb.innerHTML='<b>'+c+'</b> de '+A.length+' prendas contadas · '+A.reduce(function(a,p){return a+(p.total||0);},0)+' unidades en bodega';}
  function paint(){var d=S.d;if(!d)return;header();
    var tabs=[["contar","🔢 Por contar",count("contar"),1],["contadas","✅ Contadas",count("contadas")],["agotadas","⛔ Agotadas",count("agotadas")],["made","🧵 Bajo pedido",count("made")],["todas","👗 Todas",count("todas")],["tallas","📏 Tallas",d.sizeIssues.length,1],["ventas","🧾 Ventas sin descontar",d.missed.filter(function(m,i){return !S.done["m"+i];}).length,1]];
    document.getElementById("skTabs").innerHTML=tabs.map(function(t){return '<button type="button" data-sktab="'+t[0]+'" class="'+(S.tab===t[0]?"on":"")+(t[3]&&t[2]?" hot":"")+'">'+t[1]+'<b>'+t[2]+'</b></button>';}).join("");
    var list=S.tab==="tallas"||S.tab==="ventas"?[]:all().filter(function(p){return inTab(p,S.tab);});
    var tools=document.querySelector(".sk-tools"),catsEl=document.getElementById("skCats");
    tools.style.display=catsEl.style.display=(S.tab==="tallas"||S.tab==="ventas")?"none":"";
    if(S.tab!=="tallas"&&S.tab!=="ventas"){
      // v2.1: every category of the store is always listed; the number is how many fall in the current tab
      var cats={},tot={};all().forEach(function(p){if(p.hidden&&!p.managed)return;var c=p.categoria||"Otras";tot[c]=(tot[c]||0)+1;if(cats[c]===undefined)cats[c]=0;});
      list.forEach(function(p){var c=p.categoria||"Otras";cats[c]=(cats[c]||0)+1;});
      catsEl.innerHTML='<button type="button" data-skcat="" class="'+(!S.cat?"on":"")+'">Todas<small>'+list.length+'</small></button>'+Object.keys(tot).sort(function(a,b){return (cats[b]>0)-(cats[a]>0)||a.localeCompare(b);}).map(function(c){return '<button type="button" data-skcat="'+esc(c)+'" class="'+(S.cat===c?"on":"")+(cats[c]?'':' zero')+'" title="'+cats[c]+' en esta pestaña · '+tot[c]+' en total">'+esc(c)+'<small>'+cats[c]+(cats[c]!==tot[c]?' / '+tot[c]:'')+'</small></button>';}).join("");}
    var body=document.getElementById("skBody");
    if(S.tab==="tallas")body.innerHTML=tallasHtml(d);
    else if(S.tab==="ventas")body.innerHTML=ventasHtml(d);
    else{var q=norm(S.q),L=list.filter(function(p){return (!S.cat||(p.categoria||"Otras")===S.cat)&&(!q||norm(p.nombre+" "+p.categoria).indexOf(q)>=0);});
      var help={contar:'Escribe cuántas hay <b>hoy</b> en tu bodega de cada talla (usa + y −, o escribe y presiona Enter para pasar a la siguiente). Desde que la guardas, cada venta en tienda, WhatsApp, Bold o Bre-B se descuenta sola y la página tacha las tallas agotadas.',
        contadas:'Prendas con inventario. Si el conteo físico no coincide, corrige el número y toca Guardar.',agotadas:'Prendas en 0. Si te llegó mercancía, súmala aquí y vuelven a la venta solas.',
        made:'Atelier, Deportivo y lo que se confecciona. No necesitan conteo; cuéntalas solo si tienes unidades ya hechas para entrega inmediata.',todas:'Todo tu catálogo, de todas las categorías.'}[S.tab]||"";
      var tabName={contar:"por contar",contadas:"contadas",agotadas:"agotadas",made:"bajo pedido",todas:""}[S.tab]||"";
      body.innerHTML='<div class="sk-help">'+help+'</div><div class="sk-grid">'+(L.length?L.map(itemHtml).join(""):'<div class="sk-empty"><b>'+(S.tab==="contar"&&!list.length?"🎉":"🔎")+'</b>'+(S.tab==="contar"&&!list.length?"¡Todas tus prendas están contadas!":S.cat?'No hay prendas de <b>'+esc(S.cat)+'</b> '+tabName+'.<br><button type="button" class="sk-go" data-sktab="todas">Ver todas las de '+esc(S.cat)+'</button>':"Nada con este filtro.")+'</div>')+'</div>';}
    foot();}
  function foot(){var ids=Object.keys(S.draft).filter(function(id){var it=itemFor(id);return it&&isDirty(it.p);}),u=0;
    ids.forEach(function(id){var it=itemFor(id);it.szs.forEach(function(z){u+=val(it.p,z);});});
    var ft=document.getElementById("skFt");if(!ft)return;
    ft.innerHTML=S.tab==="ventas"?'<span class="inf">Cada venta se descuenta por separado.</span><button type="button" data-skx>Listo</button>':
      '<span class="inf">'+(ids.length?'<b>'+ids.length+'</b> prenda'+(ids.length===1?'':'s')+' con cambios · <b>'+u+'</b> und':'Sin cambios pendientes')+'</span><button type="button" data-skall'+(ids.length?'':' disabled')+'>✓ Guardar '+(ids.length?ids.length+' prenda'+(ids.length===1?'':'s'):'todo')+'</button>';}
  function itemHtml(p){var szs=sizesOf(p),done=S.done[p.id],dirty=isDirty(p),st=stateOf(p),tot=szs.reduce(function(a,z){return a+val(p,z);},0),fotos=(p.fotos&&p.fotos.length?p.fotos:(p.imagen?[p.imagen]:[]));
    var badge=p.made&&!p.managed?'<span class="sk-badge made">🧵 Bajo pedido</span>':st==="new"?'<span class="sk-badge new">Sin contar</span>':st==="out"?'<span class="sk-badge out">Agotada</span>':'<span class="sk-badge ok">'+p.total+' und</span>';
    return '<div class="sk-it'+(done?' done':dirty?' dirty':st==="out"?' zero':'')+'" data-pid="'+esc(p.id)+'">'+badge+
      '<div class="sk-ph" '+(fotos.length?'data-cvfoto="'+esc(JSON.stringify({f:fotos,t:p.nombre,s:(p.categoria||"")+(p.precio?" · "+p.precio:"")}))+'"':'')+'>'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="" loading="lazy">':'👗')+(fotos.length>1?'<b>📷 '+fotos.length+'</b>':'')+'</div>'+
      '<div><div class="sk-nm">'+esc(p.nombre)+'</div><div class="sk-ct">'+esc(p.categoria||"")+(p.precio?' · '+esc(p.precio):'')+'</div>'+
      '<div class="sk-szs">'+szs.map(function(z){var c=cur(p,z),d=S.draft[p.id]&&S.draft[p.id][z],ch=d!==undefined&&d!==""&&(parseInt(d,10)||0)!==(c||0);
        return '<div class="sk-sz"><span>'+esc(z)+'</span><span class="sk-st'+(ch?' ch':'')+'"><button type="button" data-step="-1" data-z="'+esc(z)+'" tabindex="-1">−</button><input inputmode="numeric" pattern="[0-9]*" data-z="'+esc(z)+'" value="'+(d!==undefined?esc(d):(c==null?"":c))+'" placeholder="0"><button type="button" data-step="1" data-z="'+esc(z)+'" tabindex="-1">+</button></span></div>';}).join("")+'</div>'+
      '<div class="sk-acts">'+(done?'<em>✓ '+esc(done)+'</em>':'<button type="button" data-sksave="'+esc(p.id)+'"'+(dirty&&!S.busy[p.id]?'':' disabled')+'>'+(S.busy[p.id]?'Guardando…':p.managed?'Guardar':'Guardar conteo')+'</button>'+(p.managed||dirty?'':'<button type="button" class="gh" data-skzero="'+esc(p.id)+'" title="No tengo ninguna">Todo en 0</button>'))+'<span class="sk-tot">Total <b data-tot>'+tot+'</b></span></div></div></div>';}
  function tallasHtml(d){var L=d.sizeIssues.filter(function(p){return !S.done[p.id];});
    return '<div class="sk-help">Estas prendas muestran en la tienda tallas que no están contadas, por eso salen <b>agotadas</b>. Cuéntalas aquí o, si la talla está mal escrita (ej. <b>6.8</b> en vez de 6-8), corrígela en Productos.</div><div class="sk-grid">'+
      (L.length?L.map(function(p){var a=all().find(function(x){return x.id===p.id;})||{};return itemHtml({id:p.id,nombre:p.nombre,categoria:"Contadas: "+Object.keys(p.inv).map(function(k){return k+" ("+p.inv[k]+")";}).join(", "),precio:"",imagen:a.imagen||"",fotos:a.fotos||[],sizes:p.missing,stock:null,managed:false,made:false,total:null});}).join(""):'<div class="sk-empty"><b>✅</b>Todas las tallas están contadas.</div>')+'</div>';}
  function ventasHtml(d){
    return '<div class="sk-help">Ventas pagadas de los últimos 30 días que no movieron el inventario. Si la prenda <b>ya está contada</b>, toca “Descontar ahora”. Si no tenía inventario, cuéntala en Por contar con lo que hay hoy (ya sin esa venta).</div>'+
      (d.missed.length?d.missed.map(function(m,i){var k="m"+i,a=all().find(function(x){return x.id===m.pid;})||{};return '<div class="sk-sale">'+(a.imagen?'<img src="'+esc(a.imagen)+'" alt="">':'')+'<div style="flex:1"><b>'+esc(m.nombre)+'</b>'+(m.size?' · talla '+esc(m.size):'')+' · ×'+(m.qty||1)+' <span style="opacity:.6">· '+esc(m.ticket)+' · '+esc(when(m.at))+'</span>'+
        '<div class="why '+(m.reason==="no-desconto"?"b":"a")+'">'+(m.reason==="no-desconto"?"Está contada pero esta venta no la descontó (guardada sin descontar o con otra talla).":"No tenía inventario cuando se vendió.")+'</div>'+
        (m.reason==="no-desconto"&&!S.done[k]?'<div class="sk-acts"><button type="button" data-skdisc="'+i+'">➖ Descontar ahora</button></div>':S.done[k]?'<div class="sk-acts"><em>✓ Descontada</em></div>':'')+'</div></div>';}).join(""):'<div class="sk-empty"><b>✅</b>Todas las ventas de los últimos 30 días descontaron bien.</div>');}
  function itemFor(pid){var p=all().find(function(x){return x.id===pid;});if(p&&S.tab!=="tallas")return {p:p,szs:sizesOf(p)};var t=S.d&&S.d.sizeIssues.find(function(x){return x.id===pid;});if(t)return {p:{id:t.id,sizes:t.missing,stock:null,managed:false},szs:t.missing};return p?{p:p,szs:sizesOf(p)}:null;}
  function refresh(pid){var el=document.querySelector('.sk-it[data-pid="'+pid+'"]'),it=itemFor(pid);if(!el||!it)return;var p=it.p;
    var dirty=isDirty(p),tot=it.szs.reduce(function(a,z){return a+val(p,z);},0);el.classList.toggle("dirty",dirty&&!S.done[pid]);
    var b=el.querySelector("[data-sksave]");if(b)b.disabled=!dirty||!!S.busy[pid];var t2=el.querySelector("[data-tot]");if(t2)t2.textContent=tot;
    el.querySelectorAll(".sk-st").forEach(function(st){var i=st.querySelector("input"),z=i.dataset.z,c=cur(p,z),d=S.draft[pid]&&S.draft[pid][z];st.classList.toggle("ch",d!==undefined&&d!==""&&(parseInt(d,10)||0)!==(c||0));});foot();}
  function save(pid){var it=itemFor(pid);if(!it)return Promise.resolve();var p=it.p;
    var lines=it.szs.map(function(z){return {size:z,qty:val(p,z)};});
    S.busy[pid]=1;refresh(pid);
    return api("/admin/inventory/move",{method:"POST",body:{kind:"ajuste",pid:pid,lines:lines,note:"Conteo rápido"}}).then(function(r){
      delete S.busy[pid];delete S.draft[pid];S.done[pid]=r.total+" unidades guardadas";
      var a=all().find(function(x){return x.id===pid;});if(a){a.stock=r.stock||a.stock;a.managed=true;a.total=r.total;}
      return r;})
      .catch(function(e){delete S.busy[pid];refresh(pid);toast("⚠️ "+e.message,true);throw e;});}
  function confetti(){var c=document.createElement("div");c.className="sk-conf";var col=["#8ef0c8","#cfe6ff","#ffe7a8","#d9c9ff","#fff"];for(var i=0;i<60;i++){var p=document.createElement("i");p.style.left=Math.random()*100+"%";p.style.background=col[i%5];p.style.animationDelay=Math.random()*.5+"s";c.appendChild(p);}document.body.appendChild(c);setTimeout(function(){c.remove();},2400);}
  function onClick(e){var t=e.target;
    if(t.classList.contains("sk-ov")||t.closest("[data-skx]")){close();return;}
    var b=t.closest("[data-sktab]");if(b){S.tab=b.dataset.sktab;paint();document.getElementById("skBody").scrollTop=0;return;}
    b=t.closest("[data-skcat]");if(b){S.cat=b.dataset.skcat;paint();return;}
    b=t.closest("[data-step]");if(b){var pid=b.closest(".sk-it").dataset.pid,z=b.dataset.z,it=itemFor(pid);if(!it)return;var v=Math.max(0,Math.min(9999,val(it.p,z)+Number(b.dataset.step)));(S.draft[pid]=S.draft[pid]||{})[z]=String(v);var inp=b.parentNode.querySelector("input");if(inp)inp.value=v;refresh(pid);return;}
    b=t.closest("[data-skzero]");if(b){var id=b.dataset.skzero,it2=itemFor(id);if(!it2)return;S.draft[id]={};it2.szs.forEach(function(z){S.draft[id][z]="0";});b.closest(".sk-it").querySelectorAll("input[data-z]").forEach(function(i){i.value="0";});refresh(id);return;}
    b=t.closest("[data-sksave]");if(b){save(b.dataset.sksave).then(function(){toast("✓ Inventario guardado");paint();}).catch(function(){});return;}
    if(t.closest("[data-skall]")){var ids=Object.keys(S.draft).filter(function(id){var it3=itemFor(id);return it3&&isDirty(it3.p);}),ok=0,pr=Promise.resolve();
      var fb=t.closest("[data-skall]");fb.disabled=true;fb.textContent="Guardando…";
      ids.forEach(function(id){pr=pr.then(function(){return save(id).then(function(){ok++;}).catch(function(){});});});
      pr.then(function(){toast("✓ "+ok+" prenda"+(ok===1?"":"s")+" guardada"+(ok===1?"":"s"));if(ok&&!count("contar"))confetti();paint();});return;}
    b=t.closest("[data-skdisc]");if(b){var m=S.d.missed[+b.dataset.skdisc];if(!m)return;b.disabled=true;b.textContent="Descontando…";
      api("/admin/inventory/move",{method:"POST",body:{kind:"tienda",pid:m.pid,lines:[{size:m.size||"Única",qty:m.qty||1}],note:"Venta "+m.ticket+" (descontada después)",ref:m.id}})
        .then(function(){S.done["m"+b.dataset.skdisc]=1;paint();toast("✓ Descontada");}).catch(function(x){b.disabled=false;b.textContent="➖ Descontar ahora";toast("⚠️ "+x.message,true);});return;}
  }
  function onInput(e){var t=e.target;
    if(t.id==="skQ"){S.q=t.value;var pos=t.selectionStart;paint();var q=document.getElementById("skQ");if(q){q.value=S.q;q.focus();try{q.setSelectionRange(pos,pos);}catch(x){}}return;}
    if(t.dataset.z!=null&&t.tagName==="INPUT"){var pid=t.closest(".sk-it").dataset.pid;t.value=t.value.replace(/\D/g,"").slice(0,4);(S.draft[pid]=S.draft[pid]||{})[t.dataset.z]=t.value;refresh(pid);}
  }
  function onKey(e){var t=e.target;if(e.key!=="Enter"||t.tagName!=="INPUT"||t.dataset.z==null)return;e.preventDefault();
    var ins=[].slice.call(document.querySelectorAll("#skBody input[data-z]")),i=ins.indexOf(t);if(ins[i+1]){ins[i+1].focus();ins[i+1].select();}}
  window.CanevaStock={card:card,open:open,v:2};
})();
