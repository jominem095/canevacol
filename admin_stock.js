/* CANEVA admin · Inventario blindado (v1)
   - "Salud del inventario" card for the Hoy tab: garments without a count (their sales never discount),
     sizes shown in the store but not counted, and sales of the last 30 days that did not move stock.
   - ⚡ Conteo rápido: count every garment that is missing, size by size, in one screen.
   Needs Worker v86 (/admin/inventory/health) and the existing /admin/inventory/move. */
(function(){
  if(window.CanevaStock)return;
  function base(){try{return API_BASE;}catch(e){return "https://caneva-ai.canevacol.workers.dev";}}
  function tok(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function norm(t){return String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();}
  function api(path,opt){opt=opt||{};return fetch(base()+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":tok()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function toast(t,bad){var d=document.createElement("div");d.className="sk-toast"+(bad?" bad":"");d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},3000);}
  function when(iso){try{return new Date(iso).toLocaleDateString("es-CO",{day:"numeric",month:"short"});}catch(e){return "";}}
  function css(){if(document.getElementById("sk-css"))return;var s=document.createElement("style");s.id="sk-css";s.textContent=
    ".sk-card{margin:10px 0 8px;padding:14px;border-radius:16px;border:1px solid rgba(255,196,120,.4);background:linear-gradient(135deg,rgba(255,196,120,.08),rgba(255,120,100,.05));color:#f6f7f8;font-family:Inter,system-ui,sans-serif}.sk-card.ok{border-color:rgba(142,240,200,.4);background:rgba(142,240,200,.06)}"+
    ".sk-card .t{display:flex;align-items:center;gap:10px}.sk-card .t b{font-size:15px}.sk-card small{display:block;font-size:12px;opacity:.8;margin-top:2px}.sk-card .row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}"+
    ".sk-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 10px;font-size:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)}.sk-pill b{font-size:13px}"+
    ".sk-go{border:0;border-radius:999px;padding:10px 15px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505;cursor:pointer;margin-top:10px}"+
    ".sk-ov{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center}@media(min-width:760px){.sk-ov{align-items:center}}"+
    ".sk-sh{width:min(760px,100%);height:94vh;display:flex;flex-direction:column;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#121215,#070708);border:1px solid rgba(207,230,255,.3);color:#f6f7f8;font-family:Inter,system-ui,sans-serif;animation:skUp .25s}@media(min-width:760px){.sk-sh{border-radius:24px;height:90vh}}@keyframes skUp{from{transform:translateY(30px);opacity:0}}"+
    ".sk-hd{padding:16px 16px 8px;display:flex;align-items:center;gap:10px}.sk-hd h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:27px}.sk-hd button{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(246,247,248,.25);background:none;color:#fff;font-size:18px;cursor:pointer}"+
    ".sk-tabs{display:flex;gap:6px;padding:0 16px 8px;overflow-x:auto;scrollbar-width:none}.sk-tabs button{flex:0 0 auto;border:1px solid rgba(246,247,248,.2);background:none;color:#f6f7f8;border-radius:999px;padding:8px 12px;font:600 12.5px Inter,sans-serif;cursor:pointer}.sk-tabs button.on{background:#f6f7f8;color:#050505}.sk-tabs b{margin-left:5px;background:#ff6b5e;color:#fff;border-radius:999px;padding:1px 6px;font-size:11px}"+
    ".sk-body{flex:1;overflow:auto;padding:4px 16px 16px}.sk-help{font-size:12.5px;color:rgba(246,247,248,.7);line-height:1.45;margin:4px 0 10px}.sk-q{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:10px 12px;font:14px Inter,sans-serif;margin-bottom:8px}"+
    ".sk-cats{display:flex;gap:6px;overflow-x:auto;margin-bottom:8px;scrollbar-width:none}.sk-cats button{flex:0 0 auto;border:1px solid rgba(246,247,248,.18);background:#121214;color:#f6f7f8;border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}.sk-cats button.on{border-color:#cfe6ff;background:rgba(207,230,255,.14)}"+
    ".sk-it{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:12px;border-radius:16px;background:#0e0e10;border:1px solid rgba(246,247,248,.1);margin:8px 0}.sk-it.done{border-color:rgba(142,240,200,.55)}.sk-it img,.sk-it .ph{width:52px;height:66px;border-radius:10px;object-fit:cover;background:#1b1b1f}"+
    ".sk-it .nm{font-weight:700;font-size:14px}.sk-it .ct{font-size:11.5px;color:rgba(246,247,248,.55)}.sk-szs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.sk-sz{display:flex;flex-direction:column;align-items:center;gap:3px}.sk-sz span{font-size:10.5px;letter-spacing:.05em;color:rgba(246,247,248,.6)}.sk-sz input{width:52px;text-align:center;background:#050505;border:1px solid rgba(246,247,248,.22);border-radius:10px;color:#fff;padding:8px 4px;font:700 15px Inter,sans-serif}.sk-sz input:focus{border-color:#cfe6ff;outline:none}"+
    ".sk-acts{display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap}.sk-acts button{border:0;border-radius:999px;padding:8px 13px;font:800 12px Inter,sans-serif;cursor:pointer;background:#8ef0c8;color:#04140a}.sk-acts .gh{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.25)}.sk-acts em{font-style:normal;font-size:12px;color:#8ef0c8}"+
    ".sk-ft{padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;align-items:center}.sk-ft button{flex:1;border:0;border-radius:999px;padding:13px;font:800 14px Inter,sans-serif;background:linear-gradient(120deg,#8ef0c8,#cfe6ff);color:#04140a;cursor:pointer}.sk-ft button:disabled{opacity:.4}"+
    ".sk-sale{padding:11px 12px;border-radius:14px;background:#0e0e10;border:1px solid rgba(246,247,248,.1);margin:7px 0;font-size:13px}.sk-sale .why{font-size:11.5px;margin-top:3px}.sk-sale .why.a{color:#ffc478}.sk-sale .why.b{color:#ff9d8f}"+
    ".sk-empty{padding:34px 10px;text-align:center;color:rgba(246,247,248,.7);font-size:14px}.sk-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#f6f7f8;color:#050505;border-radius:999px;padding:10px 16px;font:600 13px Inter,sans-serif;z-index:99999}.sk-toast.bad{background:#ff6b5e;color:#fff}";
    document.head.appendChild(s);}

  var S={d:null,tab:"contar",q:"",cat:"",draft:{},done:{},onDone:null};
  function sizes(p){var s=(p.sizes&&p.sizes.length?p.sizes:["Única"]).slice();return s;}

  // ---------- Hoy card ----------
  function card(v){
    css();var c=document.getElementById("hyStock");if(!c){c=document.createElement("div");c.id="hyStock";c.className="sk-card";}
    // right under the numbers of the day, before Caneva AI, so it is seen without scrolling
    var anchor=v.querySelector(".hy-ai")||v.querySelector("#hyNotify");if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(c,anchor);else v.appendChild(c);
    c.innerHTML='<div class="t"><span style="font-size:22px">📦</span><div><b>Salud del inventario</b><small>Revisando…</small></div></div>';
    api("/admin/inventory/health").then(function(d){S.d=d;
      var bad=d.toCount.length+d.sizeIssues.length+d.notMoved;
      c.className="sk-card"+(bad?"":" ok");
      c.innerHTML='<div class="t"><span style="font-size:22px">'+(bad?"⚠️":"✅")+'</span><div><b>'+(bad?"Inventario con huecos":"Inventario al día")+'</b><small>'+
        (bad?'Las prendas sin contar <b>no se descuentan</b> cuando vendes y la tienda las deja comprar sin límite.':'Cada venta descuenta sola y la tienda no deja comprar lo que no hay.')+'</small></div></div>'+
        '<div class="row"><span class="sk-pill">✅ <b>'+d.counted+'</b> contadas</span>'+(d.toCount.length?'<span class="sk-pill">🔢 <b>'+d.toCount.length+'</b> sin contar</span>':'')+(d.sizeIssues.length?'<span class="sk-pill">📏 <b>'+d.sizeIssues.length+'</b> con tallas sin contar</span>':'')+
        (d.uncounted+d.notMoved?'<span class="sk-pill">🧾 <b>'+(d.uncounted+d.notMoved)+'</b> ventas sin descontar (30 días)</span>':'')+(d.made?'<span class="sk-pill">🧵 '+d.made+' bajo pedido</span>':'')+'</div>'+
        (bad?'<button type="button" class="sk-go" data-skopen>⚡ Conteo rápido</button>':'');
      var b=c.querySelector("[data-skopen]");if(b)b.onclick=function(){open({});};
    }).catch(function(e){c.innerHTML='<div class="t"><span style="font-size:22px">📦</span><div><b>Salud del inventario</b><small>'+(/404|Ruta/.test(e.message)?"Pega el Worker v86 en Cloudflare para verla.":esc(e.message))+'</small></div></div>';});
  }

  // ---------- sheet ----------
  function open(o){css();o=o||{};S.onDone=o.onDone||null;S.draft={};S.done={};S.q="";S.cat="";S.tab=o.tab||"contar";
    var ov=document.createElement("div");ov.className="sk-ov";ov.id="skOv";
    ov.innerHTML='<div class="sk-sh"><div class="sk-hd"><span style="font-size:24px">⚡</span><h2>Conteo rápido</h2><button type="button" data-skx aria-label="Cerrar">×</button></div><div class="sk-tabs" id="skTabs"></div><div class="sk-body" id="skBody"><div class="sk-empty">Cargando…</div></div><div class="sk-ft" id="skFt"></div></div>';
    document.body.appendChild(ov);document.body.style.overflow="hidden";
    ov.addEventListener("click",onClick);ov.addEventListener("input",onInput);
    load();}
  function close(){var o=document.getElementById("skOv");if(o)o.remove();document.body.style.overflow="";var n=Object.keys(S.done).length;if(n&&S.onDone)try{S.onDone();}catch(e){}var v=document.getElementById("hyStock");if(n&&v&&v.parentNode)card(v.parentNode);}
  function load(){return api("/admin/inventory/health").then(function(d){S.d=d;paint();}).catch(function(e){var b=document.getElementById("skBody");if(b)b.innerHTML='<div class="sk-empty">⚠️ '+esc(e.message)+'</div>';});}
  function paint(){var d=S.d;if(!d)return;
    var tabs=[["contar","🔢 Sin contar",d.toCount.filter(function(p){return !S.done[p.id];}).length],["tallas","📏 Tallas",d.sizeIssues.filter(function(p){return !S.done[p.id];}).length],["ventas","🧾 Ventas sin descontar",d.missed.length]];
    document.getElementById("skTabs").innerHTML=tabs.map(function(t){return '<button type="button" data-sktab="'+t[0]+'" class="'+(S.tab===t[0]?"on":"")+'">'+t[1]+(t[2]?'<b>'+t[2]+'</b>':'')+'</button>';}).join("");
    var body=document.getElementById("skBody"),ft=document.getElementById("skFt");
    if(S.tab==="contar"){
      var cats=[];d.toCount.forEach(function(p){if(cats.indexOf(p.categoria)<0)cats.push(p.categoria);});
      var list=d.toCount.filter(function(p){return (!S.cat||p.categoria===S.cat)&&(!S.q||norm(p.nombre+" "+p.categoria).indexOf(norm(S.q))>=0);});
      body.innerHTML='<div class="sk-help">Escribe cuántas hay <b>hoy</b> en tu bodega de cada talla (deja vacío = 0) y toca Guardar. Desde ese momento cada venta en tienda, WhatsApp, Bold o Bre-B se descuenta sola y la página tacha las tallas agotadas.</div>'+
        '<input class="sk-q" id="skQ" placeholder="Buscar prenda…" value="'+esc(S.q)+'">'+
        '<div class="sk-cats"><button type="button" data-skcat="" class="'+(!S.cat?"on":"")+'">Todas</button>'+cats.map(function(c){return '<button type="button" data-skcat="'+esc(c)+'" class="'+(S.cat===c?"on":"")+'">'+esc(c)+'</button>';}).join("")+'</div>'+
        (list.length?list.map(function(p){return itemHtml(p,sizes(p),"Guardar conteo");}).join(""):'<div class="sk-empty">'+(d.toCount.length?"Nada con ese filtro.":"🎉 Todas las prendas tienen inventario.")+'</div>');
    }else if(S.tab==="tallas"){
      body.innerHTML='<div class="sk-help">Estas prendas muestran en la tienda tallas que no están contadas, por eso salen <b>agotadas</b>. Cuéntalas aquí (o corrige las tallas de la prenda en Productos).</div>'+
        (d.sizeIssues.length?d.sizeIssues.map(function(p){return itemHtml({id:p.id,nombre:p.nombre,categoria:"Tallas: "+(p.tallas||"")+" · contadas: "+Object.keys(p.inv).map(function(k){return k+" ("+p.inv[k]+")";}).join(", ")},p.missing,"Guardar tallas");}).join(""):'<div class="sk-empty">✅ Todas las tallas están contadas.</div>');
    }else{
      body.innerHTML='<div class="sk-help">Ventas pagadas de los últimos 30 días que no movieron el inventario. Si la prenda <b>ya está contada</b>, toca “Descontar ahora”. Si no tenía inventario, cuenta lo que hay hoy en la pestaña Sin contar (ya sin esa venta).</div>'+
        (d.missed.length?d.missed.map(function(m,i){var k="m"+i;return '<div class="sk-sale" data-mi="'+i+'"><b>'+esc(m.nombre)+'</b>'+(m.size?' · talla '+esc(m.size):'')+' · ×'+(m.qty||1)+' <span style="opacity:.6">· '+esc(m.ticket)+' · '+esc(when(m.at))+'</span>'+
          '<div class="why '+(m.reason==="no-desconto"?"b":"a")+'">'+(m.reason==="no-desconto"?"Está contada pero esta venta no la descontó (venta guardada sin descontar o con otra talla).":"No tenía inventario cuando se vendió.")+'</div>'+
          (m.reason==="no-desconto"&&!S.done[k]?'<div class="sk-acts"><button type="button" data-skdisc="'+i+'">➖ Descontar ahora</button></div>':S.done[k]?'<div class="sk-acts"><em>✓ Descontada</em></div>':'')+'</div>';}).join(""):'<div class="sk-empty">✅ Todas las ventas de los últimos 30 días descontaron bien.</div>');
    }
    var n=Object.keys(S.draft).filter(function(id){return !S.done[id]&&hasDraft(id);}).length;
    ft.innerHTML=S.tab==="ventas"?'<button type="button" data-skx>Listo</button>':'<button type="button" data-skall'+(n?'':' disabled')+'>✓ Guardar todas las que llené'+(n?' ('+n+')':'')+'</button>';
  }
  function hasDraft(id){var d=S.draft[id];if(!d)return false;for(var k in d)if(String(d[k]).trim()!=="")return true;return false;}
  function itemHtml(p,szs,btn){var dr=S.draft[p.id]||{},done=S.done[p.id];
    return '<div class="sk-it'+(done?' done':'')+'" data-pid="'+esc(p.id)+'" data-sz="'+esc(szs.join("|"))+'">'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="" loading="lazy">':'<div class="ph"></div>')+'<div><div class="nm">'+esc(p.nombre)+'</div><div class="ct">'+esc(p.categoria||"")+(p.precio?' · '+esc(p.precio):'')+'</div>'+
      (done?'<div class="sk-acts"><em>✓ '+esc(done)+'</em></div>':'<div class="sk-szs">'+szs.map(function(z){return '<label class="sk-sz"><span>'+esc(z)+'</span><input inputmode="numeric" pattern="[0-9]*" data-z="'+esc(z)+'" value="'+esc(dr[z]==null?"":dr[z])+'" placeholder="0"></label>';}).join("")+'</div><div class="sk-acts"><button type="button" data-sksave="'+esc(p.id)+'">'+btn+'</button></div>')+'</div></div>';}
  function save(pid){var it=document.querySelector('.sk-it[data-pid="'+pid+'"]');if(!it)return Promise.resolve();var szs=it.dataset.sz.split("|"),dr=S.draft[pid]||{};
    var lines=szs.map(function(z){return {size:z,qty:parseInt(String(dr[z]||"0").replace(/\D/g,""),10)||0};});
    var b=it.querySelector("[data-sksave]");if(b){b.disabled=true;b.textContent="Guardando…";}
    return api("/admin/inventory/move",{method:"POST",body:{kind:"ajuste",pid:pid,lines:lines,note:"Conteo rápido"}}).then(function(r){S.done[pid]=r.total+" unidades guardadas";delete S.draft[pid];paint();})
      .catch(function(e){if(b){b.disabled=false;b.textContent="Reintentar";}toast("⚠️ "+e.message,true);throw e;});}
  function onClick(e){var t=e.target;
    if(t.classList.contains("sk-ov")||t.closest("[data-skx]")){close();return;}
    var b=t.closest("[data-sktab]");if(b){S.tab=b.dataset.sktab;paint();return;}
    b=t.closest("[data-skcat]");if(b){S.cat=b.dataset.skcat;paint();return;}
    b=t.closest("[data-sksave]");if(b){save(b.dataset.sksave).then(function(){toast("✓ Inventario guardado");}).catch(function(){});return;}
    if(t.closest("[data-skall]")){var ids=Object.keys(S.draft).filter(function(id){return !S.done[id]&&hasDraft(id);}),ok=0,p=Promise.resolve();
      ids.forEach(function(id){p=p.then(function(){return save(id).then(function(){ok++;}).catch(function(){});});});p.then(function(){toast("✓ "+ok+" prenda"+(ok===1?"":"s")+" contada"+(ok===1?"":"s"));});return;}
    b=t.closest("[data-skdisc]");if(b){var m=S.d.missed[+b.dataset.skdisc];if(!m)return;b.disabled=true;b.textContent="Descontando…";
      api("/admin/inventory/move",{method:"POST",body:{kind:"tienda",pid:m.pid,lines:[{size:m.size||"Única",qty:m.qty||1}],note:"Venta "+m.ticket+" (descontada después)",ref:m.id}})
        .then(function(){S.done["m"+b.dataset.skdisc]=1;paint();toast("✓ Descontada");}).catch(function(x){b.disabled=false;b.textContent="➖ Descontar ahora";toast("⚠️ "+x.message,true);});return;}
  }
  function onInput(e){var t=e.target;
    if(t.id==="skQ"){S.q=t.value;var pos=t.selectionStart;paint();var q=document.getElementById("skQ");if(q){q.focus();try{q.setSelectionRange(pos,pos);}catch(x){}}return;}
    if(t.dataset.z!=null){var pid=t.closest(".sk-it").dataset.pid;t.value=t.value.replace(/\D/g,"").slice(0,4);(S.draft[pid]=S.draft[pid]||{})[t.dataset.z]=t.value;
      var n=Object.keys(S.draft).filter(function(id){return !S.done[id]&&hasDraft(id);}).length,f=document.querySelector("[data-skall]");if(f){f.disabled=!n;f.textContent="✓ Guardar todas las que llené"+(n?" ("+n+")":"");}}
  }
  window.CanevaStock={card:card,open:open};
})();
