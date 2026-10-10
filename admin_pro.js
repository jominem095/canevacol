/* CANEVA Admin PRO — Inventario + Reportes.
   Shared by admin_movil.html (phone) and admin.html (computer).
   Usage: CanevaPro.mount(element, "inventario" | "reportes", { api, token: () => "...", onChange: () => {} })
   Needs Worker v23 (routes /admin/inventory*, /admin/reports); the "Visitantes" card needs Worker v30 (/admin/visits). */
(function(){
  "use strict";
  var OPT={api:"https://caneva-ai.canevacol.workers.dev",token:function(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}},onChange:function(){}};
  // ---------- helpers ----------
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m];});}
  function norm(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
  function money(n){return "$"+Math.round(Number(n||0)).toLocaleString("es-CO");}
  function short(n){n=Number(n||0);var a=Math.abs(n);if(a>=1e6)return "$"+(n/1e6).toFixed(a>=1e7?0:1).replace(".",",")+" M";if(a>=1e3)return "$"+Math.round(n/1e3)+" mil";return money(n);}
  function num(n){return Number(n||0).toLocaleString("es-CO");}
  function pct(a,b){return b?Math.round(a/b*100):0;}
  function when(iso){return iso?new Date(iso).toLocaleString("es-CO",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}):"";}
  function dayLabel(d){var t=new Date(d+"T12:00:00");return t.toLocaleDateString("es-CO",{day:"numeric",month:"short"});}
  function delta(cur,prev){if(!prev)return cur?'<em class="cp-up">nuevo</em>':"";var d=Math.round((cur-prev)/prev*100);return '<em class="'+(d>=0?"cp-up":"cp-down")+'">'+(d>=0?"▲ ":"▼ ")+Math.abs(d)+'%</em>';}
  function api(path,opts){
    opts=opts||{};
    return fetch(OPT.api+path,{method:opts.method||"GET",headers:{"x-admin-token":OPT.token(),"Content-Type":"application/json"},body:opts.body?JSON.stringify(opts.body):undefined})
      .catch(function(){throw new Error(navigator.onLine===false?"Sin internet. Revisa tu conexión.":"No se pudo conectar con Cloudflare.");})
      .then(function(res){return res.json().catch(function(){return {};}).then(function(d){
        if(res.status===401||res.status===403)throw new Error("Token inválido. Sal y vuelve a entrar con el token.");
        if(res.status===404&&!d.error)throw new Error("Falta actualizar el Worker de Cloudflare (v23).");
        if(res.status===404&&/Ruta no encontrada/.test(d.error||""))throw new Error("Falta pegar el Worker v23 en Cloudflare.");
        if(!res.ok||!d.ok)throw new Error(d.error||("Error "+res.status));return d;});});
  }
  var toastT;
  function toast(msg,err){var t=document.getElementById("cpToast");t.textContent=msg;t.className="cp-toast"+(err?" err":"");clearTimeout(toastT);toastT=setTimeout(function(){t.className="cp-toast cp-hide";},err?8000:4200);}
  function busy(on,msg){var b=document.getElementById("cpBusy");b.className=on?"cp-busy":"cp-busy cp-hide";if(msg)document.getElementById("cpBusyMsg").textContent=msg;}
  function empty(msg){return '<div class="cp-empty">'+msg+'</div>';}
  function errBox(e){var m=e.message||String(e);return /D1|activado/.test(m)?empty(esc(m)+'<br><br>Activa la base de datos D1 (CANEVA_DB) en el Worker.'):empty(esc(m));}
  function catsOf(list){var c={};list.forEach(function(p){if(p.categoria)c[p.categoria]=(c[p.categoria]||0)+1;});return Object.keys(c).sort(function(a,b){return c[b]-c[a]||a.localeCompare(b);}).map(function(k){return {c:k,n:c[k]};});}
  function catChips(list,active,attr){return '<div class="cp-chips">'+[{c:"Todas",n:list.length}].concat(catsOf(list)).map(function(x){return '<button type="button" class="cp-chip '+(x.c===active?"on":"")+'" data-'+attr+'="'+esc(x.c)+'">'+esc(x.c)+' <i>'+x.n+'</i></button>';}).join("")+'</div>';}
  function download(name,rows){
    var q=function(v){var s=String(v==null?"":v);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    var csv="﻿"+rows.map(function(r){return r.map(q).join(";");}).join("\r\n");
    var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    var d=new Date();a.download=name+"-"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+".csv";
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
  }
  // ---------- shared overlay (bottom sheet on phones, centered panel on computers) ----------
  function ensureChrome(){
    if(document.getElementById("cpSheet"))return;
    var st=document.createElement("style");st.id="cpStyle";st.textContent=CSS;document.head.appendChild(st);
    var d=document.createElement("div");
    d.innerHTML='<div id="cpSheetBg" class="cp-sheetbg cp-hide"></div><section id="cpSheet" class="cp-sheet cp-hide" role="dialog" aria-modal="true"><div class="cp-grab"></div><div id="cpSheetBody"></div></section><div id="cpToast" class="cp-toast cp-hide"></div><div id="cpBusy" class="cp-busy cp-hide"><div class="cp-spin"></div><div id="cpBusyMsg">Guardando…</div></div>';
    while(d.firstChild)document.body.appendChild(d.firstChild);
    document.getElementById("cpSheetBg").onclick=closeSheet;
    document.addEventListener("keydown",function(e){if(e.key==="Escape")closeSheet();});
  }
  var sheetHandlers=null;
  function openSheet(html,handlers){ensureChrome();document.getElementById("cpSheetBody").innerHTML=html;sheetHandlers=handlers||{};
    document.getElementById("cpSheetBg").className="cp-sheetbg";document.getElementById("cpSheet").className="cp-sheet";document.getElementById("cpSheet").scrollTop=0;document.body.style.overflow="hidden";}
  function closeSheet(){var s=document.getElementById("cpSheet");if(!s||s.className.indexOf("cp-hide")>=0)return;s.className="cp-sheet cp-hide";document.getElementById("cpSheetBg").className="cp-sheetbg cp-hide";document.body.style.overflow="";if(sheetHandlers&&sheetHandlers.close)sheetHandlers.close();sheetHandlers=null;}
  function bindSheet(){
    var body=document.getElementById("cpSheetBody");
    body.addEventListener("click",function(e){if(e.target.closest("[data-cpclose]"))return closeSheet();if(sheetHandlers&&sheetHandlers.click)sheetHandlers.click(e);});
    body.addEventListener("input",function(e){if(sheetHandlers&&sheetHandlers.input)sheetHandlers.input(e);});
  }

  // =====================================================================
  // INVENTARIO
  // =====================================================================
  var MODES={
    entrada:{t:"➕ Entrada",h:"Llegó mercancía: escribe cuántas unidades nuevas entraron de cada talla.",btn:"Registrar entrada",sign:1},
    tienda:{t:"💵 Venta",h:"Vendiste en persona o por fuera de la página: escribe cuántas salieron.",btn:"Registrar venta",sign:-1},
    ajuste:{t:"✏️ Conteo",h:"Contaste lo que hay en físico: escribe la cantidad REAL de cada talla.",btn:"Guardar conteo",sign:0},
    devolucion:{t:"↩ Devolución",h:"Una clienta devolvió prendas: vuelven al inventario.",btn:"Registrar devolución",sign:1},
    merma:{t:"✖ Daño",h:"Prendas dañadas, perdidas o regaladas: salen del inventario sin venta.",btn:"Registrar salida",sign:-1}
  };
  var ICON={entrada:"➕",tienda:"💵",venta:"🛍",apartado:"🔖",liberado:"↩",devolucion:"↩",merma:"✖",ajuste:"✏️"};
  var I={el:null,data:null,flt:"todas",cat:"Todas",q:"",days:30,sel:null,mode:"entrada",draft:{},extra:[],hist:""};
  function state(p){if(!p.managed)return "sin";if(p.total<=0)return "agotada";if(p.total<=p.low)return "baja";return "ok";}
  function sizesOf(p){var s=p.sizes.slice();Object.keys(p.stock||{}).forEach(function(k){if(s.indexOf(k)<0)s.push(k);});if(s.length>1){var u=s.indexOf("Única");if(u>=0&&!(p.stock&&p.stock["Única"]))s.splice(u,1);}return s;}
  function invLoad(){
    I.el.innerHTML=empty("Cargando inventario…");
    return api("/admin/inventory?days="+I.days).then(function(d){I.data=d;invRender();if(I.sel){var f=d.products.find(function(x){return x.id===I.sel.id;});if(f)I.sel=f;}}).catch(function(e){I.el.innerHTML=errBox(e);});
  }
  function invRender(){
    var D=I.data;if(!D)return;
    var inCat=D.products.filter(function(p){return I.cat==="Todas"||p.categoria===I.cat;});
    var man=inCat.filter(function(p){return p.managed;});
    var units=man.reduce(function(s,p){return s+p.total;},0);
    var vCost=man.reduce(function(s,p){return s+p.total*p.cost;},0),vSale=man.reduce(function(s,p){return s+p.total*p.price;},0);
    var vSaleC=man.filter(function(p){return p.cost;}).reduce(function(s,p){return s+p.total*p.price;},0);
    var noCost=man.filter(function(p){return !p.cost&&p.total>0;}).length;
    var idle=new Set(D.idle||[]);
    var n={agotada:0,baja:0,sin:0,quieta:inCat.filter(function(p){return idle.has(p.id);}).length};
    inCat.forEach(function(p){var s=state(p);if(n[s]!==undefined)n[s]++;});
    var r=D.report||{};
    var top=(r.top||[]).map(function(t,i){return '<div class="cp-top"><span>'+(i+1)+'</span><b>'+esc(t.name)+'</b><em>'+t.units+' und · '+money(t.revenue)+'</em></div>';}).join("");
    I.el.innerHTML=
    '<div class="cp-head"><div><div class="cp-eyeb">Control de mercancía</div><h2 class="cp-h">Inventario</h2></div><div class="cp-actions"><button type="button" class="cp-btn ghost" data-a="moves">🧾 Movimientos</button><button type="button" class="cp-btn ghost" data-a="csv">⇩ Exportar</button></div></div>'+
    catChips(D.products,I.cat,"icat")+
    '<div class="cp-kpis k4">'+
      '<div class="cp-kpi hero"><span>En bodega'+(I.cat!=="Todas"?" · "+esc(I.cat):"")+'</span><b>'+num(units)+'</b><small>unidades · '+man.length+' prendas</small></div>'+
      '<div class="cp-kpi"><span>Vale a precio de venta</span><b>'+short(vSale)+'</b><small>'+money(vSale)+'</small></div>'+
      '<div class="cp-kpi"><span>Te costó</span><b>'+(vCost?short(vCost):"—")+'</b><small>'+(vCost?money(vCost):"Agrega costos para verlo")+'</small></div>'+
      '<div class="cp-kpi gold"><span>Ganancia en bodega</span><b>'+(vCost?short(vSaleC-vCost):"—")+'</b><small>'+(vCost?"margen "+pct(vSaleC-vCost,vSaleC)+"%":"")+(noCost?(vCost?" · ":"")+noCost+" sin costo":"")+'</small></div>'+
    '</div>'+
    '<div class="cp-alerts">'+
      [["agotada","red","Agotadas"],["baja","amber","Por agotarse"],["quieta","","Sin vender 60 días"],["sin","","Sin contar"]].map(function(a){return '<button type="button" data-if="'+a[0]+'" class="cp-alert '+a[1]+' '+(I.flt===a[0]?"on":"")+'"><b>'+n[a[0]]+'</b>'+a[2]+'</button>';}).join("")+
    '</div>'+
    '<div class="cp-card"><div class="cp-cardh"><span class="cp-eyeb">Ventas por inventario</span><div class="cp-seg mini">'+[7,30,90].map(function(d){return '<button type="button" data-days="'+d+'" class="'+(d===I.days?"on":"")+'">'+d+' días</button>';}).join("")+'</div></div>'+
      '<div class="cp-g4"><div><b>'+money(r.revenue)+'</b><span>Vendido</span></div><div><b>'+(r.cost?money(r.profit):"—")+'</b><span>Ganancia</span></div><div><b>'+(r.cost?pct(r.profit,r.costed)+"%":"—")+'</b><span>Margen</span></div><div><b>'+(r.units||0)+'</b><span>Unidades</span></div></div>'+
      (r.uncosted>0?'<p class="cp-hint">'+money(r.uncosted)+' vendidos en prendas sin costo: agrégalo para ver la ganancia completa.</p>':"")+
      (top?'<div class="cp-eyeb" style="margin-top:12px">Lo más vendido</div>'+top:'<p class="cp-hint">Aquí verás lo más vendido: ventas web pagadas, ventas en tienda y apartados.</p>')+
    '</div>'+
    '<div class="cp-tools"><input class="cp-search" type="search" data-iq placeholder="Buscar prenda o talla…" value="'+esc(I.q)+'">'+
      '<div class="cp-seg">'+[["todas","Todas"],["ok","Con stock"],["baja","Bajas"],["agotada","Agotadas"],["sin","Sin contar"]].map(function(x){return '<button type="button" data-if="'+x[0]+'" class="'+(I.flt===x[0]?"on":"")+'">'+x[1]+'</button>';}).join("")+'</div></div>'+
    '<div class="cp-listhead"><span></span><span>Prenda</span><span>Tallas</span><span class="r">Costo</span><span class="r">Margen</span><span class="r">Unidades</span></div>'+
    '<div id="cpInvList"></div>';
    invList();
  }
  function invList(){
    var D=I.data,q=norm(I.q),idle=new Set(D.idle||[]),order={agotada:0,baja:1,ok:2,sin:3};
    var rows=D.products.filter(function(p){var s=state(p);
      if(I.cat!=="Todas"&&p.categoria!==I.cat)return false;
      if(I.flt==="quieta"&&!idle.has(p.id))return false;
      if(["todas","quieta"].indexOf(I.flt)<0&&s!==I.flt)return false;
      return !q||norm(p.nombre+" "+p.categoria+" "+Object.keys(p.stock||{}).join(" ")).indexOf(q)>=0;
    }).sort(function(a,b){return order[state(a)]-order[state(b)]||a.nombre.localeCompare(b.nombre);});
    var el=document.getElementById("cpInvList");
    el.innerHTML=rows.length?rows.map(function(p){var s=state(p);
      var chips=p.managed?sizesOf(p).map(function(z){var q=(p.stock||{})[z]||0;return '<span class="cp-sz '+(q<=0?"z":q<=Math.max(1,Math.floor(p.low/2))?"l":"")+'">'+esc(z)+'<i>'+q+'</i></span>';}).join(""):'<span class="cp-sz none">Toca para contar</span>';
      var margin=p.cost&&p.price?pct(p.price-p.cost,p.price):null;
      return '<div class="cp-row st-'+s+'" data-ipid="'+esc(p.id)+'" role="button" tabindex="0">'+
        '<div class="cp-th">'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="" loading="lazy">':"")+'</div>'+
        '<div class="cp-info"><b>'+esc(p.nombre)+'</b><small>'+esc(p.categoria)+' · '+esc(p.precio)+(p.hidden?' · <span class="cp-bad">oculta</span>':"")+'<span class="cp-m"> · '+(p.cost?"costo "+money(p.cost):"sin costo")+'</span></small><div class="cp-szs cp-m">'+chips+'</div></div>'+
        '<div class="cp-szs cp-d">'+chips+'</div>'+
        '<div class="r cp-d cp-dim">'+(p.cost?money(p.cost):"—")+'</div>'+
        '<div class="r cp-d">'+(margin===null?'<span class="cp-dim">—</span>':margin+"%")+'</div>'+
        '<div class="cp-tot">'+(p.managed?'<b>'+p.total+'</b><small>'+(s==="agotada"?"AGOTADA":s==="baja"?"POR AGOTARSE":"unid.")+'</small>':'<span class="cp-none">'+(/atelier/i.test(p.categoria)?"BAJO PEDIDO":"SIN CONTAR")+'</span>')+'</div></div>';
    }).join(""):empty("No hay prendas con ese filtro.");
  }
  function invOpen(pid){
    var p=I.data.products.find(function(x){return x.id===pid;});if(!p)return;
    I.sel=p;I.mode=p.managed?"entrada":"ajuste";I.draft={};I.extra=[];I.hist="";
    openSheet(invSheetHtml(),{click:invSheetClick,input:invSheetInput,close:function(){I.sel=null;}});
    invCalc();invHistory(pid);
  }
  function after(z){var p=I.sel,m=MODES[I.mode],cur=(p.stock||{})[z]||0,v=parseInt(I.draft[z],10);if(I.mode==="ajuste")return isNaN(v)?(p.managed?cur:0):v;return cur+(isNaN(v)?0:v)*m.sign;}
  function invSheetHtml(){
    var p=I.sel,m=MODES[I.mode];
    var sizes=sizesOf(p).concat(I.extra.filter(function(z){return sizesOf(p).indexOf(z)<0;}));
    var cur=function(z){return (p.stock||{})[z]||0;};
    var val=function(z){return I.draft[z]!==undefined?I.draft[z]:(I.mode==="ajuste"&&p.managed?String(cur(z)):"");};
    var margin=p.cost&&p.price?pct(p.price-p.cost,p.price):null;
    return '<div class="cp-shead">'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="">':"<div></div>")+'<div style="flex:1;min-width:0"><div class="cp-eyeb">'+esc(p.categoria)+'</div><h3 class="cp-h3">'+esc(p.nombre)+'</h3>'+
      '<div class="cp-dim" style="font-size:13px">'+esc(p.precio)+(p.cost?' · costo '+money(p.cost)+' · <b class="cp-ok">margen '+margin+'%</b>':" · sin costo")+'</div>'+
      '<div class="cp-big">'+(p.managed?'<b>'+p.total+'</b> unidades':'<span class="cp-bad">Sin inventario todavía</span>')+'</div></div><button type="button" class="cp-x" data-cpclose>✕</button></div>'+
      (p.managed?"":'<div class="cp-note">Escribe cuántas hay <b>hoy</b> de cada talla y toca <b>Guardar conteo</b>. Desde ahí la tienda descuenta sola cada venta y oculta las tallas agotadas.</div>')+
      '<div class="cp-modes">'+Object.keys(MODES).filter(function(k){return p.managed||k==="ajuste";}).map(function(k){return '<button type="button" data-im="'+k+'" class="'+(k===I.mode?"on":"")+'">'+MODES[k].t+'</button>';}).join("")+'</div>'+
      '<p class="cp-hint" style="margin:8px 0 4px">'+m.h+'</p>'+
      '<div>'+sizes.map(function(z){return '<div class="cp-szr"><span class="cp-szn">'+esc(z)+'</span><span class="cp-szc">hay <b>'+cur(z)+'</b></span>'+
        '<div class="cp-step"><button type="button" data-st="-1" data-z="'+esc(z)+'">−</button><input inputmode="numeric" data-z="'+esc(z)+'" value="'+esc(val(z))+'" placeholder="0"><button type="button" data-st="1" data-z="'+esc(z)+'">+</button></div>'+
        '<span class="cp-szf">→ 0</span></div>';}).join("")+'</div>'+
      '<div class="cp-addsz"><input id="cpNewSz" placeholder="Otra talla (ej: 18, XL)" maxlength="8"><button type="button" data-a="addsz">+ Talla</button></div>'+
      (I.mode==="entrada"?'<div class="cp-field"><label>Costo por unidad (lo que te costó)</label><input id="cpCost" inputmode="numeric" value="'+(p.cost||"")+'" placeholder="Ej: 45000"></div>':"")+
      (I.mode==="tienda"||I.mode==="devolucion"?'<div class="cp-field"><label>Precio por unidad</label><input id="cpPrice" inputmode="numeric" value="'+(p.price||"")+'"></div>':"")+
      '<div class="cp-field"><label>Nota (opcional)</label><input id="cpNote" maxlength="200" placeholder="'+(I.mode==="entrada"?"Ej: Pedido proveedor Medellín":I.mode==="tienda"?"Ej: Venta a Laura en el local":"Ej: detalle")+'"></div>'+
      '<div class="cp-prev">Quedarán <b id="cpPrevN">0</b> unidades'+(p.managed?' (hoy '+p.total+')':"")+'</div>'+
      '<button type="button" class="cp-btn full" data-a="go" id="cpGo" disabled>'+m.btn+'</button>'+
      '<details class="cp-cfg"><summary>Ajustes de esta prenda</summary><div class="cp-2"><div class="cp-field"><label>Costo por unidad</label><input id="cpCfgCost" inputmode="numeric" value="'+(p.cost||"")+'" placeholder="0"></div>'+
        '<div class="cp-field"><label>Avisar cuando queden</label><input id="cpCfgMin" inputmode="numeric" value="'+(p.min===null?"":p.min)+'" placeholder="'+I.data.lowDefault+' (general)"></div></div>'+
        '<button type="button" class="cp-btn ghost full" data-a="meta">Guardar ajustes</button>'+(p.managed?'<button type="button" class="cp-btn danger full" data-a="untrack">Dejar de controlar esta prenda</button>':"")+'</details>'+
      '<div class="cp-sect">Historial</div><div id="cpHist">'+(I.hist||empty("Cargando…"))+'</div>'+
      '<button type="button" class="cp-btn ghost full" data-cpclose>Cerrar</button>';
  }
  function invRerender(){var h=document.getElementById("cpHist");if(h)I.hist=h.innerHTML;document.getElementById("cpSheetBody").innerHTML=invSheetHtml();invCalc();}
  function invCalc(){
    var p=I.sel,go=document.getElementById("cpGo");if(!p||!go)return;var total=0,changed=false;
    document.querySelectorAll("#cpSheetBody input[data-z]").forEach(function(i){var z=i.dataset.z,a=Math.max(0,after(z)),cur=(p.stock||{})[z]||0;total+=a;
      var f=i.closest(".cp-szr").querySelector(".cp-szf");f.textContent="→ "+a;f.classList.toggle("cp-bad",a<=0);
      if(I.draft[z]!==undefined&&I.draft[z]!==""&&(I.mode==="ajuste"?(!p.managed||parseInt(I.draft[z],10)!==cur):parseInt(I.draft[z],10)>0))changed=true;});
    document.getElementById("cpPrevN").textContent=total;go.disabled=!changed;
  }
  function invSheetInput(e){
    var i=e.target.closest("input[data-z]");if(!i)return;var c=i.value.replace(/[^\d]/g,"");if(c!==i.value)i.value=c;
    var z=i.dataset.z,have=(I.sel.stock||{})[z]||0;
    if(MODES[I.mode].sign<0&&parseInt(c,10)>have){i.value=String(have);toast("Talla "+z+": solo hay "+have+".",true);}
    I.draft[z]=i.value;invCalc();
  }
  function invSheetClick(e){
    var b;
    if((b=e.target.closest("[data-im]"))){I.mode=b.dataset.im;I.draft={};return invRerender();}
    if((b=e.target.closest("[data-st]"))){var z=b.dataset.z,p=I.sel,i=b.parentNode.querySelector("input");
      var base=i.value!==""?parseInt(i.value,10):(I.mode==="ajuste"?((p.stock||{})[z]||0):0);var v=base+Number(b.dataset.st);if(v<0)v=0;if(MODES[I.mode].sign<0)v=Math.min(v,(p.stock||{})[z]||0);
      i.value=String(v);I.draft[z]=i.value;return invCalc();}
    if(!(b=e.target.closest("[data-a]")))return;
    var a=b.dataset.a;
    if(a==="addsz"){var nz=document.getElementById("cpNewSz").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);if(!nz)return;if(I.extra.indexOf(nz)<0&&sizesOf(I.sel).indexOf(nz)<0)I.extra.push(nz);if(I.mode!=="ajuste"&&I.mode!=="entrada")I.mode="entrada";return invRerender();}
    if(a==="go")return invSubmit();
    if(a==="meta")return invMeta();
    if(a==="untrack")return invUntrack();
  }
  function invHistory(pid){
    api("/admin/inventory/moves?limit=30&pid="+encodeURIComponent(pid)).then(function(d){I.hist=movesHtml(d.moves,false);var h=document.getElementById("cpHist");if(h&&I.sel&&I.sel.id===pid)h.innerHTML=I.hist;})
      .catch(function(e){var h=document.getElementById("cpHist");if(h)h.innerHTML=empty(esc(e.message));});
  }
  function movesHtml(moves,withName){
    if(!moves.length)return empty("Todavía no hay movimientos.");
    return moves.map(function(m){return '<div class="cp-mv"><span class="cp-mi">'+(ICON[m.kind]||"•")+'</span><div><b>'+esc(m.label)+'</b>'+(withName?' · '+esc(m.name):"")+'<br><small>'+esc(when(m.createdAt))+(m.ref?' · '+esc(m.ref.toUpperCase()):"")+(m.note?' · '+esc(m.note):"")+(m.unitPrice&&m.delta<0?' · '+money(m.unitPrice*-m.delta):"")+'</small></div>'+
      '<div class="cp-md"><b class="'+(m.delta<0?"cp-bad":"cp-ok")+'">'+(m.delta>0?"+":"")+m.delta+'</b><small>'+(m.size==="Única"?"":"T. "+esc(m.size))+' → '+m.after+'</small></div></div>';}).join("");
  }
  function invSubmit(){
    var p=I.sel,m=MODES[I.mode];
    var sizes=sizesOf(p).concat(I.extra);
    // In a count every listed size is saved (blank = current or 0)
    var lines=sizes.map(function(z){return {size:z,qty:I.draft[z]!==undefined&&I.draft[z]!==""?I.draft[z]:(I.mode==="ajuste"?String((p.stock||{})[z]||0):"")};}).filter(function(l){return l.qty!=="";});
    var body={pid:p.id,kind:I.mode,lines:lines,note:(document.getElementById("cpNote")||{}).value||""};
    var c=document.getElementById("cpCost");if(c)body.cost=c.value.replace(/[^\d]/g,"");
    var pr=document.getElementById("cpPrice");if(pr)body.unitPrice=pr.value.replace(/[^\d]/g,"");
    var n=lines.reduce(function(s,l){return s+(parseInt(l.qty,10)||0);},0);
    if(I.mode!=="ajuste"&&!confirm(m.btn+": "+n+" unidad"+(n===1?"":"es")+' de "'+p.nombre+'"?'))return;
    busy(true,"Guardando…");
    api("/admin/inventory/move",{method:"POST",body:body}).then(function(d){busy(false);toast("Listo ✓ · quedan "+d.total+" unidades");
      var pid=p.id;return invLoad().then(function(){var f=I.data&&I.data.products.find(function(x){return x.id===pid;});if(f&&I.sel){I.sel=f;I.draft={};I.extra=[];I.mode="entrada";I.hist="";invRerender();invHistory(pid);}OPT.onChange();});})
      .catch(function(e){busy(false);toast("Error: "+e.message,true);});
  }
  function invMeta(){
    var p=I.sel;
    api("/admin/inventory/meta",{method:"POST",body:{pid:p.id,cost:document.getElementById("cpCfgCost").value.replace(/[^\d]/g,""),min:document.getElementById("cpCfgMin").value.replace(/[^\d]/g,"")}})
      .then(function(){toast("Ajustes guardados ✓");return invLoad().then(function(){if(I.sel)invRerender();});}).catch(function(e){toast("Error: "+e.message,true);});
  }
  function invUntrack(){
    if(!confirm('¿Dejar de controlar el inventario de "'+I.sel.nombre+'"? El historial se conserva, pero la tienda dejará de descontar sus ventas.'))return;
    api("/admin/inventory/untrack",{method:"POST",body:{pid:I.sel.id}}).then(function(){toast("Listo, ya no se controla");closeSheet();invLoad();OPT.onChange();}).catch(function(e){toast("Error: "+e.message,true);});
  }
  function invMoves(kind){
    var kinds=[["","Todos"],["venta","🛍 Web"],["tienda","💵 Tienda"],["entrada","➕ Entradas"],["apartado","🔖 Apartados"],["ajuste","✏️ Conteos"],["merma","✖ Daños"],["devolucion","↩ Devol."]];
    openSheet('<div class="cp-shead"><div style="flex:1"><div class="cp-eyeb">Inventario</div><h3 class="cp-h3">Movimientos</h3><div class="cp-dim" style="font-size:13px">Todo lo que entró y salió, con fecha y motivo.</div></div><button type="button" class="cp-x" data-cpclose>✕</button></div>'+
      '<div class="cp-modes">'+kinds.map(function(k){return '<button type="button" data-mk="'+k[0]+'" class="'+(k[0]===(kind||"")?"on":"")+'">'+k[1]+'</button>';}).join("")+'</div><div id="cpMvList" style="margin-top:8px">'+empty("Cargando…")+'</div>',
      {click:function(e){var b=e.target.closest("[data-mk]");if(b)invMoves(b.dataset.mk);}});
    api("/admin/inventory/moves?limit=150"+(kind?"&kind="+kind:"")).then(function(d){document.getElementById("cpMvList").innerHTML=movesHtml(d.moves,true);}).catch(function(e){document.getElementById("cpMvList").innerHTML=empty(esc(e.message));});
  }
  function invCsv(){
    var rows=[["Prenda","Categoría","Talla","Unidades","Costo unidad","Precio unidad","Valor a costo","Valor de venta","Estado"]];
    I.data.products.filter(function(p){return p.managed&&(I.cat==="Todas"||p.categoria===I.cat);}).forEach(function(p){sizesOf(p).forEach(function(z){var u=(p.stock||{})[z]||0;
      rows.push([p.nombre,p.categoria,z,u,p.cost,p.price,u*p.cost,u*p.price,{agotada:"Agotada",baja:"Por agotarse",ok:"Con stock"}[state(p)]]);});});
    download("inventario-caneva",rows);
  }
  function invClick(e){
    var b;
    if((b=e.target.closest("[data-icat]"))){I.cat=b.dataset.icat;return invRender();}
    if((b=e.target.closest("[data-if]"))){I.flt=(b.classList.contains("cp-alert")&&I.flt===b.dataset.if)?"todas":b.dataset.if;return invRender();}
    if((b=e.target.closest("[data-days]"))){I.days=Number(b.dataset.days);return invLoad();}
    if((b=e.target.closest("[data-a]"))){if(b.dataset.a==="moves")return invMoves("");if(b.dataset.a==="csv")return invCsv();}
    if((b=e.target.closest("[data-ipid]")))invOpen(b.dataset.ipid);
  }

  // =====================================================================
  // REPORTES
  // =====================================================================
  var CLICK_LABEL={whatsapp_prenda:"WhatsApp desde una prenda",whatsapp_bolsa:"WhatsApp con la bolsa",whatsapp:"WhatsApp (botón general)",compartir:"Compartir prenda",compartir_historia:"Historia Instagram / TikTok",
    compartir_red:"Compartir en otra red",apartar:"Apartar",probador:"Probador virtual",regalo:"Tarjeta Regalo",club:"Club Caneva",club_login:"Ingresos al Club",caneva_ai:"Abrir Caneva AI",ai_mensaje:"Mensajes a Caneva AI",
    ver_bolsa:"Ver la bolsa",red_instagram:"Ir a Instagram",red_tiktok:"Ir a TikTok",red_facebook:"Ir a Facebook",buscar:"Búsquedas"};
  var SRC_LABEL={directo:"Directo / guardado",instagram:"Instagram",tiktok:"TikTok",facebook:"Facebook",whatsapp:"WhatsApp",google:"Google"};
  var R={el:null,data:null,days:30,cat:"Todas",q:"",sort:"views",dir:-1};
  function repLoad(){
    R.el.innerHTML=empty("Cargando reportes…");
    return api("/admin/reports?days="+R.days).then(function(d){R.data=d;repRender();}).catch(function(e){R.el.innerHTML=errBox(e);});
  }
  function bars(list,labels,unit){
    var max=Math.max.apply(null,list.map(function(x){return x.n;}).concat([1]));
    return list.length?list.map(function(x){return '<div class="cp-hbar" title="'+esc((labels[x.key]||x.key)+": "+num(x.n)+(unit||""))+'"><span class="cp-hl">'+esc(labels[x.key]||x.key)+'</span><span class="cp-ht"><i style="width:'+Math.max(2,Math.round(x.n/max*100))+'%"></i></span><b>'+num(x.n)+'</b></div>';}).join(""):empty("Sin datos todavía.");
  }
  function chart(byDay){
    var max=Math.max.apply(null,byDay.map(function(d){return d.visitors;}).concat([1]));
    var W=Math.max(byDay.length*14,280),H=150,bw=Math.max(3,Math.min(22,(W/byDay.length)-3)),step=W/byDay.length;
    var ticks=[0,Math.round(max/2),max];
    var bars=byDay.map(function(d,i){var h=Math.round(d.visitors/max*(H-24));var x=i*step+(step-bw)/2;
      return '<g class="cp-bar" data-tip="'+esc(dayLabel(d.day)+" · "+num(d.visitors)+" visitantes · "+num(d.views)+" visitas")+'"><rect x="'+(i*step)+'" y="0" width="'+step+'" height="'+H+'" fill="transparent"></rect>'+
        (h>0?'<path d="M'+x+','+H+' V'+(H-h+Math.min(4,h))+' q0,-'+Math.min(4,h)+' '+Math.min(4,bw/2)+',-'+Math.min(4,h)+' H'+(x+bw-Math.min(4,bw/2))+' q'+Math.min(4,bw/2)+',0 '+Math.min(4,bw/2)+','+Math.min(4,h)+' V'+H+' Z"></path>':"")+'</g>';}).join("");
    var lbl=byDay.length>1?'<div class="cp-axis"><span>'+dayLabel(byDay[0].day)+'</span><span>'+dayLabel(byDay[byDay.length-1].day)+'</span></div>':"";
    return '<div class="cp-chartwrap"><div class="cp-yax">'+ticks.reverse().map(function(t){return "<span>"+num(t)+"</span>";}).join("")+'</div><div class="cp-chart"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Visitantes por día">'+
      '<line x1="0" x2="'+W+'" y1="'+(H-0.5)+'" y2="'+(H-0.5)+'" class="cp-base"></line><line x1="0" x2="'+W+'" y1="'+((H-24)/2+24)+'" y2="'+((H-24)/2+24)+'" class="cp-grid"></line>'+bars+'</svg>'+lbl+'<div class="cp-tip cp-hide" id="cpTip"></div></div></div>';
  }
  function repRender(){
    var D=R.data,t=D.totals;
    var conv=t.visitors?(t.orders/t.visitors*100):0;
    var funnel=[["Visitantes",t.visitors],["Vieron una prenda",t.productViews],["Agregaron a la bolsa",t.carts],["Escribieron por WhatsApp",t.whatsapp],["Pedidos pagados",t.orders]];
    var fmax=Math.max(funnel[0][1],1);
    var ps=D.products.filter(function(p){return R.cat==="Todas"||p.categoria===R.cat;});
    var pot=ps.reduce(function(s,p){return s+(p.potentialProfit||0);},0),stockVal=ps.reduce(function(s,p){return s+(p.stockValue||0);},0);
    var devs=D.devices||[],dtot=devs.reduce(function(s,d){return s+d.n;},0);
    R.el.innerHTML=
    '<div class="cp-head"><div><div class="cp-eyeb">Cómo va la tienda</div><h2 class="cp-h">Reportes</h2></div><div class="cp-seg">'+[[1,"Hoy"],[7,"7 días"],[30,"30 días"],[90,"90 días"]].map(function(x){return '<button type="button" data-rdays="'+x[0]+'" class="'+(x[0]===R.days?"on":"")+'">'+x[1]+'</button>';}).join("")+'</div></div>'+
    (!D.trackingSince?'<div class="cp-note">Las visitas y los clics se empiezan a contar desde que se publica la tienda con el medidor (index.html nuevo + Worker v23). Las ventas ya se ven.</div>':(D.trackingSince>D.from?'<div class="cp-note">Midiendo visitas desde el '+esc(dayLabel(D.trackingSince))+'. Antes de esa fecha no hay datos de visitas.</div>':""))+
    '<div class="cp-kpis k6">'+
      '<div class="cp-kpi"><span>Visitantes</span><b>'+num(t.visitors)+'</b><small>'+delta(t.visitors,t.visitorsPrev)+' vs período anterior</small></div>'+
      '<div class="cp-kpi"><span>Visitas</span><b>'+num(t.views)+'</b><small>'+delta(t.views,t.viewsPrev)+' páginas vistas</small></div>'+
      '<div class="cp-kpi gold"><span>Ventas pagadas</span><b>'+short(t.revenue)+'</b><small>'+delta(t.revenue,t.revenuePrev)+' '+money(t.revenue)+'</small></div>'+
      '<div class="cp-kpi"><span>Pedidos pagados</span><b>'+num(t.orders)+'</b><small>'+delta(t.orders,t.ordersPrev)+' · ticket '+(t.orders?short(t.revenue/t.orders):"—")+'</small></div>'+
      '<div class="cp-kpi"><span>Conversión</span><b>'+(t.visitors?conv.toFixed(1).replace(".",",")+"%":"—")+'</b><small>pedidos por cada 100 visitantes</small></div>'+
      '<div class="cp-kpi"><span>Por cobrar</span><b>'+num(t.pending)+'</b><small>pedidos pendientes</small></div>'+
    '</div>'+
    '<div class="cp-card cp-vis" id="cpVis">'+empty("Cargando visitantes…")+'</div>'+
    '<div class="cp-grid2">'+
      '<div class="cp-card"><div class="cp-cardh"><span class="cp-eyeb">Visitantes por día</span><span class="cp-dim" style="font-size:12px">pasa el dedo o el mouse</span></div>'+chart(D.byDay)+'</div>'+
      '<div class="cp-card"><div class="cp-cardh"><span class="cp-eyeb">Embudo de compra</span></div>'+funnel.map(function(f,i){return '<div class="cp-fun"><div class="cp-funl"><span>'+f[0]+'</span><b>'+num(f[1])+'</b>'+(i?'<em>'+pct(f[1],funnel[0][1])+'%</em>':"")+'</div><div class="cp-funt"><i style="width:'+Math.max(f[1]?2:0,Math.round(f[1]/fmax*100))+'%"></i></div></div>';}).join("")+'</div>'+
    '</div>'+
    '<div class="cp-grid3">'+
      '<div class="cp-card"><div class="cp-cardh"><span class="cp-eyeb">Clics en la tienda</span></div>'+bars(D.clicks,CLICK_LABEL)+'</div>'+
      '<div class="cp-card"><div class="cp-cardh"><span class="cp-eyeb">De dónde llegan</span></div>'+bars(D.sources,SRC_LABEL)+
        (dtot?'<div class="cp-eyeb" style="margin-top:16px">Dispositivo</div><div class="cp-split">'+devs.map(function(d){return '<i style="width:'+pct(d.n,dtot)+'%" class="'+(d.key==="celular"?"a":"b")+'" title="'+esc(d.key+": "+pct(d.n,dtot)+"%")+'"></i>';}).join("")+'</div><div class="cp-splitl">'+devs.map(function(d){return '<span><i class="'+(d.key==="celular"?"a":"b")+'"></i>'+esc(d.key)+' '+pct(d.n,dtot)+'%</span>';}).join("")+'</div>':"")+'</div>'+
      '<div class="cp-card"><div class="cp-cardh"><span class="cp-eyeb">Lo más visto</span></div>'+repTop("views","vistas")+'<div class="cp-eyeb" style="margin-top:14px">Lo más vendido</div>'+repTop("soldUnits","vendidas")+'</div>'+
    '</div>'+
    '<div class="cp-card" style="margin-top:14px"><div class="cp-cardh"><div><span class="cp-eyeb">Productos</span><div class="cp-dim" style="font-size:12.5px;margin-top:4px">Ganancia posible con lo que hay en bodega: <b style="color:var(--w)">'+(pot?money(pot):"—")+'</b> · Vale en bodega: <b style="color:var(--w)">'+(stockVal?money(stockVal):"—")+'</b></div></div><button type="button" class="cp-btn ghost" data-a="rcsv">⇩ Exportar</button></div>'+
      catChips(D.products,R.cat,"rcat")+
      '<input class="cp-search" style="margin-top:10px" type="search" data-rq placeholder="Buscar prenda…" value="'+esc(R.q)+'">'+
      '<div id="cpRepTable"></div></div>';
    repTable();
    visLoad();
  }
  // ---------- Visitantes: detailed journey of each visitor (Worker v30, kept 30 days) ----------
  var V={q:"",f:"",n:20,data:null,t:null,map:true,lmap:null,full:false};
  // Coordinates of a visit: exact GPS when she allowed it, otherwise the approximate point of her internet connection
  function vGeo(v){
    var ex=String(v.ubicacion_exacta||""),ap=String(v.coordenadas_aprox||""),s=ex||ap;if(!s)return null;
    var m=s.split(",").map(Number);if(m.length!==2||!isFinite(m[0])||!isFinite(m[1]))return null;
    return {lat:m[0],lon:m[1],exact:!!ex,acc:Number(v.precision_metros)||0,txt:m[0].toFixed(ex?6:4)+", "+m[1].toFixed(ex?6:4)};
  }
  function loadLeaflet(){
    if(window.L)return Promise.resolve();
    return new Promise(function(ok,ko){
      var css=document.createElement("link");css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(css);
      var sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";sc.onload=ok;sc.onerror=function(){ko(new Error("No se pudo cargar el mapa."));};document.head.appendChild(sc);
    });
  }
  function visMap(){
    var box=document.getElementById("cpVisMap");if(!box)return;
    var all=(V.data.visits||[]).map(function(v,i){var g=vGeo(v);return g?{g:g,v:v,i:i}:null;}).filter(Boolean);
    var stat=document.getElementById("cpVisMapStat");
    if(!all.length){box.innerHTML=empty("Ninguna visita de este filtro trae coordenadas todavía.");if(stat)stat.innerHTML="";return;}
    // Group visits by place: exact points stay alone, approximate points of the same zone become one bubble
    var groups={};all.forEach(function(p){var k=p.g.exact?"x"+p.i:p.g.lat.toFixed(2)+","+p.g.lon.toFixed(2);(groups[k]=groups[k]||{lat:p.g.lat,lon:p.g.lon,exact:p.g.exact,items:[]}).items.push(p);});
    var G=Object.keys(groups).map(function(k){return groups[k];});
    var cities={};all.forEach(function(p){var c=p.v.ciudad||"Sin ciudad";cities[c]=(cities[c]||0)+1;});
    var top=Object.keys(cities).sort(function(x,y){return cities[y]-cities[x];});
    var exact=all.filter(function(p){return p.g.exact;}).length,live=all.filter(function(p){return Date.now()-p.v.ts<30*60000;}).length;
    if(stat)stat.innerHTML='<div class="cp-mstat"><b>'+num(all.length)+'</b><span>en el mapa</span></div><div class="cp-mstat"><b>'+num(top.length)+'</b><span>ciudades</span></div><div class="cp-mstat"><b>'+num(exact)+'</b><span>exactas</span></div><div class="cp-mstat live"><b>'+num(live)+'</b><span>últimos 30 min</span></div>'+
      '<div class="cp-mcities">'+top.slice(0,8).map(function(c,i){return '<button type="button" data-vcity="'+esc(c)+'"><em>'+(i+1)+'</em>'+esc(c)+'<i>'+cities[c]+'</i></button>';}).join("")+'</div>';
    loadLeaflet().then(function(){
      if(V.lmap){try{V.lmap.remove();}catch(e){}V.lmap=null;}
      box.innerHTML="";var map=L.map(box,{scrollWheelZoom:false,zoomControl:true,attributionControl:true,worldCopyJump:true});V.lmap=map;
      // Free OpenStreetMap tiles (no key), darkened with CSS to match the black admin
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,className:"cp-darktiles",attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
      var bounds=[],max=Math.max.apply(null,G.map(function(g){return g.items.length;}));
      G.forEach(function(g){
        var n=g.items.length,isLive=g.items.some(function(p){return Date.now()-p.v.ts<30*60000;});
        var size=g.exact?18:Math.round(24+Math.sqrt(n/max)*38);
        var html='<div class="cp-pin'+(g.exact?" ex":"")+(isLive?" live":"")+'" style="width:'+size+'px;height:'+size+'px"><span>'+(g.exact?"":n)+'</span></div>';
        var mk=L.marker([g.lat,g.lon],{icon:L.divIcon({className:"cp-pinw",html:html,iconSize:[size,size],iconAnchor:[size/2,size/2]}),riseOnHover:true}).addTo(map);
        var first=g.items[0].v;
        mk.bindTooltip((g.exact?"📍 "+esc(vTitle(first))+" · exacta":esc(first.ciudad||"Zona")+" · "+n+(n>1?" visitas":" visita")),{direction:"top",offset:[0,-size/2]});
        if(n===1)mk.on("click",function(){visOpen(g.items[0].i);});
        else mk.bindPopup('<div class="cp-mpop"><b>'+esc(first.ciudad||"Zona")+' · '+n+' visitas</b>'+g.items.slice(0,12).map(function(p){return '<button type="button" data-mvi="'+p.i+'">'+esc(vTitle(p.v))+'<small>'+esc(vTime(p.v))+(p.v.idea_para_dm?' · 💡':'')+'</small></button>';}).join("")+(n>12?'<small>y '+(n-12)+' más…</small>':'')+'</div>',{maxWidth:260});
        bounds.push([g.lat,g.lon]);
      });
      map.on("popupopen",function(e){var el=e.popup.getElement();if(el)el.addEventListener("click",function(ev){var b=ev.target.closest("[data-mvi]");if(b){map.closePopup();visOpen(Number(b.dataset.mvi));}});});
      if(bounds.length===1)map.setView(bounds[0],12);else map.fitBounds(bounds,{padding:[40,40],maxZoom:13});
      V.lbounds=bounds;
      setTimeout(function(){map.invalidateSize();},80);
    }).catch(function(e){box.innerHTML=empty(esc(e.message));});
  }
  var VF=[["","Todos","total"],["ig","💌 Con Instagram","ig"],["wa","💬 Escribieron","wa"],["bag","🛍 Dejaron bolsa","bag"],["geo","📍 Con ubicación","geo"]];
  function visDays(){return Math.min(30,R.days||7);}
  function visLoad(){
    var el=document.getElementById("cpVis");if(!el)return;
    return api("/admin/visits?days="+visDays()+"&f="+encodeURIComponent(V.f)+"&q="+encodeURIComponent(V.q)).then(function(d){V.data=d;visRender();})
      .catch(function(e){var m=e.message||"";if(/Worker|Ruta|404/.test(m))m="Para ver los visitantes aquí, pega el Worker v30 en Cloudflare.";el.innerHTML='<div class="cp-cardh"><span class="cp-eyeb">Visitantes en detalle</span></div>'+empty(esc(m));});
  }
  function vTitle(v){return v.instagram||(v.clienta?String(v.clienta).split(" · ")[0]:"")||"Visitante"+(v.ciudad?" de "+v.ciudad:"");}
  function vTime(v){var d=new Date(v.ts);return d.toLocaleDateString("es-CO",{day:"numeric",month:"short"})+" · "+d.toLocaleTimeString("es-CO",{hour:"numeric",minute:"2-digit"});}
  function vBadges(v){var b=[];if(v.codigo_ref)b.push('<i class="ref">🔖 '+esc(v.codigo_ref)+'</i>');if(v.instagram)b.push('<i class="ig">💌 IG</i>');if(v.escribio_por_whatsapp)b.push('<i>💬 WhatsApp</i>');if(v.dejo_en_la_bolsa)b.push('<i>🛍 Bolsa</i>');if(v.ubicacion_exacta)b.push('<i>📍 Ubicación</i>');if(v.vino_de_anuncio)b.push('<i>📢 Anuncio</i>');if(v.clienta)b.push('<i>👑 Club</i>');return b.join("");}
  function visRender(){
    var el=document.getElementById("cpVis"),D=V.data;if(!el||!D)return;
    var c=D.counts||{},list=D.visits||[];
    el.innerHTML='<div class="cp-cardh"><div><span class="cp-eyeb">Visitantes en detalle</span><div class="cp-dim" style="font-size:12px;margin-top:4px">Últimos '+visDays()+' días · toca una visita para ver todo y escribirle</div></div></div>'+
      '<div class="cp-chips">'+VF.map(function(f){return '<button type="button" class="cp-chip '+(V.f===f[0]?"on":"")+'" data-vf="'+f[0]+'">'+f[1]+' <i>'+num(c[f[2]]||0)+'</i></button>';}).join("")+'</div>'+
      '<input class="cp-search" type="search" data-vq placeholder="Buscar código Ref (ej. K7Q2), @instagram, ciudad o prenda…" value="'+esc(V.q)+'">'+
      (V.map?'<div class="cp-mapw'+(V.full?" full":"")+'"><div id="cpVisMap" class="cp-vmap"></div><div class="cp-mtools"><button type="button" data-a="vfit" title="Ver todos">◎</button><button type="button" data-a="vfull" title="Pantalla completa">'+(V.full?"✕":"⛶")+'</button></div><div class="cp-vleg"><span><i class="ex"></i>Exacta (ella la autorizó)</span><span><i class="ap"></i>Zona por su internet</span><span><i class="lv"></i>Hace menos de 30 min</span></div></div><div id="cpVisMapStat" class="cp-mstats"></div>':"")+
      '<button type="button" class="cp-btn ghost full" data-a="vmap">'+(V.map?"Ocultar mapa":"🗺 Ver mapa de visitantes")+'</button>'+
      (list.length?'<div class="cp-vlist">'+list.slice(0,V.n).map(function(v,i){
        var sub=[v.ciudad,v.dispositivo,v.navegador,v.visita_numero?"visita #"+v.visita_numero:""].filter(Boolean).join(" · ");
        var g=vGeo(v);
        return '<button type="button" class="cp-vr" data-vi="'+i+'"><span class="cp-vt">'+esc(vTime(v))+'</span><span class="cp-vm"><b>'+esc(vTitle(v))+'</b><small>'+esc(sub)+'</small>'+
          '<small class="cp-vgeo'+(g&&g.exact?" ex":"")+'">'+(g?'📍 '+esc(g.txt)+(g.exact?' · exacta'+(g.acc?' ±'+g.acc+' m':''):' · aprox'):'📍 sin coordenadas')+'</small><span class="cp-vb">'+vBadges(v)+'</span>'+(v.idea_para_dm?'<em>💡 '+esc(v.idea_para_dm)+'</em>':"")+'</span><span class="cp-va">›</span></button>';}).join("")+'</div>'+
        (list.length>V.n?'<button type="button" class="cp-btn ghost full" data-a="vmore">Ver más ('+(list.length-V.n)+')</button>':"")
      :empty(V.q||V.f?"No hay visitas con ese filtro.":"Todavía no hay visitas guardadas. Aparecen cuando alguien entra a la tienda (con el Worker v30)."));
    if(V.map)visMap();
  }
  function waNum(p){var d=String(p||"").replace(/\D/g,"");if(d.length===10&&d.charAt(0)==="3")d="57"+d;return d.length>=10?d:"";}
  function kv(label,val){if(val===undefined||val===null||val===""||(Array.isArray(val)&&!val.length))return "";return '<div class="cp-kv"><span>'+esc(label)+'</span><b>'+(Array.isArray(val)?val.map(esc).join("<br>"):esc(val))+'</b></div>';}
  function sect(title,body){return body?'<div class="cp-sect">'+title+'</div>'+body:"";}
  function visOpen(i){
    var v=(V.data.visits||[])[i];if(!v)return;
    var p=v.perfil||{},igh=v.instagram?String(v.instagram).replace(/^@/,""):"",wn=waNum(v.whatsapp_clienta);
    var btns=[];
    if(igh)btns.push('<a class="cp-btn" href="https://ig.me/m/'+encodeURIComponent(igh)+'" target="_blank" rel="noopener">💌 Escribir por DM</a>','<a class="cp-btn ghost" href="https://instagram.com/'+encodeURIComponent(igh)+'" target="_blank" rel="noopener">Ver perfil</a>');
    if(wn)btns.push('<a class="cp-btn'+(igh?" ghost":"")+'" href="https://wa.me/'+wn+'" target="_blank" rel="noopener">💬 WhatsApp</a>');
    if(v.mapa)btns.push('<a class="cp-btn ghost" href="'+esc(v.mapa)+'" target="_blank" rel="noopener">📍 Ver en mapa</a>');
    else if(v.coordenadas_aprox)btns.push('<a class="cp-btn ghost" href="https://maps.google.com/?q='+encodeURIComponent(v.coordenadas_aprox)+'" target="_blank" rel="noopener">🗺 Zona aproximada</a>');
    if(v.idea_para_dm)btns.push('<button type="button" class="cp-btn ghost" data-vcopy="'+i+'">Copiar idea</button>');
    var html='<div class="cp-shead"><div style="flex:1;min-width:0"><div class="cp-eyeb">'+esc(vTime(v))+(v.codigo_ref?' · 🔖 Ref '+esc(v.codigo_ref):"")+'</div><h3 class="cp-h3">'+esc(vTitle(v))+'</h3><div class="cp-vb">'+vBadges(v)+'</div></div><button type="button" class="cp-x" data-cpclose aria-label="Cerrar">✕</button></div>'+
      (v.idea_para_dm?'<div class="cp-idea">💡 '+esc(v.idea_para_dm)+'</div>':"")+
      (btns.length?'<div class="cp-vbtns">'+btns.join("")+'</div>':"")+
      (!igh&&!wn?'<p class="cp-hint" style="margin-top:10px">No dejó Instagram ni WhatsApp. Si te escribe, busca su código 🔖 '+esc(v.codigo_ref||"")+' en el mensaje.</p>':"")+
      sect("Quién",kv("Instagram",v.instagram)+kv("Club Caneva",v.clienta)+kv("WhatsApp",v.whatsapp_clienta)+kv("Talla del perfil",v.talla_perfil))+
      sect("Dejó en la bolsa",kv("Prendas",v.dejo_en_la_bolsa))+
      sect("Dónde está",kv("Ciudad",[v.ciudad,v.region,v.pais].filter(Boolean).join(", "))+kv("Código postal",v.codigo_postal)+kv("Ubicación exacta (GPS)",v.ubicacion_exacta?v.ubicacion_exacta+(v.precision_metros?" (±"+v.precision_metros+" m)":""):"No la compartió")+kv("Zona aproximada (internet)",v.coordenadas_aprox||"Cloudflare no la envió")+kv("Internet",v.operador)+kv("Conexión",v.conexion))+
      sect("Cómo llegó",kv("Desde",v.llego_desde)+kv("Anuncio",v.vino_de_anuncio)+kv("Campaña",v.campana)+kv("Página de origen",v.referencia)+kv("Visita número",v.visita_numero)+kv("Primera visita",v.primera_visita)+kv("Visita anterior",v.visita_anterior))+
      sect("Lo que le gusta",kv("Categorías",p.le_gusta)+kv("Tallas",p.tallas)+kv("Precios que mira",p.rango_precios)+kv("Vio antes",p.vio_antes)+kv("Puso en la bolsa antes",p.puso_en_bolsa_antes)+kv("Le preguntó a la IA",p.pregunto_antes_a_la_ia)+kv("Tiempo total en la tienda",p.tiempo_total_en_la_tienda))+
      sect("Su equipo",kv("Celular / computador",v.dispositivo)+kv("Abrió en",v.navegador)+kv("Pantalla",v.pantalla)+kv("Hora en su celular",v.hora_en_su_celular)+kv("Idioma",v.idioma)+kv("Modo oscuro",v.modo_oscuro)+kv("Como app",v.abrio_como_app))+
      sect("Lo que hizo hoy",(v.acciones||[]).length?'<ol class="cp-tl">'+v.acciones.map(function(a){return "<li>"+esc(a)+"</li>";}).join("")+'</ol>':"");
    openSheet(html,{click:function(e){var b=e.target.closest("[data-vcopy]");if(b){try{navigator.clipboard.writeText(v.idea_para_dm);toast("Idea copiada ✓");}catch(x){}}}});
  }
  function repTop(field,unit){
    var top=R.data.products.filter(function(p){return p[field]>0;}).sort(function(a,b){return b[field]-a[field];}).slice(0,5);
    return top.length?top.map(function(p,i){return '<div class="cp-top"><span>'+(i+1)+'</span><b>'+esc(p.nombre)+'</b><em>'+num(p[field])+' '+unit+'</em></div>';}).join(""):'<p class="cp-hint">Sin datos todavía.</p>';
  }
  var COLS=[["nombre","Prenda"],["views","Vistas"],["carts","A la bolsa"],["soldUnits","Vendidas"],["soldRevenue","Ingresos"],["stock","Stock"],["potentialProfit","Ganancia posible"],["margin","Margen"]];
  function repRows(){
    var q=norm(R.q);
    return R.data.products.filter(function(p){return (R.cat==="Todas"||p.categoria===R.cat)&&(!q||norm(p.nombre+" "+p.categoria).indexOf(q)>=0);})
      .sort(function(a,b){var x=a[R.sort],y=b[R.sort];if(R.sort==="nombre")return R.dir*String(x).localeCompare(String(y));x=x==null?-1e15:x;y=y==null?-1e15:y;return R.dir*(x-y)||a.nombre.localeCompare(b.nombre);});
  }
  function repTable(){
    var rows=repRows();
    var cell=function(p,k){var v=p[k];if(k==="soldRevenue"||k==="potentialProfit")return v?money(v):'<span class="cp-dim">—</span>';if(k==="margin")return v==null?'<span class="cp-dim">—</span>':v+"%";if(k==="stock")return v==null?'<span class="cp-dim">—</span>':(v<=0?'<span class="cp-bad">0</span>':num(v));return v?num(v):'<span class="cp-dim">0</span>';};
    document.getElementById("cpRepTable").innerHTML=rows.length?
      '<div class="cp-tbl"><table><thead><tr>'+COLS.map(function(c){return '<th data-sort="'+c[0]+'" class="'+(c[0]==="nombre"?"":"r")+(R.sort===c[0]?" on":"")+'">'+c[1]+(R.sort===c[0]?(R.dir<0?" ↓":" ↑"):"")+'</th>';}).join("")+'</tr></thead><tbody>'+
      rows.map(function(p){return '<tr><td><div class="cp-tdp">'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="" loading="lazy">':"<span></span>")+'<div><b>'+esc(p.nombre)+'</b><small>'+esc(p.categoria)+' · '+esc(p.precio)+'</small></div></div></td>'+
        COLS.slice(1).map(function(c){return '<td class="r" data-l="'+c[1]+'">'+cell(p,c[0])+'</td>';}).join("")+'</tr>';}).join("")+'</tbody></table></div>'
      :empty("No hay productos con ese filtro.");
  }
  function repCsv(){
    var rows=[["Prenda","Categoría","Precio","Costo","Vistas","A la bolsa","Vendidas","Ingresos","Stock","Valor en bodega","Ganancia posible","Margen %"]];
    repRows().forEach(function(p){rows.push([p.nombre,p.categoria,p.price,p.cost||"",p.views,p.carts,p.soldUnits,p.soldRevenue,p.stock==null?"":p.stock,p.stockValue==null?"":p.stockValue,p.potentialProfit==null?"":p.potentialProfit,p.margin==null?"":p.margin]);});
    download("reporte-productos-caneva",rows);
  }
  function repClick(e){
    var b;
    if((b=e.target.closest("[data-rdays]"))){R.days=Number(b.dataset.rdays);return repLoad();}
    if((b=e.target.closest("[data-rcat]"))){R.cat=b.dataset.rcat;return repRender();}
    if((b=e.target.closest("[data-sort]"))){var k=b.dataset.sort;if(R.sort===k)R.dir=-R.dir;else{R.sort=k;R.dir=k==="nombre"?1:-1;}return repTable();}
    if((b=e.target.closest("[data-a]"))&&b.dataset.a==="rcsv")return repCsv();
    if((b=e.target.closest("[data-a]"))&&b.dataset.a==="vmore"){V.n+=30;return visRender();}
    if((b=e.target.closest("[data-a]"))&&b.dataset.a==="vfit"){if(V.lmap&&V.lbounds&&V.lbounds.length)V.lmap.fitBounds(V.lbounds,{padding:[40,40],maxZoom:13});return;}
    if((b=e.target.closest("[data-a]"))&&b.dataset.a==="vfull"){V.full=!V.full;var w=document.querySelector(".cp-mapw");if(w)w.classList.toggle("full",V.full);b.textContent=V.full?"✕":"⛶";document.body.style.overflow=V.full?"hidden":"";if(V.lmap)setTimeout(function(){V.lmap.invalidateSize();if(V.lbounds&&V.lbounds.length>1)V.lmap.fitBounds(V.lbounds,{padding:[40,40],maxZoom:13});},120);return;}
    if((b=e.target.closest("[data-vcity]"))){V.q=b.dataset.vcity==="Sin ciudad"?"":b.dataset.vcity;V.n=20;return visLoad();}
    if((b=e.target.closest("[data-a]"))&&b.dataset.a==="vmap"){V.map=!V.map;if(!V.map&&V.lmap){try{V.lmap.remove();}catch(x){}V.lmap=null;}return visRender();}
    if((b=e.target.closest("[data-vf]"))){V.f=b.dataset.vf;V.n=20;return visLoad();}
    if((b=e.target.closest("[data-vi]")))return visOpen(Number(b.dataset.vi));
  }
  function repHover(e){
    var g=e.target.closest&&e.target.closest(".cp-bar"),tip=document.getElementById("cpTip");if(!tip)return;
    if(!g){tip.className="cp-tip cp-hide";return;}
    var box=g.closest(".cp-chart").getBoundingClientRect(),r=g.getBoundingClientRect();
    tip.textContent=g.getAttribute("data-tip");tip.className="cp-tip";
    var x=r.left-box.left+r.width/2;tip.style.left=Math.max(70,Math.min(box.width-70,x))+"px";
  }

  // ---------- mount ----------
  var bound=new WeakSet();
  function mount(el,kind,opts){
    Object.keys(opts||{}).forEach(function(k){OPT[k]=opts[k];});
    ensureChrome();if(!bound.has(document.body)){bindSheet();bound.add(document.body);}
    if(!bound.has(el)){bound.add(el);el.classList.add("cp");
      el.addEventListener("click",function(e){if(el._cpKind==="inventario")invClick(e);else repClick(e);});
      el.addEventListener("input",function(e){if(e.target.matches("[data-iq]")){I.q=e.target.value;invList();}if(e.target.matches("[data-rq]")){R.q=e.target.value;repTable();}if(e.target.matches("[data-vq]")){V.q=e.target.value;clearTimeout(V.t);V.t=setTimeout(function(){V.n=20;visLoad().then(function(){var i=document.querySelector("[data-vq]");if(i){i.focus();var L=i.value.length;try{i.setSelectionRange(L,L);}catch(x){}}});},450);}});
      el.addEventListener("pointermove",repHover);el.addEventListener("pointerdown",repHover);el.addEventListener("pointerleave",function(){var t=document.getElementById("cpTip");if(t)t.className="cp-tip cp-hide";});
    }
    el._cpKind=kind;
    if(kind==="inventario"){I.el=el;return invLoad();}
    R.el=el;return repLoad();
  }
  window.CanevaPro={mount:mount,openItem:function(pid){if(I.data)invOpen(pid);},reloadInventory:function(){return I.el?invLoad():null;},inventoryData:function(){return I.data;}};

  var CSS=[
  ".cp{--cpr:16px}",
  ".cp-hide{display:none!important}",
  ".cp-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:12px}",
  ".cp-eyeb{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}",
  ".cp-h{font-family:'Cormorant Garamond',serif;font-weight:300;font-size:34px;line-height:1;margin:4px 0 0}",
  ".cp-h3{font-family:'Cormorant Garamond',serif;font-weight:300;font-size:26px;line-height:1.1;margin:2px 0 4px}",
  ".cp-actions{display:flex;gap:8px}",
  ".cp-btn{border:0;background:var(--w);color:var(--k);border-radius:12px;padding:11px 15px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}",
  ".cp-btn.ghost{background:none;color:var(--w);border:1px solid var(--b)}.cp-btn.danger{background:none;color:var(--bad);border:1px solid rgba(255,180,168,.4)}",
  ".cp-btn.full{display:block;width:100%;margin-top:12px;padding:15px;font-size:15px}.cp-btn:disabled{opacity:.4}",
  ".cp-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}.cp-chips::-webkit-scrollbar{display:none}",
  ".cp-chip{flex:none;background:none;color:var(--w);border:1px solid var(--b);border-radius:999px;padding:7px 13px;font-size:12.5px;white-space:nowrap;cursor:pointer;font-family:inherit}",
  ".cp-chip i{font-style:normal;color:var(--dim);margin-left:3px}.cp-chip.on{background:var(--w);color:var(--k);border-color:var(--w)}.cp-chip.on i{color:#666}",
  ".cp-kpis{display:grid;gap:10px;grid-template-columns:1fr 1fr}",
  ".cp-kpis.k4 .hero,.cp-kpis.k4 .gold{grid-column:1/-1}",
  "@media(min-width:900px){.cp-kpis.k4{grid-template-columns:1.2fr 1fr 1fr 1fr}.cp-kpis.k4 .hero,.cp-kpis.k4 .gold{grid-column:auto}.cp-kpis.k6{grid-template-columns:repeat(6,1fr)}}",
  "@media(min-width:600px) and (max-width:899px){.cp-kpis.k6{grid-template-columns:repeat(3,1fr)}}",
  ".cp-kpi{border:1px solid var(--b);border-radius:var(--cpr);padding:14px;background:linear-gradient(160deg,#171717,#0b0b0b);min-width:0}",
  ".cp-kpi span{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--dim)}",
  ".cp-kpi b{display:block;font-family:'Cormorant Garamond',serif;font-weight:300;font-size:34px;line-height:1.1;margin:6px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".cp-kpi.hero b{font-size:46px}.cp-kpi small{font-size:12px;color:var(--dim)}",
  ".cp-kpi.gold{border-color:rgba(201,179,138,.45)}.cp-kpi.gold b{color:#d9c49b}",
  ".cp-up{font-style:normal;color:var(--ok)}.cp-down{font-style:normal;color:var(--bad)}",
  ".cp-alerts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}",
  ".cp-alert{background:var(--k2);border:1px solid var(--b);border-radius:12px;padding:10px 4px;font-size:10.5px;line-height:1.25;color:var(--dim);cursor:pointer;font-family:inherit}",
  ".cp-alert b{display:block;font-size:22px;font-weight:500;color:var(--w);margin-bottom:2px}",
  ".cp-alert.red b{color:#ff8f80}.cp-alert.amber b{color:#f4c46a}.cp-alert.on{border-color:var(--w);background:#1d1d1d}",
  ".cp-card{border:1px solid var(--b);border-radius:var(--cpr);padding:14px;background:var(--k2);min-width:0}",
  ".cp-cardh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}",
  ".cp-seg{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.cp-seg::-webkit-scrollbar{display:none}",
  ".cp-seg button{flex:none;background:none;color:var(--w);border:1px solid var(--b);border-radius:999px;padding:7px 12px;font-size:12px;cursor:pointer;font-family:inherit}",
  ".cp-seg button.on{background:var(--w);color:var(--k);border-color:var(--w)}.cp-seg.mini button{padding:5px 9px;font-size:11px}",
  ".cp-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}.cp-g4 b{display:block;font-size:15px;font-weight:600}.cp-g4 span{font-size:10px;color:var(--dim);letter-spacing:.06em;text-transform:uppercase}",
  ".cp-top{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-top:1px solid var(--b);font-size:13px}.cp-top span{color:var(--dim);width:14px}.cp-top b{flex:1;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cp-top em{font-style:normal;color:var(--dim);font-size:12px;white-space:nowrap}",
  ".cp-hint{font-size:12.5px;color:var(--dim);line-height:1.5;margin:8px 0 0}",
  ".cp-note{border:1px solid rgba(201,179,138,.35);background:rgba(201,179,138,.06);border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.55;margin:0 0 12px}",
  ".cp-tools{position:sticky;top:var(--cp-top,0px);z-index:3;background:var(--k);padding:14px 0 8px;display:flex;flex-direction:column;gap:10px}",
  "@media(min-width:900px){.cp-tools{flex-direction:row;align-items:center}.cp-tools .cp-search{flex:1}}",
  ".cp-search{width:100%;background:var(--k2);border:1px solid var(--b);border-radius:12px;padding:12px 14px;font-size:15px;color:var(--w);outline:none;font-family:inherit}.cp-search:focus{border-color:var(--w)}",
  ".cp-listhead{display:none}",
  ".cp-row{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--b);cursor:pointer}",
  ".cp-th{width:52px;height:66px;border-radius:8px;overflow:hidden;background:var(--k3)}.cp-th img{width:100%;height:100%;object-fit:cover}",
  ".cp-info{min-width:0}.cp-info b{font-weight:500;font-size:14px}.cp-info small{display:block;color:var(--dim);font-size:12px;margin-top:2px}",
  ".cp-szs{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.cp-d{display:none}",
  ".cp-sz{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--b);border-radius:6px;padding:2px 6px;font-size:11px;color:var(--dim)}.cp-sz i{font-style:normal;color:var(--w);font-weight:600}",
  ".cp-sz.z{border-color:rgba(255,143,128,.45)}.cp-sz.z i{color:#ff8f80}.cp-sz.l{border-color:rgba(244,196,106,.5)}.cp-sz.l i{color:#f4c46a}.cp-sz.none{border-style:dashed}",
  ".cp-tot{text-align:right;min-width:62px}.cp-tot b{display:block;font-family:'Cormorant Garamond',serif;font-weight:300;font-size:32px;line-height:1}.cp-tot small{font-size:9.5px;letter-spacing:.08em;color:var(--dim)}",
  ".cp-none{display:inline-block;font-size:9.5px;letter-spacing:.08em;color:var(--dim);border:1px dashed var(--b);border-radius:6px;padding:3px 6px;white-space:nowrap}",
  ".cp-row.st-agotada .cp-tot b,.cp-row.st-agotada .cp-tot small{color:#ff8f80}.cp-row.st-baja .cp-tot b,.cp-row.st-baja .cp-tot small{color:#f4c46a}",
  ".cp-row:hover{background:#0c0c0c}",
  "@media(min-width:900px){.cp-listhead{display:grid;grid-template-columns:52px minmax(200px,1.3fr) 1.4fr 100px 80px 110px;gap:14px;padding:10px 0 8px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}",
  " .cp-row{grid-template-columns:52px minmax(200px,1.3fr) 1.4fr 100px 80px 110px;gap:14px}.cp-m{display:none}.cp-d{display:flex}.cp-szs.cp-d{margin:0}div.r.cp-d{display:block}}",
  ".r{text-align:right}",
  ".cp-dim{color:var(--dim)}.cp-bad{color:var(--bad)}.cp-ok{color:var(--ok)}",
  ".cp-empty{color:var(--dim);font-size:13px;text-align:center;padding:30px 10px;line-height:1.6}",
  ".cp-grid2,.cp-grid3{display:grid;gap:14px;margin-top:14px;grid-template-columns:1fr}",
  "@media(min-width:900px){.cp-grid2{grid-template-columns:1.4fr 1fr}.cp-grid3{grid-template-columns:repeat(3,1fr)}}",
  ".cp-chartwrap{display:grid;grid-template-columns:auto 1fr;gap:8px}",
  ".cp-yax{display:flex;flex-direction:column;justify-content:space-between;height:150px;padding-top:18px;font-size:10px;color:var(--dim);text-align:right}",
  ".cp-chart{position:relative;min-width:0}.cp-chart svg{display:block;width:100%;height:150px}",
  ".cp-chart path{fill:#e9e6dd}.cp-bar:hover path{fill:#fff}.cp-chart .cp-base{stroke:rgba(247,247,244,.3);stroke-width:1}.cp-chart .cp-grid{stroke:rgba(247,247,244,.08);stroke-width:1;stroke-dasharray:3 4}",
  ".cp-axis{display:flex;justify-content:space-between;font-size:10.5px;color:var(--dim);margin-top:6px}",
  ".cp-tip{position:absolute;top:-6px;transform:translate(-50%,-100%);background:var(--w);color:var(--k);font-size:12px;border-radius:8px;padding:6px 9px;white-space:nowrap;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.5)}",
  ".cp-fun{margin-top:10px}.cp-funl{display:flex;gap:8px;align-items:baseline;font-size:13px}.cp-funl span{flex:1;color:var(--dim)}.cp-funl b{font-weight:600}.cp-funl em{font-style:normal;font-size:11px;color:var(--dim);width:40px;text-align:right}",
  ".cp-funt{height:8px;border-radius:6px;background:var(--k3);margin-top:5px;overflow:hidden}.cp-funt i{display:block;height:100%;background:#e9e6dd;border-radius:0 4px 4px 0}",
  ".cp-hbar{display:grid;grid-template-columns:minmax(110px,44%) 1fr 44px;gap:8px;align-items:center;padding:6px 0;font-size:12.5px}",
  ".cp-hl{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cp-hbar b{text-align:right;font-weight:600}",
  ".cp-ht{height:8px;border-radius:6px;background:var(--k3);overflow:hidden}.cp-ht i{display:block;height:100%;background:#e9e6dd;border-radius:0 4px 4px 0}",
  ".cp-split{display:flex;height:10px;border-radius:6px;overflow:hidden;margin-top:8px;gap:2px}.cp-split i{display:block;height:100%}.cp-split i.a,.cp-splitl i.a{background:#e9e6dd}.cp-split i.b,.cp-splitl i.b{background:#d9c49b}",
  ".cp-splitl{display:flex;gap:14px;font-size:12px;color:var(--dim);margin-top:6px}.cp-splitl i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}",
  ".cp-tbl{overflow-x:auto;margin-top:8px}.cp-tbl table{width:100%;border-collapse:collapse;min-width:760px}",
  ".cp-tbl th{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);font-weight:500;padding:10px 8px;border-bottom:1px solid var(--b);cursor:pointer;white-space:nowrap;text-align:left;position:static;background:none}",
  ".cp-tbl th.r{text-align:right}.cp-tbl th.on{color:var(--w)}",
  ".cp-tbl td{padding:9px 8px;border-bottom:1px solid var(--b);font-size:13px;vertical-align:middle;background:none}.cp-tbl tr:hover td{background:#141414}",
  ".cp-tdp{display:flex;gap:10px;align-items:center;min-width:200px}.cp-tdp img,.cp-tdp span{width:34px;height:44px;border-radius:6px;object-fit:cover;background:var(--k3);flex:none}.cp-tdp b{font-weight:500;display:block}.cp-tdp small{color:var(--dim);font-size:11.5px}",
  "@media(max-width:700px){.cp-tbl table{min-width:0}.cp-tbl thead{display:none}.cp-tbl tr{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;padding:10px 0;border-bottom:1px solid var(--b)}",
  " .cp-tbl td{border:0;padding:0;text-align:left!important}.cp-tbl td:first-child{grid-column:1/-1}.cp-tbl td[data-l]::before{content:attr(data-l);display:block;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}}",
  ".cp-sheetbg{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:40}",
  ".cp-sheet{position:fixed;left:0;right:0;bottom:0;z-index:41;max-height:94vh;overflow-y:auto;background:var(--k);color:var(--w);border-top:1px solid var(--b);border-radius:20px 20px 0 0;padding:10px 16px calc(24px + env(safe-area-inset-bottom))}",
  "@media(min-width:760px){.cp-sheet{left:50%;right:auto;bottom:auto;top:50%;transform:translate(-50%,-50%);width:min(620px,94vw);max-height:90vh;border:1px solid var(--b);border-radius:20px;padding:22px}.cp-grab{display:none}}",
  ".cp-grab{width:42px;height:4px;border-radius:4px;background:var(--b);margin:4px auto 12px}",
  ".cp-shead{display:flex;gap:14px;align-items:flex-start}.cp-shead img{width:86px;height:108px;object-fit:cover;border-radius:10px}",
  ".cp-x{background:none;border:0;color:var(--dim);font-size:18px;cursor:pointer;padding:4px 6px}",
  ".cp-big{margin-top:6px;font-size:14px;color:var(--dim)}.cp-big b{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:300;color:var(--w)}",
  ".cp-modes{display:flex;gap:6px;overflow-x:auto;margin-top:14px;scrollbar-width:none}.cp-modes::-webkit-scrollbar{display:none}",
  ".cp-modes button{flex:none;background:none;color:var(--w);border:1px solid var(--b);border-radius:999px;padding:8px 12px;font-size:13px;cursor:pointer;font-family:inherit}.cp-modes button.on{background:var(--w);color:var(--k);border-color:var(--w)}",
  ".cp-szr{display:grid;grid-template-columns:54px 1fr auto 46px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--b)}",
  ".cp-szn{font-size:17px;font-weight:600}.cp-szc{font-size:12px;color:var(--dim)}.cp-szc b{color:var(--w)}.cp-szf{font-size:13px;text-align:right;color:var(--ok)}",
  ".cp-step{display:flex;align-items:center;border:1px solid var(--b);border-radius:12px;overflow:hidden}",
  ".cp-step button{width:42px;height:44px;background:var(--k2);color:var(--w);border:0;font-size:22px;cursor:pointer}",
  ".cp-step input{width:52px;height:44px;text-align:center;background:var(--k);color:var(--w);border:0;border-left:1px solid var(--b);border-right:1px solid var(--b);font-size:18px;outline:none}",
  ".cp-addsz{display:flex;gap:8px;margin-top:8px}.cp-addsz input{flex:1;min-width:0;background:var(--k2);color:var(--w);border:1px solid var(--b);border-radius:10px;padding:10px;font-size:15px}",
  ".cp-addsz button{background:none;color:var(--w);border:1px solid var(--b);border-radius:10px;padding:0 14px;font-size:13px;cursor:pointer}",
  ".cp-field{margin-top:12px}.cp-field label{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:6px}",
  ".cp-field input{width:100%;background:var(--k2);color:var(--w);border:1px solid var(--b);border-radius:10px;padding:12px 14px;font-size:16px;outline:none;font-family:inherit}.cp-field input:focus{border-color:var(--w)}",
  ".cp-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
  ".cp-prev{margin-top:14px;font-size:14px;color:var(--dim)}.cp-prev b{color:var(--w);font-size:18px}",
  ".cp-cfg{margin-top:16px;border:1px solid var(--b);border-radius:12px;padding:10px 12px}.cp-cfg summary{font-size:13px;cursor:pointer}",
  ".cp-sect{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:22px 0 4px;border-top:1px solid var(--b);padding-top:16px}",
  ".cp-mv{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--b);font-size:13px;line-height:1.4}.cp-mv small{color:var(--dim);font-size:11.5px}.cp-mi{text-align:center}",
  ".cp-md{text-align:right}.cp-md b{font-size:16px}.cp-md small{display:block}",
  ".cp-toast{position:fixed;left:16px;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:60;background:var(--w);color:var(--k);border-radius:12px;padding:14px 16px;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:480px;margin:0 auto}.cp-toast.err{background:var(--bad)}",
  ".cp-busy{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;font-size:14px;color:var(--w)}",
  ".cp-vis{margin-top:14px}.cp-vlist{margin-top:10px}",
  ".cp-vr{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:flex-start;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--b);padding:12px 2px;color:var(--w);cursor:pointer;font-family:inherit}.cp-vr:hover{background:#141414}",
  ".cp-vt{font-size:11.5px;color:var(--dim);white-space:nowrap;padding-top:2px;min-width:92px}.cp-vm{min-width:0}.cp-vm b{display:block;font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".cp-vm small{display:block;font-size:12px;color:var(--dim);margin-top:2px}.cp-vm em{display:block;font-style:normal;font-size:12.5px;color:#d9c49b;margin-top:6px;line-height:1.35}.cp-va{color:var(--dim);font-size:20px}",
  ".cp-vb{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.cp-vb i{font-style:normal;font-size:11px;border:1px solid var(--b);border-radius:999px;padding:3px 8px;color:var(--w)}.cp-vb i.ref{border-color:rgba(217,196,155,.55);color:#d9c49b}.cp-vb i.ig{background:var(--w);color:var(--k);border-color:var(--w)}",
  "@media(max-width:600px){.cp-vr{grid-template-columns:1fr auto}.cp-vt{grid-column:1/-1;min-width:0}}",
  ".cp-vgeo{color:#a9a9a4!important;font-variant-numeric:tabular-nums}.cp-vgeo.ex{color:#f7f7f4!important}",
  ".cp-mapw{position:relative;margin-top:10px}.cp-vmap{height:420px;border-radius:14px;overflow:hidden;border:1px solid var(--b);background:#0d0d0d}.cp-vmap.leaflet-container{background:#0d0d0d}",
  "@media(max-width:700px){.cp-vmap{height:360px}}",
  ".cp-mapw.full{position:fixed;inset:0;z-index:45;margin:0;background:#050505;padding:10px}.cp-mapw.full .cp-vmap{height:calc(100vh - 56px);border-radius:12px}",
  ".cp-vmap .cp-darktiles{filter:invert(1) hue-rotate(180deg) brightness(.82) contrast(1.1) saturate(.25)}",
  ".cp-vmap .leaflet-control-attribution{background:rgba(5,5,5,.7)!important;color:#888!important;font-size:10px}.cp-vmap .leaflet-control-attribution a{color:#bbb!important}",
  ".cp-vmap .leaflet-bar a{background:#111!important;color:#f7f7f4!important;border-color:#222!important}",
  ".cp-mtools{position:absolute;top:10px;right:10px;z-index:500;display:flex;gap:6px}.cp-mapw.full .cp-mtools{top:20px;right:20px}",
  ".cp-mtools button{width:36px;height:36px;border-radius:10px;border:1px solid rgba(247,247,244,.2);background:rgba(10,10,10,.85);color:#f7f7f4;font-size:16px;cursor:pointer;backdrop-filter:blur(8px)}",
  ".cp-vleg{display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--dim);margin-top:8px}.cp-mapw.full .cp-vleg{position:absolute;left:20px;bottom:20px;z-index:500;background:rgba(5,5,5,.8);padding:8px 12px;border-radius:10px}",
  ".cp-vleg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}.cp-vleg i.ex{background:#fff;box-shadow:0 0 8px #fff}.cp-vleg i.ap{background:rgba(217,196,155,.45);border:2px solid #d9c49b}.cp-vleg i.lv{background:#5ef0a0;box-shadow:0 0 8px #5ef0a0}",
  ".cp-pinw{background:none;border:0}",
  ".cp-pin{position:relative;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,rgba(241,230,207,.95),rgba(217,196,155,.75) 45%,rgba(122,97,54,.55));border:1.5px solid #f1e6cf;box-shadow:0 0 0 4px rgba(217,196,155,.15),0 0 22px rgba(217,196,155,.55);color:#050505;font:700 12px Inter,sans-serif;transition:transform .25s}",
  ".cp-pin:hover{transform:scale(1.15)}",
  ".cp-pin.ex{background:#fff;border:2px solid #050505;box-shadow:0 0 0 3px rgba(255,255,255,.35),0 0 18px #fff}",
  ".cp-pin.live::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid #5ef0a0;animation:cppulse 1.8s ease-out infinite}",
  ".cp-pin::before{content:'';position:absolute;inset:0;border-radius:50%;border:1px solid rgba(217,196,155,.6);animation:cpring 2.8s ease-out infinite}.cp-pin.ex::before{border-color:rgba(255,255,255,.7)}",
  "@keyframes cppulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.2);opacity:0}}@keyframes cpring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}",
  ".cp-vmap .leaflet-tooltip{background:#0b0b0b;color:#f7f7f4;border:1px solid rgba(247,247,244,.2);border-radius:8px;font:12px Inter,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.6)}.cp-vmap .leaflet-tooltip-top:before{border-top-color:#0b0b0b}",
  ".cp-vmap .leaflet-popup-content-wrapper,.cp-vmap .leaflet-popup-tip{background:#0b0b0b;color:#f7f7f4;border:1px solid rgba(247,247,244,.15)}.cp-vmap .leaflet-popup-content{margin:12px}.cp-vmap .leaflet-popup-close-button{color:#aaa!important}",
  ".cp-mpop b{display:block;font:600 13px Inter,sans-serif;margin-bottom:6px}.cp-mpop button{display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid #222;color:#f7f7f4;padding:7px 0;font:13px Inter,sans-serif;cursor:pointer}.cp-mpop button small,.cp-mpop>small{display:block;color:#999;font-size:11px}",
  ".cp-mstats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.cp-mstat{border:1px solid var(--b);border-radius:12px;padding:10px;background:linear-gradient(160deg,#171717,#0b0b0b)}",
  ".cp-mstat b{display:block;font-family:'Cormorant Garamond',serif;font-weight:300;font-size:28px;line-height:1}.cp-mstat span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}.cp-mstat.live b{color:#5ef0a0}",
  ".cp-mcities{grid-column:1/-1;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.cp-mcities::-webkit-scrollbar{display:none}",
  ".cp-mcities button{flex:none;display:flex;align-items:center;gap:7px;background:none;border:1px solid var(--b);border-radius:999px;color:var(--w);padding:6px 11px;font:12.5px Inter,sans-serif;cursor:pointer}.cp-mcities em{font-style:normal;color:#d9c49b;font-weight:600}.cp-mcities i{font-style:normal;color:var(--dim)}",
  "@media(max-width:600px){.cp-mstats{grid-template-columns:repeat(2,1fr)}}",
  ".cp-idea{margin-top:14px;border:1px solid rgba(217,196,155,.5);background:linear-gradient(120deg,rgba(217,196,155,.14),rgba(247,247,244,.02));border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45;color:#f1e6cf}",
  ".cp-vbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.cp-vbtns .cp-btn{text-decoration:none;display:inline-block}",
  ".cp-kv{display:grid;grid-template-columns:150px 1fr;gap:10px;padding:7px 0;border-top:1px solid var(--b);font-size:13px}.cp-kv span{color:var(--dim)}.cp-kv b{font-weight:500;word-break:break-word}",
  "@media(max-width:520px){.cp-kv{grid-template-columns:1fr;gap:2px}}",
  ".cp-tl{margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.5}.cp-tl li{padding:4px 0;border-bottom:1px dashed var(--b)}.cp-tl li::marker{color:var(--dim)}",
  ".cp-spin{width:34px;height:34px;border:3px solid var(--b);border-top-color:var(--w);border-radius:50%;animation:cpsp 1s linear infinite}@keyframes cpsp{to{transform:rotate(360deg)}}"
  ].join("\n");
})();
