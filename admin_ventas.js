/* CANEVA Admin — Ventas manuales + Cuentas por cobrar.
   Records sales that did not go through the website (store counter, WhatsApp, Instagram, fairs) so they count in
   Reportes, the month goal, Club points and inventory. Sales can be paid in full or with an abono: what she still
   owes goes to "Cuentas por cobrar", where later abonos are registered until it is paid.
   Shared by admin.html and admin_movil.html. Usage: CanevaVentas.mount(element, { api, token: () => "..." })
   Needs Worker v58 (/admin/sales/manual, /admin/sales/receivables).
   v61: private cost per garment in each sale and a "Ganancia" tab with every paid sale (web and manual) and its profit.
   Costs only live in the admin (Worker /admin/orders/:id/cost, /admin/profit): never in receipts, the store or e-mails.
   CanevaVentas.editCost(order, onSaved) opens the cost editor from other screens (Pedidos). */
(function(){
  "use strict";
  var OPT={api:"https://caneva-ai.canevacol.workers.dev",token:function(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}};
  var S={el:null,cat:[],cats:[],catSel:"",data:null,recv:null,days:1,view:"vender",lines:[],busy:false,payFull:true,plan:"contado",abTouched:false,inv:{},prof:null,pdays:30,psrc:"",showEx:false};
  var SRC={pasarela:"💳 Pasarela Bold",otro_medio:"🌐 Web · otro medio",manual:"💵 Venta manual"};
  function pct(a,b){return b?Math.round(a/b*100):0;}
  var CH={tienda:"Tienda física",whatsapp:"WhatsApp",instagram:"Instagram",feria:"Feria / evento",otro:"Otro"};
  var PAY={efectivo:"Efectivo",transferencia:"Transferencia",nequi:"Nequi",daviplata:"Daviplata",datafono:"Datáfono",bold:"Link Bold",otro:"Otro"};
  var DOC={cc:"Cédula",pa:"Pasaporte",ti:"Tarjeta de identidad",otro:"Otro"};
  // Payment plans: what she pays today; the rest goes to Cuentas por cobrar with a 10 business-day limit
  var PLANS={contado:{label:"✓ Pagó todo",pct:1},credito:{label:"Crédito Caneva · abona 50%",pct:.5},apartado:{label:"Apartado · abona 30%",pct:.3},abono:{label:"Otro abono",pct:0}};
  var PLAN_NAME={contado:"Contado",credito:"Crédito Caneva",apartado:"Apartado",abono:"Abono"};
  function addBizDays(dateStr,n){var d=new Date((dateStr||today())+"T12:00:00Z");while(n>0){d.setUTCDate(d.getUTCDate()+1);var w=d.getUTCDay();if(w!==0&&w!==6)n--;}return d.toISOString().slice(0,10);}
  function shortDate(ds){try{return new Date(String(ds).slice(0,10)+"T12:00:00Z").toLocaleDateString("es-CO",{timeZone:"UTC",weekday:"short",day:"numeric",month:"short"});}catch(e){return ds;}}

  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function num(v){var n=parseInt(String(v==null?"":v).replace(/[^\d]/g,""),10);return isFinite(n)?n:0;}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function today(){return new Date(Date.now()-5*3600000).toISOString().slice(0,10);}
  function norm(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}
  function sizesOf(p){var t=String((p&&p.tallas)||"").trim();if(!t||/^[uú]nica$/i.test(t))return ["Única"];return t.split(/[\s,\/\-]+/).map(function(x){return x.trim().toUpperCase();}).filter(Boolean);}
  function when(iso,withTime){try{return new Date(iso).toLocaleString("es-CO",withTime===false?{timeZone:"America/Bogota",day:"numeric",month:"short",year:"numeric"}:{timeZone:"America/Bogota",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});}catch(e){return "";}}
  function daysAgo(iso){return Math.max(0,Math.floor((Date.now()-Date.parse(iso))/86400000));}
  function api(path,opts){opts=opts||{};return fetch(OPT.api+path,{method:opts.method||"GET",headers:{"x-admin-token":OPT.token(),"Content-Type":"application/json"},body:opts.body?JSON.stringify(opts.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function toast(msg,bad){var t=document.createElement("div");t.className="vt-toast"+(bad?" bad":"");t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.classList.add("on");},10);setTimeout(function(){t.classList.remove("on");setTimeout(function(){t.remove();},300);},3600);}
  function opts(map,sel,empty){return (empty?'<option value="">'+esc(empty)+'</option>':'')+Object.keys(map).map(function(k){return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(map[k])+'</option>';}).join("");}

  var CSS='.vt{max-width:1000px;margin:0 auto;padding:18px 14px 90px;color:#f7f7f4;font-family:Inter,system-ui,sans-serif}'+
  '.vt h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:400;font-size:2rem;margin:.1rem 0 .2rem}.vt .dim{color:rgba(247,247,244,.55);font-size:.82rem}'+
  '.vt-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px}'+
  '.vt-seg{display:flex;border:1px solid rgba(247,247,244,.18);border-radius:999px;overflow:hidden}.vt-seg button{background:none;border:0;color:#f7f7f4;padding:.5rem .9rem;font-size:.78rem;cursor:pointer}.vt-seg button.on{background:#f7f7f4;color:#050505}'+
  '.vt-tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}.vt-tabs button{border:1px solid rgba(247,247,244,.2);background:none;color:#f7f7f4;border-radius:999px;padding:.6rem 1rem;font-size:.84rem;cursor:pointer}.vt-tabs button.on{background:#f7f7f4;color:#050505;font-weight:600}.vt-tabs b{margin-left:6px;background:#ffb4a8;color:#050505;border-radius:999px;padding:0 .45rem;font-size:.72rem}'+
  '.vt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 16px}.vt-kpi{border:1px solid rgba(247,247,244,.14);border-radius:14px;padding:.75rem .85rem;background:#0d0d0d}.vt-kpi span{display:block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(247,247,244,.55)}.vt-kpi b{font-size:1.25rem;font-weight:600}.vt-kpi.warn b{color:#ffb4a8}'+
  '.vt-card{border:1px solid rgba(247,247,244,.16);border-radius:18px;background:#0b0b0b;padding:16px;margin-bottom:16px}.vt-card h3{margin:0 0 10px;font-size:1rem;font-weight:600}.vt-card h4{margin:16px 0 8px;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(247,247,244,.55);font-weight:500}'+
  '.vt input,.vt select,.vt textarea{width:100%;background:#151515;border:1px solid rgba(247,247,244,.18);border-radius:10px;color:#f7f7f4;padding:.62rem .7rem;font:inherit;font-size:.9rem}'+
  '.vt label{display:block;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,247,244,.6);margin:0 0 4px}'+
  '.vt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}'+
  '.vt-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:thin}.vt-chips button{flex:none;border:1px solid rgba(247,247,244,.2);background:none;color:#f7f7f4;border-radius:999px;padding:.45rem .85rem;font-size:.8rem;cursor:pointer;white-space:nowrap}.vt-chips button.on{background:#f7f7f4;color:#050505;font-weight:600}.vt-chips small{opacity:.6;margin-left:4px}'+
  '.vt-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;margin-top:8px;max-height:430px;overflow:auto;padding-right:2px}'+
  '.vt-prod{border:1px solid rgba(247,247,244,.14);border-radius:12px;background:#121212;color:#f7f7f4;padding:0;text-align:left;cursor:pointer;overflow:hidden}.vt-prod:hover{border-color:#f7f7f4}'+
  '.vt-prod img,.vt-prod .ph{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;background:#1d1d1d}.vt-prod span{display:block;padding:.4rem .5rem .5rem;font-size:.76rem;line-height:1.25}.vt-prod small{display:block;color:rgba(247,247,244,.6);font-size:.7rem}'+
  '.vt-lines{margin-top:10px;display:grid;gap:8px}.vt-line{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;border:1px solid rgba(247,247,244,.12);border-radius:12px;padding:.5rem}'+
  '.vt-line img,.vt-line .ph{width:44px;height:56px;object-fit:cover;border-radius:6px;background:#222}.vt-line .nm{font-weight:600;font-size:.9rem}.vt-line .ctl{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}'+
  '.vt-line .ctl select,.vt-line .ctl input{width:auto;min-width:70px;padding:.4rem .5rem;font-size:.82rem}.vt-line .ctl input.q{width:62px}.vt-line .ctl input.p{width:110px}'+
  '.vt-x{background:none;border:1px solid rgba(247,247,244,.2);color:#f7f7f4;border-radius:999px;width:32px;height:32px;cursor:pointer}'+
  '.vt-btn{border:1px solid #f7f7f4;background:#f7f7f4;color:#050505;border-radius:999px;padding:.75rem 1.2rem;font-weight:600;cursor:pointer;font-size:.88rem}.vt-btn.ghost{background:none;color:#f7f7f4;border-color:rgba(247,247,244,.3)}.vt-btn.sm{padding:.45rem .85rem;font-size:.78rem}.vt-btn:disabled{opacity:.5}'+
  '.vt-pay{display:flex;gap:8px;flex-wrap:wrap}.vt-pay button{flex:1;min-width:140px;border:1px solid rgba(247,247,244,.2);background:none;color:#f7f7f4;border-radius:12px;padding:.65rem;cursor:pointer;font-size:.86rem}.vt-pay button.on{border-color:#f7f7f4;background:rgba(247,247,244,.08);font-weight:600}'+
  '.vt-owe{margin-top:8px;font-size:.9rem;color:#ffb4a8}'+
  '.vt-total{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(247,247,244,.12)}.vt-total b{font-size:1.5rem}'+
  '.vt-chk{display:flex;gap:8px;align-items:center;font-size:.84rem;margin-top:10px;color:rgba(247,247,244,.8)}.vt-chk input{width:auto}'+
  '.vt-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:.75rem 0;border-bottom:1px solid rgba(247,247,244,.08)}.vt-row:last-child{border-bottom:0}.vt-row .t{font-weight:600}.vt-row .it{font-size:.82rem;color:rgba(247,247,244,.7);margin-top:2px}'+
  '.vt-row .tag{display:inline-block;font-size:.68rem;border:1px solid rgba(247,247,244,.2);border-radius:999px;padding:.12rem .5rem;margin:4px 4px 0 0;color:rgba(247,247,244,.75)}.vt-row .tag.owe{border-color:#ffb4a8;color:#ffb4a8}.vt-row .tag.ok{border-color:#9de08f;color:#9de08f}.vt-row.void{opacity:.45}.vt-row.void .t{text-decoration:line-through}'+
  '.vt-row .r{text-align:right}.vt-row .r b{display:block;font-size:1.05rem}.vt-void{background:none;border:0;color:#ffb4a8;font-size:.75rem;cursor:pointer;margin-top:6px;padding:0}.vt-mail{background:none;border:1px solid rgba(247,247,244,.25);border-radius:999px;color:#f7f7f4;font-size:.72rem;cursor:pointer;margin-top:6px;padding:.25rem .6rem}'+
  '.vt-hist{font-size:.76rem;color:rgba(247,247,244,.6);margin-top:4px}.vt-abono{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;justify-content:flex-end}.vt-abono input{width:120px}.vt-abono select{width:auto}'+
  '.vt-empty{color:rgba(247,247,244,.5);font-size:.86rem;padding:.6rem 0}'+
  '.vt-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;background:#f7f7f4;color:#050505;padding:.7rem 1.1rem;border-radius:999px;font-weight:600;z-index:9999;transition:.3s;font-family:Inter,sans-serif;font-size:.88rem;max-width:92vw;text-align:center}.vt-toast.on{opacity:1;transform:translate(-50%,0)}.vt-toast.bad{background:#ffb4a8}'+
  '.vt-cost{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px;padding:.35rem .5rem;border:1px dashed rgba(230,207,159,.35);border-radius:10px;background:rgba(230,207,159,.05);font-size:.78rem;color:#e6cf9f}.vt-cost input{width:110px!important;min-width:0!important;padding:.35rem .5rem!important;font-size:.82rem!important}.vt-cost .g{margin-left:auto;color:#9de08f}.vt-cost .g.neg{color:#ffb4a8}'+
  '.vt-priv{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px;padding:.6rem .8rem;border:1px solid rgba(230,207,159,.35);border-radius:12px;background:rgba(230,207,159,.06);font-size:.86rem;color:#e6cf9f}.vt-priv b{color:#f7f7f4}.vt-priv .g{color:#9de08f}.vt-priv .g.neg{color:#ffb4a8}.vt-priv small{color:rgba(247,247,244,.5);font-size:.72rem;width:100%}'+
  '.vt-kpi.good b{color:#9de08f}.vt-kpi.gold b{color:#e6cf9f}.vt-kpi small{display:block;color:rgba(247,247,244,.5);font-size:.7rem;margin-top:2px}'+
  '.vt-src{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin:0 0 14px}.vt-src button{text-align:left;border:1px solid rgba(247,247,244,.14);border-radius:14px;background:#0d0d0d;color:#f7f7f4;padding:.75rem .85rem;cursor:pointer}.vt-src button.on{border-color:#e6cf9f;background:rgba(230,207,159,.08)}.vt-src b{display:block;font-size:.9rem}.vt-src span{display:block;font-size:.78rem;color:rgba(247,247,244,.6);margin-top:3px}.vt-src em{font-style:normal;color:#9de08f}'+
  '.vt-row .tag.gold{border-color:#e6cf9f;color:#e6cf9f}.vt-row .pr{font-size:.8rem;margin-top:3px}.vt-row .pr .g{color:#9de08f}.vt-row .pr .g.neg{color:#ffb4a8}'+
  '.vt-modal{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;font-family:Inter,system-ui,sans-serif;color:#f7f7f4}.vt-modal .bx{width:min(560px,100%);max-height:92vh;overflow:auto;background:#0b0b0b;border:1px solid rgba(247,247,244,.18);border-radius:20px 20px 0 0;padding:18px 16px 22px}'+
  '@media(min-width:700px){.vt-modal{align-items:center}.vt-modal .bx{border-radius:20px}}.vt-modal h3{margin:0 0 2px;font-size:1.05rem}.vt-modal .dim{color:rgba(247,247,244,.55);font-size:.8rem}.vt-modal input{width:100%;background:#151515;border:1px solid rgba(247,247,244,.18);border-radius:10px;color:#f7f7f4;padding:.6rem .7rem;font:inherit;font-size:.92rem}.vt-modal label{display:block;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,247,244,.6);margin:12px 0 4px}'+
  '.vt-ci{display:grid;grid-template-columns:40px 1fr 120px;gap:10px;align-items:center;padding:.5rem 0;border-bottom:1px solid rgba(247,247,244,.08)}.vt-ci img,.vt-ci .ph{width:40px;height:52px;object-fit:cover;border-radius:6px;background:#222}.vt-ci .n{font-size:.86rem;line-height:1.3}.vt-ci small{display:block;color:rgba(247,247,244,.55);font-size:.74rem}'+
  '.vt-sum{display:grid;grid-template-columns:1fr auto;gap:4px 12px;margin-top:14px;padding-top:10px;border-top:1px solid rgba(247,247,244,.12);font-size:.9rem}.vt-sum b{text-align:right}.vt-sum .g{color:#9de08f}.vt-sum .g.neg{color:#ffb4a8}.vt-mact{display:flex;gap:8px;margin-top:16px}.vt-mact button{flex:1}'+
  '@media(max-width:560px){.vt h2{font-size:1.6rem}.vt-row{grid-template-columns:1fr}.vt-row .r{text-align:left}.vt-abono{justify-content:flex-start}}';

  // ---------------- layout ----------------
  function render(){
    var el=S.el;if(!el)return;
    var R=S.recv&&S.recv.totals;
    el.innerHTML='<div class="vt"><div class="vt-head"><div><div class="dim">Ventas que no pasan por la página</div><h2>💵 Ventas manuales</h2></div>'+
      (S.view==="vender"?'<div class="vt-seg">'+[[1,"Hoy"],[7,"7 días"],[30,"30 días"]].map(function(x){return '<button type="button" data-days="'+x[0]+'" class="'+(x[0]===S.days?"on":"")+'">'+x[1]+'</button>';}).join("")+'</div>':'')+'</div>'+
      '<div class="vt-tabs"><button type="button" data-view="vender" class="'+(S.view==="vender"?"on":"")+'">Registrar venta</button><button type="button" data-view="cobrar" class="'+(S.view==="cobrar"?"on":"")+'">Cuentas por cobrar'+(R&&R.count?'<b>'+R.count+'</b>':'')+'</button><button type="button" data-view="ganancia" class="'+(S.view==="ganancia"?"on":"")+'">🔒 Ganancia</button></div>'+
      (S.view==="vender"?sellHtml():S.view==="ganancia"?profHtml():recvHtml())+'</div>';
    if(S.view==="vender"){paintCats();paintProds();paintLines();paintData();}else if(S.view==="ganancia")paintProf();else paintRecv();
  }

  function sellHtml(){
    return '<div class="vt-kpis" id="vtKpis"></div>'+
      '<div class="vt-card" id="vtForm">'+(S.editing?'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;padding:.6rem .8rem;border:1px solid #e6cf9f;border-radius:12px;background:rgba(230,207,159,.08)"><b>✏️ Editando la venta '+esc(S.editing.ticket)+'</b><button type="button" class="vt-btn ghost sm" data-cancel-edit="1">Cancelar edición</button></div>':'<h3>Registrar una venta</h3>')+
        '<label>Categoría</label><div class="vt-chips" id="vtCats"></div>'+
        '<input id="vtQ" placeholder="Buscar dentro de la categoría: vestido, jean, body…" autocomplete="off">'+
        '<div class="vt-prods" id="vtProds"></div>'+
        '<div style="margin-top:8px"><button type="button" class="vt-btn ghost sm" data-free="1">+ Prenda que no está en la tienda</button></div>'+
        '<h4>Prendas de esta venta</h4><div class="vt-lines" id="vtLines"></div>'+
        '<h4>Venta y pago</h4><div class="vt-grid">'+
          '<div><label>Dónde se vendió</label><select id="vtCh">'+opts(CH,"tienda")+'</select></div>'+
          '<div><label>Cómo pagó</label><select id="vtPay">'+opts(PAY,"efectivo")+'</select></div>'+
          '<div><label>Fecha</label><input id="vtDate" type="date" value="'+today()+'" max="'+today()+'"></div>'+
          '<div><label>Descuento ($)</label><input id="vtDisc" inputmode="numeric" placeholder="0"></div>'+
        '</div>'+
        '<div class="vt-pay" style="margin-top:12px">'+Object.keys(PLANS).map(function(k){return '<button type="button" data-plan="'+k+'" class="'+(S.plan===k?"on":"")+'">'+PLANS[k].label+'</button>';}).join("")+'</div>'+
        '<div id="vtAbonoBox" '+(S.plan==="contado"?'hidden':'')+' style="margin-top:10px"><div class="vt-grid"><div><label>'+(S.editing?'Total abonado hasta hoy':'¿Cuánto abonó hoy?')+'</label><input id="vtAbono" inputmode="numeric" placeholder="$0"></div></div><div class="vt-owe" id="vtOwe"></div></div>'+
        '<h4>Clienta</h4><div class="vt-grid">'+
          '<div><label>Nombre</label><input id="vtName" placeholder="Nombre y apellido"></div>'+
          '<div><label>Celular</label><input id="vtPhone" inputmode="tel" placeholder="300 000 0000"></div>'+
          '<div><label>Tipo de documento</label><select id="vtDocT">'+opts(DOC,"","—")+'</select></div>'+
          '<div><label>Número de documento</label><input id="vtDoc" inputmode="numeric" placeholder="Sin puntos"></div>'+
          '<div><label>Dirección</label><input id="vtAddr" placeholder="Calle, número, barrio, ciudad"></div>'+
          '<div><label>Enviar recibo al correo</label><input id="vtMail" type="email" inputmode="email" placeholder="clienta@gmail.com"></div>'+
          '<div><label>Nota</label><input id="vtNote" placeholder="Ej: cambio de talla, vendió Ana"></div>'+
        '</div>'+
        '<label class="vt-chk"><input type="checkbox" id="vtStock" checked> Descontar del inventario</label>'+
        '<div class="vt-priv" id="vtPriv"></div>'+
        '<div class="vt-total"><div><div class="dim">Total de la venta</div><b id="vtTotal">$0</b></div><button type="button" class="vt-btn" id="vtSave">'+(S.editing?'Guardar cambios':'Guardar venta')+'</button></div>'+
      '</div>'+
      '<div class="vt-card"><h3>Ventas registradas</h3><div id="vtList"><div class="vt-empty">Cargando…</div></div></div>';
  }
  function recvHtml(){return '<div class="vt-kpis" id="vrKpis"></div><div class="vt-card"><h3>Clientas que deben</h3><div class="dim" style="margin:-4px 0 8px">Las más antiguas primero. Registra cada abono hasta que quede en $0.</div><div id="vrList"><div class="vt-empty">Cargando…</div></div></div>';}

  // ---------------- product picker: category chips + grid ----------------
  function paintCats(){
    var box=S.el.querySelector("#vtCats");if(!box)return;
    var counts={};S.cat.forEach(function(p){var c=p.categoria||"Otras";counts[c]=(counts[c]||0)+1;});
    box.innerHTML='<button type="button" data-cat="" class="'+(!S.catSel?"on":"")+'">Todas<small>'+S.cat.length+'</small></button>'+
      S.cats.map(function(c){return '<button type="button" data-cat="'+esc(c)+'" class="'+(S.catSel===c?"on":"")+'">'+esc(c)+'<small>'+(counts[c]||0)+'</small></button>';}).join("");
  }
  function paintProds(){
    var box=S.el.querySelector("#vtProds");if(!box)return;
    var q=norm((S.el.querySelector("#vtQ")||{}).value).trim();
    if(!S.catSel&&!q){box.innerHTML='<div class="vt-empty" style="grid-column:1/-1">Elige una categoría o escribe el nombre de la prenda.</div>';return;}
    var res=S.cat.filter(function(p){return (!S.catSel||(p.categoria||"Otras")===S.catSel)&&(!q||norm(p.nombre+" "+p.categoria+" "+(p.tela||"")).indexOf(q)>=0);}).slice(0,80);
    box.innerHTML=res.length?res.map(function(p){return '<button type="button" class="vt-prod" data-add="'+esc(p.id||p.nombre)+'">'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="" loading="lazy">':'<div class="ph"></div>')+'<span>'+esc(p.nombre)+'<small>'+esc(p.precio||"")+' · '+esc(p.tallas||"Única")+'</small></span></button>';}).join(""):'<div class="vt-empty" style="grid-column:1/-1">No hay prendas con ese nombre aquí. Usa “Prenda que no está en la tienda”.</div>';
  }
  function addProduct(key){
    var p=S.cat.find(function(x){return (x.id||x.nombre)===key;});if(!p)return;
    var sizes=sizesOf(p);
    var ic=p.id&&S.inv[p.id]?S.inv[p.id]:0;
    S.lines.push({pid:p.id||"",nombre:p.nombre,categoria:p.categoria||"",precio:num(p.precio),qty:1,size:sizes[0]||"",sizes:sizes,img:p.imagen||"",costo:ic||null,invCost:ic});
    paintLines();toast("+ "+p.nombre);
  }

  // ---------------- lines and totals ----------------
  function paintLines(){
    var box=S.el&&S.el.querySelector("#vtLines");if(!box)return;
    box.innerHTML=S.lines.length?S.lines.map(function(l,i){
      var sizes=l.sizes||[];
      return '<div class="vt-line" data-i="'+i+'">'+(l.img?'<img src="'+esc(l.img)+'" alt="">':'<span class="ph"></span>')+'<div>'+
        (l.free?'<input data-f="nombre" value="'+esc(l.nombre)+'" placeholder="Nombre de la prenda">':'<div class="nm">'+esc(l.nombre)+'</div>')+
        '<div class="ctl">'+(sizes.length>1?'<select data-f="size">'+sizes.map(function(s){return '<option'+(s===l.size?' selected':'')+'>'+esc(s)+'</option>';}).join("")+'</select>':(l.free?'<input data-f="size" value="'+esc(l.size)+'" placeholder="Talla" style="width:80px">':''))+
        '<input class="q" data-f="qty" type="number" min="1" max="99" value="'+l.qty+'" title="Cantidad">'+
        '<input class="p" data-f="precio" inputmode="numeric" value="'+esc(money(l.precio))+'" title="Precio de UNA prenda"><span class="dim" style="align-self:center">c/u</span><b class="lt" data-lt="'+i+'" style="align-self:center;margin-left:auto">'+((l.qty||1)>1?money(l.precio*(l.qty||1)):'')+'</b></div>'+
        '<div class="vt-cost" title="Solo lo ves tú: no sale en el recibo">🔒 Costo c/u <input data-f="costo" inputmode="numeric" value="'+(l.costo?esc(money(l.costo)):'')+'" placeholder="'+(l.invCost?esc(money(l.invCost)):'¿Cuánto te costó?')+'"><span class="g" data-lg="'+i+'"></span></div></div>'+
        '<button type="button" class="vt-x" data-del="'+i+'" aria-label="Quitar">×</button></div>';}).join(""):'<div class="vt-empty">Toca una prenda arriba para agregarla.</div>';
    total();
  }
  function totals(){
    var sub=S.lines.reduce(function(s,l){return s+(l.precio||0)*(l.qty||1);},0),disc=Math.min(sub,num((S.el.querySelector("#vtDisc")||{}).value));
    var t=Math.max(0,sub-disc);
    var inp=S.el.querySelector("#vtAbono");
    if(inp&&!S.abTouched&&PLANS[S.plan]&&PLANS[S.plan].pct>0&&PLANS[S.plan].pct<1&&!S.editing){var sug=Math.round(t*PLANS[S.plan].pct/1000)*1000;if(num(inp.value)!==sug)inp.value=sug?money(sug):"";}
    var ab=S.plan==="contado"?t:Math.min(t,num((inp||{}).value));
    var cost=0,miss=0;S.lines.forEach(function(l){var u=l.costo||0;if(!u)miss++;cost+=u*(l.qty||1);});
    return {sub:sub,disc:disc,total:t,paid:ab,owe:t-ab,cost:cost,profit:t-cost,miss:miss};
  }
  function total(){
    var T=totals(),el=S.el.querySelector("#vtTotal"),ow=S.el.querySelector("#vtOwe");
    if(el)el.textContent=money(T.total)+(T.disc?"  (desc. "+money(T.disc)+")":"");
    if(ow)ow.textContent=S.plan==="contado"?"":(T.total?"Abona "+money(T.paid)+" · queda debiendo "+money(T.owe)+(T.owe>0?" · fecha límite "+shortDate(addBizDays((S.el.querySelector("#vtDate")||{}).value,10))+" (10 días hábiles)":""):"");
    S.lines.forEach(function(l,i){var e=S.el.querySelector('[data-lt="'+i+'"]');if(e)e.textContent=(l.qty||1)>1?"= "+money(l.precio*(l.qty||1)):"";
      var g=S.el.querySelector('[data-lg="'+i+'"]');if(g){if(l.costo){var gp=(l.precio-l.costo)*(l.qty||1);g.textContent="ganas "+money(gp)+((l.qty||1)>1?" en total":"")+(T.disc?" (antes del descuento)":"");g.className="g"+(gp<0?" neg":"");}else g.textContent="";}});
    var pv=S.el.querySelector("#vtPriv");
    var looksAbono=T.disc&&PLANS[S.plan]&&PLANS[S.plan].pct>0&&PLANS[S.plan].pct<1&&Math.abs(T.disc-T.sub*PLANS[S.plan].pct)<=1000;
    if(pv)pv.innerHTML=S.lines.length?'🔒 <span>Prendas <b>'+money(T.sub)+'</b></span>'+(T.disc?'<span>Descuento <b style="color:#ffb4a8">-'+money(T.disc)+'</b></span>':'')+'<span>Costo <b>'+money(T.cost)+'</b></span><span>Ganancia <b class="g'+(T.profit<0?" neg":"")+'">'+money(T.profit)+'</b>'+(T.total?' ('+pct(T.profit,T.total)+'%)':'')+'</span>'+(T.miss?'<span style="color:#ffb4a8">⚠ '+T.miss+' prenda'+(T.miss>1?'s':'')+' sin costo</span>':'')+
      (looksAbono?'<small style="color:#ffb4a8;font-size:.8rem">⚠ El descuento ('+money(T.disc)+') es igual al abono de '+esc(PLAN_NAME[S.plan])+'. Si eso es lo que pagó hoy, bórralo de <b>Descuento</b> y escríbelo en <b>¿Cuánto abonó hoy?</b>.</small>':'')+
      '<small>Solo lo ves tú. No sale en el recibo de la clienta.</small>':'';
  }

  // ---------------- sales list ----------------
  function paintData(){
    var D=S.data,k=S.el&&S.el.querySelector("#vtKpis"),list=S.el&&S.el.querySelector("#vtList");if(!k||!list)return;
    if(!D){k.innerHTML="";return;}
    var T=D.totals;
    k.innerHTML='<div class="vt-kpi"><span>Vendido '+(S.days===1?"hoy":"en "+S.days+" días")+'</span><b>'+money(T.revenue)+'</b></div><div class="vt-kpi"><span>Recibido</span><b>'+money(T.collected!=null?T.collected:T.revenue)+'</b></div>'+
      (T.owed?'<div class="vt-kpi warn"><span>Quedó por cobrar</span><b>'+money(T.owed)+'</b></div>':'')+'<div class="vt-kpi"><span>Ventas</span><b>'+T.count+'</b></div>'+
      (T.profit!=null?'<div class="vt-kpi good"><span>🔒 Ganancia</span><b>'+money(T.profit)+'</b>'+(T.uncosted||T.excludedCount?'<small>'+[T.uncosted?T.uncosted+' sin costo':'',T.excludedCount?T.excludedCount+' no cuenta'+(T.excludedCount>1?'n':''):''].filter(Boolean).join(' · ')+'</small>':'')+'</div>':'');
    list.innerHTML=D.list.length?D.list.map(rowHtml).join(""):'<div class="vt-empty">No hay ventas manuales en este periodo.</div>';
  }
  function rowHtml(v){
    var it=v.items.map(function(x){return esc(x.nombre)+(x.size?" ("+esc(x.size)+")":"")+(x.qty>1?" ×"+x.qty:"");}).join(" · ");
    var live=v.status==="pagado";
    return '<div class="vt-row'+(live?"":" void")+'"><div><div class="t">'+esc(v.ticket)+' · '+esc(when(v.paidAt))+(v.name?' · '+esc(v.name):'')+'</div><div class="it">'+it+'</div>'+
      '<span class="tag">'+esc(v.channelLabel||"")+'</span><span class="tag">'+esc(v.payLabel||"")+'</span>'+
      (v.plan&&v.plan!=="contado"?'<span class="tag">'+esc(PLAN_NAME[v.plan]||v.plan)+'</span>':'')+(live&&v.balance>0?'<span class="tag owe">Debe '+money(v.balance)+(v.dueAt?' · vence '+esc(shortDate(v.dueAt)):'')+'</span>':'')+(live&&v.payments&&v.payments.length>1&&!v.balance?'<span class="tag ok">Pagada con abonos</span>':'')+
      (v.doc?'<span class="tag">'+esc(v.docLabel||"Doc")+' '+esc(v.doc)+'</span>':'')+(v.points?'<span class="tag">+'+v.points+' pts Club</span>':'')+(v.note?'<span class="tag">'+esc(v.note)+'</span>':'')+(live?'':'<span class="tag">Anulada</span>')+(live&&v.cost?'<div class="pr">'+(v.excluded?'<span class="dim">🚫 No cuenta en la ganancia · </span>':'')+'🔒 Costo '+money(v.cost.cost)+' · <span class="g'+(v.cost.profit<0?" neg":"")+'">ganancia '+money(v.cost.profit)+'</span>'+(v.cost.missing?' · <span style="color:#ffb4a8">⚠ falta costo</span>':'')+'</div>':'')+'</div>'+
      '<div class="r"><b>'+money(v.total)+'</b>'+(live?'<button type="button" class="vt-mail" data-edit="'+esc(v.id)+'">✏️ Editar</button> '+'<button type="button" class="vt-mail" data-cost="'+esc(v.id)+'">🔒 Costo</button> '+shareBtns(v.id)+' <button type="button" class="vt-mail" data-mail="'+esc(v.id)+'" data-to="'+esc(v.email||"")+'">📧 Correo</button><br><button type="button" class="vt-void" data-void="'+esc(v.id)+'">Anular</button>':'')+'</div></div>';
  }

  // ---------------- cuentas por cobrar ----------------
  function paintRecv(){
    var D=S.recv,k=S.el.querySelector("#vrKpis"),list=S.el.querySelector("#vrList");if(!k||!list)return;
    if(!D){list.innerHTML='<div class="vt-empty">Cargando…</div>';return;}
    var T=D.totals;
    var late=D.list.filter(function(x){return x.overdue;});
    k.innerHTML=(late.length?'<div class="vt-kpi warn"><span>Vencido ('+late.length+')</span><b>'+money(late.reduce(function(s,x){return s+x.balance;},0))+'</b></div>':'')+'<div class="vt-kpi warn"><span>Total por cobrar</span><b>'+money(T.owed)+'</b></div><div class="vt-kpi"><span>Clientas que deben</span><b>'+T.count+'</b></div><div class="vt-kpi"><span>Ya abonado</span><b>'+money(T.collected)+'</b></div>';
    list.innerHTML=D.list.length?D.list.map(function(v){
      var it=v.items.map(function(x){return esc(x.nombre)+(x.size?" ("+esc(x.size)+")":"");}).join(" · ");
      var hist=(v.payments||[]).map(function(p){return when(p.at,false)+": "+money(p.amount)+" "+esc(PAY[p.pay]||p.pay||"");}).join(" · ");
      var d=daysAgo(v.paidAt),wa=v.phone?'https://wa.me/57'+String(v.phone).replace(/^57/,"")+'?text='+encodeURIComponent("Hola "+(v.name||"")+" 🖤 te escribimos de CANEVA. Te recordamos el saldo pendiente de tu compra "+v.ticket+": "+money(v.balance)+(v.dueAt?" (fecha límite "+shortDate(v.dueAt)+")":"")+". ¡Gracias!"):"";
      return '<div class="vt-row"><div><div class="t">'+esc(v.name||"Sin nombre")+(v.phone?' · '+esc(v.phone):'')+'</div>'+
        '<div class="it">'+esc(v.ticket)+' · '+esc(when(v.paidAt,false))+' · hace '+d+' día'+(d===1?'':'s')+' · '+it+'</div>'+
        '<span class="tag">'+esc(PLAN_NAME[v.plan]||"Abono")+'</span>'+(v.dueAt?(v.overdue?'<span class="tag owe">⚠ Vencida hace '+Math.abs(v.daysLeft)+' día'+(Math.abs(v.daysLeft)===1?'':'s')+' ('+esc(shortDate(v.dueAt))+')</span>':'<span class="tag">Vence '+esc(shortDate(v.dueAt))+(v.daysLeft<=2?' · en '+v.daysLeft+' día'+(v.daysLeft===1?'':'s'):'')+'</span>'):'')+
        (v.doc?'<span class="tag">'+esc(v.docLabel||"Doc")+' '+esc(v.doc)+'</span>':'')+(v.address?'<span class="tag">📍 '+esc(v.address)+'</span>':'')+
        '<div class="vt-hist">Total '+money(v.total)+' · abonado '+money(v.paid)+(hist?' ('+hist+')':'')+'</div></div>'+
        '<div class="r"><b style="color:#ffb4a8">Debe '+money(v.balance)+'</b>'+
          '<div class="vt-abono" data-id="'+esc(v.id)+'"><input inputmode="numeric" placeholder="Abono $" data-amt><select data-pay>'+opts(PAY,"efectivo")+'</select><button type="button" class="vt-btn sm" data-abonar="'+esc(v.id)+'">Registrar abono</button></div>'+
          '<div class="vt-abono"><button type="button" class="vt-btn ghost sm" data-saldar="'+esc(v.id)+'" data-bal="'+v.balance+'">Pagó todo ('+money(v.balance)+')</button>'+(wa?'<a class="vt-btn ghost sm" style="text-decoration:none" target="_blank" rel="noopener" href="'+wa+'">💬 Recordar</a>':'')+'</div><div class="vt-abono">'+shareBtns(v.id)+'</div></div></div>';
    }).join(""):'<div class="vt-empty">Nadie debe nada 🎉</div>';
  }

  // ---------------- 🔒 Ganancia: every paid sale with its cost (web + manual) ----------------
  function profHtml(){
    return '<div class="vt-head" style="margin:-4px 0 10px"><div class="dim" style="max-width:560px">🔒 Solo lo ves tú. Aquí está cada venta pagada: las de la página (pasarela Bold u otro medio) y las manuales. Escribe cuánto te costó cada prenda y el admin calcula tu ganancia. Las prendas con costo en Inventario lo toman solas.</div>'+
      '<div class="vt-seg">'+[[7,"7 días"],[30,"30 días"],[90,"90 días"]].map(function(x){return '<button type="button" data-pdays="'+x[0]+'" class="'+(x[0]===S.pdays?"on":"")+'">'+x[1]+'</button>';}).join("")+'</div></div>'+
      '<div class="vt-kpis" id="vpKpis"></div><div class="vt-src" id="vpSrc"></div><div class="vt-card"><h3 id="vpTitle">Ventas pagadas</h3><div id="vpList"><div class="vt-empty">Cargando…</div></div></div><div class="vt-card" id="vpEx"></div>';
  }
  function profRow(v){
      var it=v.items.map(function(x){return esc(x.nombre)+(x.size?" ("+esc(x.size)+")":"")+(x.qty>1?" ×"+x.qty:"")+(x.unitCost?' <span class="dim">· costo '+money(x.unitCost)+'</span>':' <span style="color:#ffb4a8">· sin costo</span>');}).join(" · ");
      return '<div class="vt-row'+(v.excluded?' void':'')+'" style="'+(v.excluded?'opacity:.75':'')+'"><div><div class="t" style="text-decoration:none">'+esc(v.ticket||"")+' · '+esc(when(v.paidAt))+(v.name?' · '+esc(v.name):'')+'</div><div class="it">'+it+'</div>'+
        '<span class="tag gold">'+SRC[v.source]+'</span>'+(v.viaLabel?'<span class="tag">'+esc(v.viaLabel)+'</span>':'')+(v.source==="manual"&&v.channelLabel?'<span class="tag">'+esc(v.channelLabel)+'</span>':'')+(v.extra?'<span class="tag">Otros costos '+money(v.extra)+'</span>':'')+(v.note?'<span class="tag">'+esc(v.note)+'</span>':'')+(v.missing&&!v.excluded?'<span class="tag owe">⚠ '+v.missing+' sin costo</span>':'')+(v.excluded?'<span class="tag">🚫 No cuenta · '+esc(v.excludedWhy||"")+'</span>':'')+'</div>'+
        '<div class="r"><b>'+money(v.total)+'</b><div class="pr">Costo '+money(v.cost)+'</div><div class="pr"><span class="g'+(v.profit<0?" neg":"")+'">Ganancia '+money(v.profit)+(v.margin!=null?' ('+v.margin+'%)':'')+'</span></div>'+
        '<button type="button" class="vt-mail" data-cost="'+esc(v.id)+'">🔒 '+(v.missing?"Poner costo":"Editar costo")+'</button> <button type="button" class="vt-mail" data-exc="'+esc(v.id)+'" data-on="'+(v.excluded?0:1)+'">'+(v.excluded?"↩ Contar":"🚫 No contar")+'</button></div></div>';
  }
  function paintProf(){
    var D=S.prof,k=S.el&&S.el.querySelector("#vpKpis"),src=S.el&&S.el.querySelector("#vpSrc"),list=S.el&&S.el.querySelector("#vpList");if(!k||!list)return;
    S.el.querySelectorAll("[data-pdays]").forEach(function(x){x.classList.toggle("on",+x.dataset.pdays===S.pdays);});
    if(!D){list.innerHTML='<div class="vt-empty">Cargando…</div>';return;}
    var T=D.totals;
    k.innerHTML='<div class="vt-kpi"><span>Vendido · '+S.pdays+' días</span><b>'+money(T.revenue)+'</b><small>'+T.count+' ventas</small></div>'+
      '<div class="vt-kpi"><span>Costo</span><b>'+money(T.cost)+'</b></div>'+
      '<div class="vt-kpi good"><span>Ganancia</span><b>'+money(T.profit)+'</b><small>margen '+pct(T.profit,T.revenue)+'%</small></div>'+
      (T.missing?'<div class="vt-kpi warn"><span>Sin costo</span><b>'+T.missing+'</b><small>ganancia real de lo que sí tiene costo: '+money(T.costedProfit)+'</small></div>':'');
    src.innerHTML=D.bySource.map(function(x){return '<button type="button" data-psrc="'+x.key+'" class="'+(S.psrc===x.key?"on":"")+'"><b>'+SRC[x.key]+'</b><span>'+x.count+' ventas · '+money(x.revenue)+'</span><span>Ganancia <em>'+money(x.profit)+'</em>'+(x.missing?' · ⚠ '+x.missing+' sin costo':'')+'</span></button>';}).join("")+
      '<button type="button" data-psrc="sin" class="'+(S.psrc==="sin"?"on":"")+'"><b>⚠ Sin costo</b><span>'+T.missing+' ventas para completar</span><span>Tócalas y escribe el costo</span></button>';
    var l=D.list.filter(function(x){return !x.excluded&&(!S.psrc||(S.psrc==="sin"?x.missing:x.source===S.psrc));});
    var ttl=S.el.querySelector("#vpTitle");if(ttl)ttl.textContent=S.psrc?(S.psrc==="sin"?"Ventas sin costo":SRC[S.psrc]):"Ventas pagadas";
    list.innerHTML=l.length?l.map(profRow).join(""):'<div class="vt-empty">'+(S.psrc==="sin"?"Todas las ventas tienen costo ✨":"No hay ventas pagadas en este periodo.")+'</div>';
    var ex=S.el.querySelector("#vpEx"),EX=D.list.filter(function(x){return x.excluded;}),E=D.excluded||{count:0,revenue:0,profit:0};
    if(ex)ex.innerHTML='<h3>🚫 No cuentan en la ganancia'+(E.count?' · '+E.count+' venta'+(E.count>1?'s':'')+' · '+money(E.revenue):'')+'</h3>'+
      '<div class="dim" style="margin:-4px 0 10px">Compras tuyas, de la familia o de prueba. Siguen en Ventas y Reportes, pero no suman aquí. Se sacan solas si la clienta se llama como alguno de estos nombres:</div>'+
      '<div class="vt-abono" style="justify-content:flex-start"><input id="vpNames" style="flex:1;min-width:220px;width:auto" value="'+esc((D.excludeNames||[]).join(", "))+'" placeholder="Ej: Mayra, John Ríos"><button type="button" class="vt-btn sm" data-exnames="1">Guardar nombres</button></div>'+
      (EX.length?'<div style="margin-top:8px"><button type="button" class="vt-btn ghost sm" data-showex="1">'+(S.showEx?'Ocultar':'Ver las '+EX.length)+'</button></div>'+(S.showEx?EX.map(profRow).join(""):''):'<div class="vt-empty">Ninguna venta en este periodo.</div>');
  }
  function loadProf(){
    S.prof=null;paintProf();
    return api("/admin/profit?days="+S.pdays).then(function(d){S.prof=d;paintProf();}).catch(function(e){var l=S.el&&S.el.querySelector("#vpList");if(l)l.innerHTML='<div class="vt-empty">'+(/Ruta no encontrada|404/.test(e.message)?"Falta pegar la Worker v61 en Cloudflare para ver la ganancia.":esc(e.message))+'</div>';});
  }
  function loadInv(){return api("/admin/inventory?days=1").then(function(d){var m={};(d.products||[]).forEach(function(p){if(p.id&&p.cost>0)m[p.id]=p.cost;});S.inv=m;
    var ch=false;S.lines.forEach(function(l){if(l.pid&&m[l.pid]&&!l.costo&&!l.invCost){l.costo=m[l.pid];l.invCost=m[l.pid];ch=true;}});if(ch)paintLines();}).catch(function(){});}

  // Cost editor (also used from Pedidos). v: {id, ticket, total, items:[{nombre,size,qty,precio,imagen,unitCost?,costFrom?,invCost?}], cost?:{lines:[{unit,from}],extra,note}, extra?, note?}
  function editCost(v,done){
    if(!document.getElementById("vt-css")){var st=document.createElement("style");st.id="vt-css";st.textContent=CSS;document.head.appendChild(st);}
    var items=v.items||[],cl=(v.cost&&v.cost.lines)||[];
    var lines=items.map(function(x,i){var from=x.costFrom!==undefined?x.costFrom:(cl[i]&&cl[i].from)||"",unit=x.unitCost!==undefined?x.unitCost:(cl[i]&&cl[i].unit)||0;
      var inv=x.invCost!==undefined?x.invCost:(x.pid&&S.inv[x.pid])||(from==="inventario"?unit:0);
      return {own:from==="propio"?unit:null,inv:inv||0,qty:x.qty||1,precio:num(x.precio)};});
    var extra=v.extra!=null?v.extra:(v.cost&&v.cost.extra)||0,note=v.note!=null?v.note:(v.cost&&v.cost.note)||"";
    var m=document.createElement("div");m.className="vt-modal";
    m.innerHTML='<div class="bx"><h3>🔒 Costo de '+esc(v.ticket||"la venta")+'</h3><div class="dim">Solo lo ves tú. No aparece en el recibo, el correo ni la tienda. Si dejas una prenda vacía usa el costo de Inventario.</div>'+
      items.map(function(x,i){var L=lines[i];return '<div class="vt-ci">'+(x.imagen?'<img src="'+esc(x.imagen)+'" alt="">':'<span class="ph"></span>')+'<div class="n">'+esc(x.nombre)+(x.size?' · '+esc(x.size):'')+'<small>'+(L.qty>1?L.qty+' × ':'')+'vendida a '+esc(money(L.precio))+(L.inv?' · en Inventario: '+money(L.inv):'')+'</small></div><input data-ci="'+i+'" inputmode="numeric" placeholder="'+(L.inv?esc(money(L.inv)):'Costo c/u')+'" value="'+(L.own!=null?esc(money(L.own)):'')+'"></div>';}).join("")+
      '<label>Otros costos de esta venta</label><input data-cx inputmode="numeric" placeholder="Envío, empaque, comisión de Bold…" value="'+(extra?esc(money(extra)):'')+'">'+
      '<label>Nota (opcional)</label><input data-cn maxlength="160" placeholder="Ej: envío Interrapidísimo $12.000" value="'+esc(note)+'">'+
      '<div class="vt-sum" data-sum></div><label class="vt-chk" style="text-transform:none;letter-spacing:0;font-size:.8rem"><input type="checkbox" data-rem checked style="width:auto"> Guardar el costo en Inventario para las prendas que aún no lo tienen</label>'+
      '<div class="vt-mact"><button type="button" class="vt-btn ghost" data-x>Cancelar</button><button type="button" class="vt-btn" data-ok>Guardar costo</button></div></div>';
    document.body.appendChild(m);
    function calc(){var goods=0,miss=0;lines.forEach(function(L,i){var e=m.querySelector('[data-ci="'+i+'"]'),own=e&&e.value.trim()?num(e.value):null;L.cur=own;var u=own!=null?own:L.inv;if(!u)miss++;goods+=u*L.qty;});
      var ex=num(m.querySelector("[data-cx]").value),c=goods+ex,p=(v.total||0)-c;
      m.querySelector("[data-sum]").innerHTML='<span>Vendido</span><b>'+money(v.total)+'</b><span>Costo de las prendas</span><b>'+money(goods)+'</b>'+(ex?'<span>Otros costos</span><b>'+money(ex)+'</b>':'')+'<span>Ganancia</span><b class="g'+(p<0?" neg":"")+'">'+money(p)+(v.total?' ('+pct(p,v.total)+'%)':'')+'</b>'+(miss?'<span style="color:#ffb4a8;grid-column:1/-1">⚠ '+miss+' prenda'+(miss>1?'s':'')+' sin costo</span>':'');}
    calc();
    m.addEventListener("input",calc);
    m.addEventListener("change",function(e){var t=e.target;if((t.dataset.ci!==undefined||t.hasAttribute("data-cx"))&&t.value)t.value=money(num(t.value));});
    m.addEventListener("click",function(e){
      if(e.target===m||e.target.closest("[data-x]"))return m.remove();
      var ok=e.target.closest("[data-ok]");if(!ok)return;
      ok.disabled=true;ok.textContent="Guardando…";
      api("/admin/orders/"+v.id+"/cost",{method:"POST",body:{lines:lines.map(function(L){return L.cur;}),extra:num(m.querySelector("[data-cx]").value),note:m.querySelector("[data-cn]").value,remember:m.querySelector("[data-rem]").checked}})
        .then(function(d){m.remove();toast("🔒 Costo guardado · ganancia "+money(d.profit)+(d.learned?" · "+d.learned+" costo"+(d.learned>1?"s":"")+" nuevo"+(d.learned>1?"s":"")+" en Inventario":""));if(d.learned)loadInv();if(done)done(d);})
        .catch(function(x){ok.disabled=false;ok.textContent="Guardar costo";toast(/Ruta no encontrada|404/.test(x.message)?"Falta pegar la Worker v61 en Cloudflare":x.message,true);});
    });
    var f=m.querySelector("[data-ci]");if(f&&window.innerWidth>700)f.focus();
  }

  // ---------------- receipt to WhatsApp (text) and as an image to share ----------------
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d.length>=11?d:"";}
  function receiptText(v){
    var L=["🖤 *CΛNEVΛ* · Recibo "+v.ticket,when(v.paidAt)+(v.channelLabel?" · "+v.channelLabel:""),""];
    var sub=0;
    (v.items||[]).forEach(function(x){var q=x.qty||1,u=num(x.precio);sub+=u*q;L.push("• "+x.nombre+(x.size?" ("+x.size+")":"")+" — "+(q>1?q+" × "+money(u)+" = "+money(u*q):money(u)));});
    L.push("");
    if(v.discount){L.push("Subtotal: "+money(sub));L.push("Descuento: -"+money(v.discount));}
    L.push("*Total: "+money(v.total)+"*");
    var pays=(v.payments||[]);
    if(pays.length>1||v.balance>0){pays.forEach(function(p){L.push("Abono "+when(p.at,false)+": "+money(p.amount)+(p.pay?" ("+(PAY[p.pay]||p.pay)+")":""));});}
    else if(v.payLabel)L.push("Pago: "+v.payLabel);
    L.push(v.balance>0?"*Saldo pendiente: "+money(v.balance)+"*":"✅ Pagado");
    if(v.balance>0&&(v.plan||v.dueAt))L.push((PLAN_NAME[v.plan]||"Abono")+(v.dueAt?" · fecha límite "+shortDate(v.dueAt):""));
    L.push("","Gracias por tu compra"+(v.name?", "+String(v.name).split(" ")[0]:"")+" 🖤","canevacol.com · IG @caneva.col");
    return L.join("\n");
  }
  function shareWa(v){
    var n=waNum(v.phone),url="https://wa.me/"+(n||"")+"?text="+encodeURIComponent(receiptText(v));
    window.open(url,"_blank","noopener");
  }
  function receiptImage(v){
    var W=1080,items=v.items||[],H=880+items.reduce(function(s,it){return s+((it.qty||1)>1?96:78);},0)+((v.payments||[]).length>1||v.balance>0?(v.payments||[]).length*52:0);
    var c=document.createElement("canvas");c.width=W;c.height=H;var x=c.getContext("2d");
    x.fillStyle="#070604";x.fillRect(0,0,W,H);x.strokeStyle="rgba(201,169,110,.55)";x.lineWidth=3;x.strokeRect(36,36,W-72,H-72);
    x.textAlign="center";x.fillStyle="#e6cf9f";x.font="500 76px Georgia,serif";x.fillText("CΛNEVΛ",W/2,170);
    x.fillStyle="rgba(247,247,244,.7)";x.font="28px Arial,sans-serif";x.fillText("RECIBO "+v.ticket+"  ·  "+when(v.paidAt),W/2,228);
    var y=320;x.textAlign="left";
    var sub=0;
    items.forEach(function(it){var q=it.qty||1,u=num(it.precio);sub+=u*q;x.fillStyle="#f7f7f4";x.font="34px Arial,sans-serif";var t=it.nombre+(it.size?" ("+it.size+")":"");if(t.length>30)t=t.slice(0,29)+"…";x.fillText(t,90,y);x.textAlign="right";x.fillText(money(u*q),W-90,y);x.textAlign="left";
      if(q>1){x.fillStyle="rgba(247,247,244,.55)";x.font="26px Arial,sans-serif";x.fillText(q+" × "+money(u),90,y+34);}y+=q>1?96:78;});
    x.strokeStyle="rgba(247,247,244,.2)";x.lineWidth=2;x.beginPath();x.moveTo(90,y-30);x.lineTo(W-90,y-30);x.stroke();y+=30;
    function row(a,b,big,col){x.fillStyle=col||"#f7f7f4";x.font=(big?"bold 46px":"32px")+" Arial,sans-serif";x.textAlign="left";x.fillText(a,90,y);x.textAlign="right";x.fillText(b,W-90,y);y+=big?70:52;}
    if(v.discount){row("Subtotal",money(sub),false,"rgba(247,247,244,.75)");row("Descuento","-"+money(v.discount),false,"rgba(247,247,244,.75)");}
    row("Total",money(v.total),true);
    var pays=v.payments||[];
    if(pays.length>1||v.balance>0)pays.forEach(function(p){row("Abono "+when(p.at,false),money(p.amount),false,"rgba(247,247,244,.75)");});
    if(v.balance>0){row("Saldo pendiente",money(v.balance),true,"#ffb4a8");if(v.dueAt)row(PLAN_NAME[v.plan]||"Fecha límite","Hasta "+shortDate(v.dueAt),false,"rgba(247,247,244,.75)");}else row("Estado","Pagado ✓",false,"#9de08f");
    x.textAlign="center";x.fillStyle="rgba(247,247,244,.75)";x.font="30px Arial,sans-serif";
    x.fillText("Gracias por tu compra"+(v.name?", "+String(v.name).split(" ")[0]:"")+" 🖤",W/2,H-150);
    x.fillStyle="#e6cf9f";x.fillText("canevacol.com  ·  @caneva.col",W/2,H-100);
    return new Promise(function(res){c.toBlob(function(b){res(b);},"image/png");});
  }
  function shareImage(v){
    receiptImage(v).then(function(blob){
      var file=new File([blob],"recibo-caneva-"+String(v.ticket).replace(/[^\w]/g,"")+".png",{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],text:"Recibo CANEVA "+v.ticket}).catch(function(){});}
      else{var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);toast("Imagen del recibo descargada: adjúntala en WhatsApp");}
    });
  }
  function startEdit(id){
    var v=findSale(id);if(!v)return;
    S.editing={id:v.id,ticket:v.ticket,v:v};S.view="vender";
    S.lines=(v.items||[]).map(function(x,i){var p=S.cat.find(function(c){return c.id&&c.id===x.pid;})||S.cat.find(function(c){return c.nombre===x.nombre;});var sizes=p?sizesOf(p):[];
      if(x.size&&sizes.indexOf(String(x.size).toUpperCase())<0&&sizes.length)sizes=sizes.concat([String(x.size).toUpperCase()]);
      var pid=x.pid||(p&&p.id)||"",cl=v.cost&&v.cost.lines&&v.cost.lines[i];
      return {pid:pid,nombre:x.nombre,categoria:x.categoria||(p&&p.categoria)||"",precio:num(x.precio)||(p?num(p.precio):0),qty:x.qty||1,size:x.size?String(x.size).toUpperCase():(sizes[0]||""),sizes:sizes,img:x.imagen||(p&&p.imagen)||"",free:!p,
        costo:cl&&cl.unit?cl.unit:(pid&&S.inv[pid]?S.inv[pid]:null),invCost:pid&&S.inv[pid]?S.inv[pid]:0};});
    S.payFull=!(v.balance>0);S.plan=v.balance>0?(PLANS[v.plan]&&v.plan!=="contado"?v.plan:"abono"):"contado";S.abTouched=true;
    render();
    var g=function(sel,val){var e=S.el.querySelector(sel);if(e&&val!=null)e.value=val;};
    g("#vtCh",v.channel);g("#vtPay",v.pay);g("#vtDate",String(new Date(Date.parse(v.paidAt)-5*3600000).toISOString()).slice(0,10));g("#vtDisc",v.discount?money(v.discount):"");
    g("#vtName",v.name);g("#vtPhone",v.phone);g("#vtDocT",v.docType);g("#vtDoc",v.doc);g("#vtAddr",v.address);g("#vtMail",v.email);g("#vtNote",v.note);
    if(!S.payFull)g("#vtAbono",money(v.paid));
    total();var f=S.el.querySelector("#vtForm");if(f)f.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function findSale(id){var all=[].concat((S.data&&S.data.list)||[],(S.recv&&S.recv.list)||[],(S.prof&&S.prof.list)||[],S.last?[S.last]:[]);return all.find(function(x){return x.id===id;});}
  function shareBtns(id){return '<button type="button" class="vt-mail" data-wa="'+esc(id)+'">💬 WhatsApp</button> <button type="button" class="vt-mail" data-img="'+esc(id)+'">🖼️ Imagen</button>';}

  // ---------------- data ----------------
  function load(){
    return api("/admin/sales/manual?days="+S.days).then(function(d){S.data=d;paintData();}).catch(function(e){
      var l=S.el&&S.el.querySelector("#vtList");if(l)l.innerHTML='<div class="vt-empty">'+(/Ruta no encontrada|404/.test(e.message)?"Falta pegar la Worker v58 en Cloudflare para usar este módulo.":esc(e.message))+'</div>';});
  }
  function loadRecv(){
    return api("/admin/sales/receivables").then(function(d){S.recv=d;var b=S.el.querySelector('[data-view="cobrar"]');if(b)b.innerHTML='Cuentas por cobrar'+(d.totals.count?'<b>'+d.totals.count+'</b>':'');paintRecv();})
      .catch(function(e){var l=S.el&&S.el.querySelector("#vrList");if(l)l.innerHTML='<div class="vt-empty">'+(/Ruta no encontrada|404/.test(e.message)?"Falta pegar la Worker v58 en Cloudflare para ver las cuentas por cobrar.":esc(e.message))+'</div>';});
  }
  function loadCat(){return fetch(OPT.api+"/catalog?ts="+Date.now()).then(function(r){return r.json();}).then(function(d){
    S.cat=(d.products||[]).filter(function(p){return p.nombre;});
    var seen={};S.cats=[];S.cat.forEach(function(p){var c=p.categoria||"Otras";if(!seen[c]){seen[c]=1;S.cats.push(c);}});
    if(S.view==="vender"){paintCats();paintProds();}}).catch(function(){});}

  function abonar(id,amount,pay){
    if(!(amount>0))return toast("Escribe cuánto abonó",true);
    api("/admin/sales/manual/"+id+"/pay",{method:"POST",body:{amount:amount,pay:pay}}).then(function(d){
      toast(d.settled?"🎉 "+d.ticket+" quedó pagada completa":"✓ Abono de "+money(d.amount)+" · queda debiendo "+money(d.balance));
      loadRecv();load();
    }).catch(function(e){toast(e.message,true);});
  }

  function save(){
    if(S.busy)return;
    var lines=S.lines.filter(function(l){return String(l.nombre||"").trim();});
    if(!lines.length)return toast("Agrega al menos una prenda",true);
    if(lines.some(function(l){return !(l.precio>0);})&&!confirm("Hay prendas con precio $0. ¿Guardar así?"))return;
    var g=function(id){return (S.el.querySelector(id)||{}).value||"";},T=totals();
    if(T.disc&&PLANS[S.plan]&&PLANS[S.plan].pct>0&&PLANS[S.plan].pct<1&&Math.abs(T.disc-T.sub*PLANS[S.plan].pct)<=1000&&!confirm("Pusiste "+money(T.disc)+" como DESCUENTO, que es igual al abono de "+PLAN_NAME[S.plan]+".\nCon eso la venta queda en "+money(T.total)+".\n\nSi eso es lo que pagó hoy, toca Cancelar, bórralo de Descuento y escríbelo en el abono.\n¿Guardar con el descuento?"))return;
    else if(T.disc&&T.disc>=T.sub*0.5&&!confirm("El descuento es de "+money(T.disc)+" sobre "+money(T.sub)+" (queda en "+money(T.total)+"). ¿Es correcto?"))return;
    if(!S.payFull&&T.owe>0&&!g("#vtName").trim()&&!g("#vtPhone").trim())return toast("Para dejar saldo pendiente escribe el nombre o el celular de la clienta",true);
    var body={items:lines.map(function(l){return {pid:l.pid,nombre:l.nombre,categoria:l.categoria,precio:l.precio,qty:l.qty,size:l.size==="Única"?"":l.size,imagen:l.img};}),
      costs:lines.map(function(l){return l.costo>0?l.costo:null;}),
      channel:g("#vtCh"),pay:g("#vtPay"),date:g("#vtDate"),discount:T.disc,paidNow:S.payFull?null:T.paid,plan:S.plan,
      name:g("#vtName"),phone:g("#vtPhone"),docType:g("#vtDocT"),doc:g("#vtDoc"),address:g("#vtAddr"),email:g("#vtMail").trim(),note:g("#vtNote"),noStock:!S.el.querySelector("#vtStock").checked};
    S.busy=true;var b=S.el.querySelector("#vtSave");b.disabled=true;b.textContent="Guardando…";
    if(S.editing){
      body.payFull=S.payFull;body.paidTotal=S.payFull?null:T.paid;
      return api("/admin/sales/manual/"+S.editing.id+"/edit",{method:"POST",body:body}).then(function(d){
        S.busy=false;S.editing=null;S.lines=[];S.payFull=true;S.plan="contado";S.abTouched=false;
        toast("✓ Venta "+d.ticket+" actualizada · "+money(d.total)+(d.balance>0?" · debe "+money(d.balance):""));
        var w=(d.inventory&&d.inventory.warnings)||[];if(w.length)setTimeout(function(){alert("Cambios guardados. Revisa el inventario:\n\n"+w.join("\n"));},400);
        render();load();loadRecv();
      }).catch(function(e){S.busy=false;b.disabled=false;b.textContent="Guardar cambios";toast(e.message,true);});
    }
    api("/admin/sales/manual",{method:"POST",body:body}).then(function(d){
      S.busy=false;S.lines=[];S.payFull=true;S.plan="contado";S.abTouched=false;
      S.last={id:d.id,ticket:d.ticket,total:d.total,paidAt:new Date().toISOString(),items:body.items.map(function(x){return {nombre:x.nombre,size:x.size,qty:x.qty,precio:money(x.precio)};}),
        discount:body.discount,balance:d.balance||0,payments:(d.paid?[{at:new Date().toISOString(),amount:d.paid,pay:body.pay}]:[]),payLabel:PAY[body.pay]||"",channelLabel:CH[body.channel]||"",name:body.name,phone:body.phone,plan:d.plan||body.plan,dueAt:d.dueAt||""};
      var w=(d.inventory&&d.inventory.warnings)||[],em=d.email||{},mailBad=body.email&&!em.sent&&!em.skipped;
      toast("✓ Venta "+d.ticket+" guardada · "+money(d.total)+(d.balance>0?" · debe "+money(d.balance):"")+(em.sent?" · 📧 recibo enviado":"")+(mailBad?" · ⚠ recibo sin enviar":""),mailBad);
      if(mailBad)setTimeout(function(){alert("La venta quedó guardada, pero el recibo no se pudo enviar: "+(em.error||"revisa el correo")+"\nPuedes reenviarlo desde la lista con 📧 Recibo.");},500);
      if(w.length)setTimeout(function(){alert("Venta guardada. Revisa el inventario:\n\n"+w.join("\n"));},mailBad?900:400);
      render();load();loadRecv();
      var card=S.el.querySelector(".vt-card");if(card){var sp=document.createElement("div");sp.className="vt-card";sp.style.borderColor="#9de08f";
        sp.innerHTML='<h3>✓ Venta '+esc(d.ticket)+' guardada · '+money(d.total)+(d.balance>0?' · debe '+money(d.balance):'')+'</h3><div class="dim" style="margin-bottom:10px">Envíale el recibo a la clienta:</div><div class="vt-abono" style="justify-content:flex-start">'+
          '<button type="button" class="vt-btn sm" data-wa="'+esc(d.id)+'">💬 Enviar por WhatsApp</button><button type="button" class="vt-btn ghost sm" data-img="'+esc(d.id)+'">🖼️ Compartir imagen</button></div>';
        card.parentNode.insertBefore(sp,card);}
    }).catch(function(e){S.busy=false;b.disabled=false;b.textContent="Guardar venta";toast(e.message,true);});
  }

  // ---------------- events ----------------
  function bind(el){
    el.addEventListener("input",function(e){
      var t=e.target;
      if(t.id==="vtQ")return paintProds();
      if(t.id==="vtAbono")S.abTouched=true;
      if(t.id==="vtDisc"||t.id==="vtAbono"||t.id==="vtDate")return total();
      var row=t.closest(".vt-line");if(!row)return;
      var l=S.lines[+row.dataset.i],f=t.dataset.f;if(!l||!f)return;
      if(f==="qty")l.qty=Math.max(1,Math.min(99,parseInt(t.value,10)||1));else if(f==="precio")l.precio=num(t.value);else if(f==="costo")l.costo=num(t.value)||null;else l[f]=t.value;
      if(f==="nombre"&&l.free&&!l.precio){var m=S.cat.find(function(c){return norm(c.nombre)===norm(t.value).trim();});if(m){l.precio=num(m.precio);l.pid=m.id||"";if(m.id&&S.inv[m.id]&&!l.costo){l.costo=S.inv[m.id];l.invCost=S.inv[m.id];}var pin=row.querySelector('[data-f="precio"]');if(pin)pin.value=money(l.precio);}}
      total();
    });
    el.addEventListener("change",function(e){var t=e.target,row=t.closest(".vt-line");
      if(row&&t.dataset.f==="precio")t.value=money(S.lines[+row.dataset.i].precio);
      if(row&&t.dataset.f==="costo"){var lc=S.lines[+row.dataset.i];t.value=lc.costo?money(lc.costo):"";}
      if(t.closest(".vt-ci")&&t.value)t.value=money(num(t.value));
      if(row&&t.dataset.f==="size")S.lines[+row.dataset.i].size=t.value;
      if(t.id==="vtAbono"&&t.value)t.value=money(num(t.value));});
    el.addEventListener("click",function(e){
      var t=e.target,b;
      if((b=t.closest("[data-view]"))){S.view=b.dataset.view;render();if(S.view==="cobrar")loadRecv();else if(S.view==="ganancia")loadProf();else load();return;}
      if((b=t.closest("[data-exc]"))){var on=b.dataset.on==="1";b.disabled=true;
        api("/admin/profit/exclude",{method:"POST",body:{id:b.dataset.exc,excluded:on}}).then(function(){toast(on?"🚫 Esa venta ya no cuenta en la ganancia":"↩ Esa venta vuelve a contar");loadProf();load();}).catch(function(x){b.disabled=false;toast(/Ruta no encontrada|404/.test(x.message)?"Falta pegar la Worker v62 en Cloudflare":x.message,true);});return;}
      if(t.closest("[data-showex]")){S.showEx=!S.showEx;return paintProf();}
      if(t.closest("[data-exnames]")){var nm=((S.el.querySelector("#vpNames")||{}).value||"").split(",").map(function(x){return x.trim();}).filter(Boolean);
        api("/admin/profit/exclude",{method:"POST",body:{names:nm}}).then(function(d){toast("✓ No cuentan: "+(d.names.join(", ")||"nadie"));loadProf();load();}).catch(function(x){toast(/Ruta no encontrada|404/.test(x.message)?"Falta pegar la Worker v62 en Cloudflare":x.message,true);});return;}
      if((b=t.closest("[data-pdays]"))){S.pdays=+b.dataset.pdays;return loadProf();}
      if((b=t.closest("[data-psrc]"))){S.psrc=S.psrc===b.dataset.psrc?"":b.dataset.psrc;return paintProf();}
      if((b=t.closest("[data-cost]"))){var vc=findSale(b.dataset.cost);if(vc)editCost(vc,function(){load();if(S.view==="ganancia")loadProf();});return;}
      if((b=t.closest("[data-days]"))){S.days=+b.dataset.days;el.querySelectorAll("[data-days]").forEach(function(x){x.classList.toggle("on",x===b);});return load();}
      if((b=t.closest("[data-cat]"))){S.catSel=b.dataset.cat;paintCats();return paintProds();}
      if((b=t.closest("[data-add]")))return addProduct(b.dataset.add);
      if((b=t.closest("[data-plan]"))){S.plan=b.dataset.plan;S.payFull=S.plan==="contado";S.abTouched=false;el.querySelectorAll("[data-plan]").forEach(function(x){x.classList.toggle("on",x===b);});var bx=el.querySelector("#vtAbonoBox");if(bx)bx.hidden=S.payFull;var a=el.querySelector("#vtAbono");if(a&&S.plan==="abono"){a.value="";a.focus();}return total();}
      if(t.closest("[data-free]")){S.lines.push({pid:"",nombre:"",categoria:"",precio:0,qty:1,size:"",sizes:[],img:"",free:true});paintLines();var ins=el.querySelectorAll('.vt-line [data-f="nombre"]');if(ins.length)ins[ins.length-1].focus();return;}
      if((b=t.closest("[data-del]"))){S.lines.splice(+b.dataset.del,1);return paintLines();}
      if(t.closest("#vtSave"))return save();
      if((b=t.closest("[data-abonar]"))){var box=b.closest(".vt-abono");return abonar(b.dataset.abonar,num(box.querySelector("[data-amt]").value),box.querySelector("[data-pay]").value);}
      if((b=t.closest("[data-saldar]"))){var row2=b.closest(".r"),sel=row2.querySelector("[data-pay]");if(!confirm("¿Registrar que pagó el saldo completo de "+money(+b.dataset.bal)+"?"))return;return abonar(b.dataset.saldar,+b.dataset.bal,sel?sel.value:"efectivo");}
      if((b=t.closest("[data-edit]")))return startEdit(b.dataset.edit);
      if(t.closest("[data-cancel-edit]")){S.editing=null;S.lines=[];S.payFull=true;S.plan="contado";return render();}
      if((b=t.closest("[data-wa]"))){var v1=findSale(b.dataset.wa);if(v1)shareWa(v1);return;}
      if((b=t.closest("[data-img]"))){var v2=findSale(b.dataset.img);if(v2)shareImage(v2);return;}
      if((b=t.closest("[data-mail]"))){
        var to=(prompt("¿A qué correo enviamos el recibo?",b.dataset.to||"")||"").trim();if(!to)return;
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))return toast("Ese correo no es válido",true);
        b.disabled=true;b.textContent="Enviando…";
        api("/admin/orders/"+b.dataset.mail+"/resend",{method:"POST",body:{email:to}}).then(function(d){toast("📧 Recibo "+d.ticket+" enviado a "+to);b.disabled=false;b.textContent="📧 Recibo";}).catch(function(x){b.disabled=false;b.textContent="📧 Recibo";toast(x.message,true);});return;
      }
      if((b=t.closest("[data-void]"))){
        if(!confirm("¿Anular esta venta? Deja de contar en reportes, las prendas vuelven al inventario y se descuentan los puntos del Club."))return;
        api((/^m[a-z0-9]{11}$/.test(b.dataset.void)?"/admin/sales/manual/"+b.dataset.void+"/void":"/admin/orders/"+b.dataset.void+"/void"),{method:"POST",body:{test:true}}).then(function(){toast("Venta anulada");load();loadRecv();}).catch(function(x){toast(x.message,true);});return;
      }
    });
  }

  function mount(el,o){
    o=o||{};if(o.api)OPT.api=o.api;if(o.token)OPT.token=o.token;
    if(!document.getElementById("vt-css")){var st=document.createElement("style");st.id="vt-css";st.textContent=CSS;document.head.appendChild(st);}
    if(S.el!==el){S.el=el;bind(el);}
    render();
    return Promise.all([loadCat(),load(),loadRecv(),loadInv()].concat(S.view==="ganancia"?[loadProf()]:[]));
  }
  function setup(o){o=o||{};if(o.api)OPT.api=o.api;if(o.token)OPT.token=o.token;}
  window.CanevaVentas={mount:mount,editCost:function(v,done,o){setup(o);if(!Object.keys(S.inv).length)loadInv();editCost(v,done);}};
})();
