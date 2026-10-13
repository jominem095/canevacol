/* CANEVA Admin — Ventas manuales + Cuentas por cobrar.
   Records sales that did not go through the website (store counter, WhatsApp, Instagram, fairs) so they count in
   Reportes, the month goal, Club points and inventory. Sales can be paid in full or with an abono: what she still
   owes goes to "Cuentas por cobrar", where later abonos are registered until it is paid.
   Shared by admin.html and admin_movil.html. Usage: CanevaVentas.mount(element, { api, token: () => "..." })
   Needs Worker v58 (/admin/sales/manual, /admin/sales/receivables). */
(function(){
  "use strict";
  var OPT={api:"https://caneva-ai.canevacol.workers.dev",token:function(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}};
  var S={el:null,cat:[],cats:[],catSel:"",data:null,recv:null,days:1,view:"vender",lines:[],busy:false,payFull:true};
  var CH={tienda:"Tienda física",whatsapp:"WhatsApp",instagram:"Instagram",feria:"Feria / evento",otro:"Otro"};
  var PAY={efectivo:"Efectivo",transferencia:"Transferencia",nequi:"Nequi",daviplata:"Daviplata",datafono:"Datáfono",bold:"Link Bold",otro:"Otro"};
  var DOC={cc:"Cédula",pa:"Pasaporte",ti:"Tarjeta de identidad",otro:"Otro"};

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
  '@media(max-width:560px){.vt h2{font-size:1.6rem}.vt-row{grid-template-columns:1fr}.vt-row .r{text-align:left}.vt-abono{justify-content:flex-start}}';

  // ---------------- layout ----------------
  function render(){
    var el=S.el;if(!el)return;
    var R=S.recv&&S.recv.totals;
    el.innerHTML='<div class="vt"><div class="vt-head"><div><div class="dim">Ventas que no pasan por la página</div><h2>💵 Ventas manuales</h2></div>'+
      (S.view==="vender"?'<div class="vt-seg">'+[[1,"Hoy"],[7,"7 días"],[30,"30 días"]].map(function(x){return '<button type="button" data-days="'+x[0]+'" class="'+(x[0]===S.days?"on":"")+'">'+x[1]+'</button>';}).join("")+'</div>':'')+'</div>'+
      '<div class="vt-tabs"><button type="button" data-view="vender" class="'+(S.view==="vender"?"on":"")+'">Registrar venta</button><button type="button" data-view="cobrar" class="'+(S.view==="cobrar"?"on":"")+'">Cuentas por cobrar'+(R&&R.count?'<b>'+R.count+'</b>':'')+'</button></div>'+
      (S.view==="vender"?sellHtml():recvHtml())+'</div>';
    if(S.view==="vender"){paintCats();paintProds();paintLines();paintData();}else paintRecv();
  }

  function sellHtml(){
    return '<div class="vt-kpis" id="vtKpis"></div>'+
      '<div class="vt-card"><h3>Registrar una venta</h3>'+
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
        '<div class="vt-pay" style="margin-top:12px"><button type="button" data-full="1" class="'+(S.payFull?"on":"")+'">✓ Pagó todo</button><button type="button" data-full="0" class="'+(S.payFull?"":"on")+'">Dejó un abono (queda debiendo)</button></div>'+
        '<div id="vtAbonoBox" '+(S.payFull?'hidden':'')+' style="margin-top:10px"><div class="vt-grid"><div><label>¿Cuánto abonó hoy?</label><input id="vtAbono" inputmode="numeric" placeholder="$0"></div></div><div class="vt-owe" id="vtOwe"></div></div>'+
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
        '<div class="vt-total"><div><div class="dim">Total de la venta</div><b id="vtTotal">$0</b></div><button type="button" class="vt-btn" id="vtSave">Guardar venta</button></div>'+
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
    S.lines.push({pid:p.id||"",nombre:p.nombre,categoria:p.categoria||"",precio:num(p.precio),qty:1,size:sizes[0]||"",sizes:sizes,img:p.imagen||""});
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
        '<input class="p" data-f="precio" inputmode="numeric" value="'+esc(money(l.precio))+'" title="Precio unitario"></div></div>'+
        '<button type="button" class="vt-x" data-del="'+i+'" aria-label="Quitar">×</button></div>';}).join(""):'<div class="vt-empty">Toca una prenda arriba para agregarla.</div>';
    total();
  }
  function totals(){
    var sub=S.lines.reduce(function(s,l){return s+(l.precio||0)*(l.qty||1);},0),disc=Math.min(sub,num((S.el.querySelector("#vtDisc")||{}).value));
    var t=Math.max(0,sub-disc),ab=S.payFull?t:Math.min(t,num((S.el.querySelector("#vtAbono")||{}).value));
    return {sub:sub,disc:disc,total:t,paid:ab,owe:t-ab};
  }
  function total(){
    var T=totals(),el=S.el.querySelector("#vtTotal"),ow=S.el.querySelector("#vtOwe");
    if(el)el.textContent=money(T.total)+(T.disc?"  (desc. "+money(T.disc)+")":"");
    if(ow)ow.textContent=S.payFull?"":(T.total?"Abona "+money(T.paid)+" · queda debiendo "+money(T.owe):"");
  }

  // ---------------- sales list ----------------
  function paintData(){
    var D=S.data,k=S.el&&S.el.querySelector("#vtKpis"),list=S.el&&S.el.querySelector("#vtList");if(!k||!list)return;
    if(!D){k.innerHTML="";return;}
    var T=D.totals;
    k.innerHTML='<div class="vt-kpi"><span>Vendido '+(S.days===1?"hoy":"en "+S.days+" días")+'</span><b>'+money(T.revenue)+'</b></div><div class="vt-kpi"><span>Recibido</span><b>'+money(T.collected!=null?T.collected:T.revenue)+'</b></div>'+
      (T.owed?'<div class="vt-kpi warn"><span>Quedó por cobrar</span><b>'+money(T.owed)+'</b></div>':'')+'<div class="vt-kpi"><span>Ventas</span><b>'+T.count+'</b></div>';
    list.innerHTML=D.list.length?D.list.map(rowHtml).join(""):'<div class="vt-empty">No hay ventas manuales en este periodo.</div>';
  }
  function rowHtml(v){
    var it=v.items.map(function(x){return esc(x.nombre)+(x.size?" ("+esc(x.size)+")":"")+(x.qty>1?" ×"+x.qty:"");}).join(" · ");
    var live=v.status==="pagado";
    return '<div class="vt-row'+(live?"":" void")+'"><div><div class="t">'+esc(v.ticket)+' · '+esc(when(v.paidAt))+(v.name?' · '+esc(v.name):'')+'</div><div class="it">'+it+'</div>'+
      '<span class="tag">'+esc(v.channelLabel||"")+'</span><span class="tag">'+esc(v.payLabel||"")+'</span>'+
      (live&&v.balance>0?'<span class="tag owe">Debe '+money(v.balance)+'</span>':'')+(live&&v.payments&&v.payments.length>1&&!v.balance?'<span class="tag ok">Pagada con abonos</span>':'')+
      (v.doc?'<span class="tag">'+esc(v.docLabel||"Doc")+' '+esc(v.doc)+'</span>':'')+(v.points?'<span class="tag">+'+v.points+' pts Club</span>':'')+(v.note?'<span class="tag">'+esc(v.note)+'</span>':'')+(live?'':'<span class="tag">Anulada</span>')+'</div>'+
      '<div class="r"><b>'+money(v.total)+'</b>'+(live?shareBtns(v.id)+' <button type="button" class="vt-mail" data-mail="'+esc(v.id)+'" data-to="'+esc(v.email||"")+'">📧 Correo</button><br><button type="button" class="vt-void" data-void="'+esc(v.id)+'">Anular</button>':'')+'</div></div>';
  }

  // ---------------- cuentas por cobrar ----------------
  function paintRecv(){
    var D=S.recv,k=S.el.querySelector("#vrKpis"),list=S.el.querySelector("#vrList");if(!k||!list)return;
    if(!D){list.innerHTML='<div class="vt-empty">Cargando…</div>';return;}
    var T=D.totals;
    k.innerHTML='<div class="vt-kpi warn"><span>Total por cobrar</span><b>'+money(T.owed)+'</b></div><div class="vt-kpi"><span>Clientas que deben</span><b>'+T.count+'</b></div><div class="vt-kpi"><span>Ya abonado</span><b>'+money(T.collected)+'</b></div>';
    list.innerHTML=D.list.length?D.list.map(function(v){
      var it=v.items.map(function(x){return esc(x.nombre)+(x.size?" ("+esc(x.size)+")":"");}).join(" · ");
      var hist=(v.payments||[]).map(function(p){return when(p.at,false)+": "+money(p.amount)+" "+esc(PAY[p.pay]||p.pay||"");}).join(" · ");
      var d=daysAgo(v.paidAt),wa=v.phone?'https://wa.me/57'+String(v.phone).replace(/^57/,"")+'?text='+encodeURIComponent("Hola "+(v.name||"")+" 🖤 te escribimos de CANEVA. Te recordamos el saldo pendiente de tu compra "+v.ticket+": "+money(v.balance)+". ¡Gracias!"):"";
      return '<div class="vt-row"><div><div class="t">'+esc(v.name||"Sin nombre")+(v.phone?' · '+esc(v.phone):'')+'</div>'+
        '<div class="it">'+esc(v.ticket)+' · '+esc(when(v.paidAt,false))+' · hace '+d+' día'+(d===1?'':'s')+' · '+it+'</div>'+
        (v.doc?'<span class="tag">'+esc(v.docLabel||"Doc")+' '+esc(v.doc)+'</span>':'')+(v.address?'<span class="tag">📍 '+esc(v.address)+'</span>':'')+
        '<div class="vt-hist">Total '+money(v.total)+' · abonado '+money(v.paid)+(hist?' ('+hist+')':'')+'</div></div>'+
        '<div class="r"><b style="color:#ffb4a8">Debe '+money(v.balance)+'</b>'+
          '<div class="vt-abono" data-id="'+esc(v.id)+'"><input inputmode="numeric" placeholder="Abono $" data-amt><select data-pay>'+opts(PAY,"efectivo")+'</select><button type="button" class="vt-btn sm" data-abonar="'+esc(v.id)+'">Registrar abono</button></div>'+
          '<div class="vt-abono"><button type="button" class="vt-btn ghost sm" data-saldar="'+esc(v.id)+'" data-bal="'+v.balance+'">Pagó todo ('+money(v.balance)+')</button>'+(wa?'<a class="vt-btn ghost sm" style="text-decoration:none" target="_blank" rel="noopener" href="'+wa+'">💬 Recordar</a>':'')+'</div><div class="vt-abono">'+shareBtns(v.id)+'</div></div></div>';
    }).join(""):'<div class="vt-empty">Nadie debe nada 🎉</div>';
  }

  // ---------------- receipt to WhatsApp (text) and as an image to share ----------------
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d.length>=11?d:"";}
  function receiptText(v){
    var L=["🖤 *CΛNEVΛ* · Recibo "+v.ticket,when(v.paidAt)+(v.channelLabel?" · "+v.channelLabel:""),""];
    (v.items||[]).forEach(function(x){L.push("• "+x.nombre+(x.size?" ("+x.size+")":"")+((x.qty||1)>1?" ×"+x.qty:"")+" — "+(x.precio||""));});
    L.push("");
    if(v.discount)L.push("Descuento: -"+money(v.discount));
    L.push("*Total: "+money(v.total)+"*");
    var pays=(v.payments||[]);
    if(pays.length>1||v.balance>0){pays.forEach(function(p){L.push("Abono "+when(p.at,false)+": "+money(p.amount)+(p.pay?" ("+(PAY[p.pay]||p.pay)+")":""));});}
    else if(v.payLabel)L.push("Pago: "+v.payLabel);
    L.push(v.balance>0?"*Saldo pendiente: "+money(v.balance)+"*":"✅ Pagado");
    L.push("","Gracias por tu compra"+(v.name?", "+String(v.name).split(" ")[0]:"")+" 🖤","canevacol.com · IG @caneva.col");
    return L.join("\n");
  }
  function shareWa(v){
    var n=waNum(v.phone),url="https://wa.me/"+(n||"")+"?text="+encodeURIComponent(receiptText(v));
    window.open(url,"_blank","noopener");
  }
  function receiptImage(v){
    var W=1080,items=v.items||[],H=760+items.length*78+((v.payments||[]).length>1||v.balance>0?(v.payments||[]).length*52:0);
    var c=document.createElement("canvas");c.width=W;c.height=H;var x=c.getContext("2d");
    x.fillStyle="#070604";x.fillRect(0,0,W,H);x.strokeStyle="rgba(201,169,110,.55)";x.lineWidth=3;x.strokeRect(36,36,W-72,H-72);
    x.textAlign="center";x.fillStyle="#e6cf9f";x.font="500 76px Georgia,serif";x.fillText("CΛNEVΛ",W/2,170);
    x.fillStyle="rgba(247,247,244,.7)";x.font="28px Arial,sans-serif";x.fillText("RECIBO "+v.ticket+"  ·  "+when(v.paidAt),W/2,228);
    var y=320;x.textAlign="left";
    items.forEach(function(it){x.fillStyle="#f7f7f4";x.font="34px Arial,sans-serif";var t=it.nombre+(it.size?" ("+it.size+")":"")+((it.qty||1)>1?" ×"+it.qty:"");if(t.length>34)t=t.slice(0,33)+"…";x.fillText(t,90,y);x.textAlign="right";x.fillText(it.precio||"",W-90,y);x.textAlign="left";y+=78;});
    x.strokeStyle="rgba(247,247,244,.2)";x.lineWidth=2;x.beginPath();x.moveTo(90,y-30);x.lineTo(W-90,y-30);x.stroke();y+=30;
    function row(a,b,big,col){x.fillStyle=col||"#f7f7f4";x.font=(big?"bold 46px":"32px")+" Arial,sans-serif";x.textAlign="left";x.fillText(a,90,y);x.textAlign="right";x.fillText(b,W-90,y);y+=big?70:52;}
    if(v.discount)row("Descuento","-"+money(v.discount));
    row("Total",money(v.total),true);
    var pays=v.payments||[];
    if(pays.length>1||v.balance>0)pays.forEach(function(p){row("Abono "+when(p.at,false),money(p.amount),false,"rgba(247,247,244,.75)");});
    if(v.balance>0)row("Saldo pendiente",money(v.balance),true,"#ffb4a8");else row("Estado","Pagado ✓",false,"#9de08f");
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
  function findSale(id){var all=[].concat((S.data&&S.data.list)||[],(S.recv&&S.recv.list)||[],S.last?[S.last]:[]);return all.find(function(x){return x.id===id;});}
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
    if(!S.payFull&&T.owe>0&&!g("#vtName").trim()&&!g("#vtPhone").trim())return toast("Para dejar saldo pendiente escribe el nombre o el celular de la clienta",true);
    var body={items:lines.map(function(l){return {pid:l.pid,nombre:l.nombre,categoria:l.categoria,precio:l.precio,qty:l.qty,size:l.size==="Única"?"":l.size,imagen:l.img};}),
      channel:g("#vtCh"),pay:g("#vtPay"),date:g("#vtDate"),discount:T.disc,paidNow:S.payFull?null:T.paid,
      name:g("#vtName"),phone:g("#vtPhone"),docType:g("#vtDocT"),doc:g("#vtDoc"),address:g("#vtAddr"),email:g("#vtMail").trim(),note:g("#vtNote"),noStock:!S.el.querySelector("#vtStock").checked};
    S.busy=true;var b=S.el.querySelector("#vtSave");b.disabled=true;b.textContent="Guardando…";
    api("/admin/sales/manual",{method:"POST",body:body}).then(function(d){
      S.busy=false;S.lines=[];S.payFull=true;
      S.last={id:d.id,ticket:d.ticket,total:d.total,paidAt:new Date().toISOString(),items:body.items.map(function(x){return {nombre:x.nombre,size:x.size,qty:x.qty,precio:money(x.precio)};}),
        discount:body.discount,balance:d.balance||0,payments:(d.paid?[{at:new Date().toISOString(),amount:d.paid,pay:body.pay}]:[]),payLabel:PAY[body.pay]||"",channelLabel:CH[body.channel]||"",name:body.name,phone:body.phone};
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
      if(t.id==="vtDisc"||t.id==="vtAbono")return total();
      var row=t.closest(".vt-line");if(!row)return;
      var l=S.lines[+row.dataset.i],f=t.dataset.f;if(!l||!f)return;
      if(f==="qty")l.qty=Math.max(1,Math.min(99,parseInt(t.value,10)||1));else if(f==="precio")l.precio=num(t.value);else l[f]=t.value;
      total();
    });
    el.addEventListener("change",function(e){var t=e.target,row=t.closest(".vt-line");
      if(row&&t.dataset.f==="precio")t.value=money(S.lines[+row.dataset.i].precio);
      if(row&&t.dataset.f==="size")S.lines[+row.dataset.i].size=t.value;
      if(t.id==="vtAbono"&&t.value)t.value=money(num(t.value));});
    el.addEventListener("click",function(e){
      var t=e.target,b;
      if((b=t.closest("[data-view]"))){S.view=b.dataset.view;render();if(S.view==="cobrar")loadRecv();else load();return;}
      if((b=t.closest("[data-days]"))){S.days=+b.dataset.days;el.querySelectorAll("[data-days]").forEach(function(x){x.classList.toggle("on",x===b);});return load();}
      if((b=t.closest("[data-cat]"))){S.catSel=b.dataset.cat;paintCats();return paintProds();}
      if((b=t.closest("[data-add]")))return addProduct(b.dataset.add);
      if((b=t.closest("[data-full]"))){S.payFull=b.dataset.full==="1";el.querySelectorAll("[data-full]").forEach(function(x){x.classList.toggle("on",x===b);});var bx=el.querySelector("#vtAbonoBox");if(bx)bx.hidden=S.payFull;if(!S.payFull){var a=el.querySelector("#vtAbono");if(a)a.focus();}return total();}
      if(t.closest("[data-free]")){S.lines.push({pid:"",nombre:"",categoria:"",precio:0,qty:1,size:"",sizes:[],img:"",free:true});paintLines();var ins=el.querySelectorAll('.vt-line [data-f="nombre"]');if(ins.length)ins[ins.length-1].focus();return;}
      if((b=t.closest("[data-del]"))){S.lines.splice(+b.dataset.del,1);return paintLines();}
      if(t.closest("#vtSave"))return save();
      if((b=t.closest("[data-abonar]"))){var box=b.closest(".vt-abono");return abonar(b.dataset.abonar,num(box.querySelector("[data-amt]").value),box.querySelector("[data-pay]").value);}
      if((b=t.closest("[data-saldar]"))){var row2=b.closest(".r"),sel=row2.querySelector("[data-pay]");if(!confirm("¿Registrar que pagó el saldo completo de "+money(+b.dataset.bal)+"?"))return;return abonar(b.dataset.saldar,+b.dataset.bal,sel?sel.value:"efectivo");}
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
        api("/admin/sales/manual/"+b.dataset.void+"/void",{method:"POST",body:{}}).then(function(){toast("Venta anulada");load();loadRecv();}).catch(function(x){toast(x.message,true);});return;
      }
    });
  }

  function mount(el,o){
    o=o||{};if(o.api)OPT.api=o.api;if(o.token)OPT.token=o.token;
    if(!document.getElementById("vt-css")){var st=document.createElement("style");st.id="vt-css";st.textContent=CSS;document.head.appendChild(st);}
    if(S.el!==el){S.el=el;bind(el);}
    render();
    return Promise.all([loadCat(),load(),loadRecv()]);
  }
  window.CanevaVentas={mount:mount};
})();
