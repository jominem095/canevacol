/* CANEVA admin · Proveedores (v1)
   Suppliers crossed with the store data: what each one's garments sold (units, revenue, profit), what is running out
   (with a "Pedir reposición" WhatsApp ready), orders in the workshop assigned to them, purchases and what is still owed.
   Mounted by admin_movil.html: CanevaProveedores.mount(el, {api, token, goTaller}) */
(function(){
  var S={el:null,o:null,d:null,made:[],edit:null,open:{}};
  var KIND_IC={"Taller / confección":"🧵","Telas":"🧶","Mayorista / prendas":"👗","Insumos":"🪡","Transportadora":"🚚","Otro":"🤝"};
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function api(path,opt){opt=opt||{};return fetch(S.o.api+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":S.o.token()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d.length>=11?d:"";}
  function first(n){return String(n||"").trim().split(/\s+/)[0]||"";}
  function fdate(iso){try{return new Date(iso).toLocaleDateString("es-CO",{day:"numeric",month:"short"});}catch(e){return "";}}
  function toast(t){var d=document.createElement("div");d.className="pv-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2600);}
  function initials(n){return String(n||"?").split(/\s+/).slice(0,2).map(function(w){return w.charAt(0).toUpperCase();}).join("");}
  function stars(n){var s="";for(var i=1;i<=5;i++)s+=i<=n?"★":"☆";return s;}

  function css(){if(document.getElementById("pv-css"))return;var s=document.createElement("style");s.id="pv-css";s.textContent=
    ".pv{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".pv-hero{position:relative;overflow:hidden;border-radius:24px;padding:18px;margin:4px 0 12px;background:radial-gradient(500px 240px at 0% 0%,rgba(201,167,255,.2),transparent 60%),radial-gradient(420px 220px at 100% 100%,rgba(142,240,200,.12),transparent 60%),#0c0c0e;border:1px solid rgba(201,167,255,.35)}"+
    ".pv-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px}.pv-hero p{margin:4px 0 12px;font-size:13px;color:rgba(246,247,248,.7)}"+
    ".pv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media(max-width:560px){.pv-kpis{grid-template-columns:repeat(2,1fr)}}.pv-k{border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.045);border:1px solid rgba(246,247,248,.12)}.pv-k b{display:block;font-size:21px}.pv-k span{font-size:11px;color:rgba(246,247,248,.6)}.pv-k.warn b{color:#ffb4a8}.pv-k.hot b{color:#ffe7a8}"+
    ".pv-alert{border-radius:20px;padding:14px;margin:12px 0;background:linear-gradient(135deg,rgba(255,143,128,.1),rgba(255,214,102,.08));border:1px solid rgba(255,143,128,.4)}.pv-alert h3,.pv-box h3{margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,247,248,.7)}"+
    ".pv-low{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.pv-low::-webkit-scrollbar{display:none}.pv-li{flex:0 0 130px;border-radius:14px;background:#0e0e10;border:1px solid rgba(246,247,248,.12);padding:6px;font-size:11.5px}.pv-li img{width:100%;height:120px;object-fit:cover;border-radius:10px;background:#222;display:block;margin-bottom:5px}.pv-li b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pv-li small{color:#ffb4a8}"+
    ".pv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}"+
    ".pv-c{position:relative;border-radius:22px;padding:16px;background:linear-gradient(180deg,#121215,#0b0b0d);border:1px solid rgba(246,247,248,.12);box-shadow:0 12px 34px rgba(0,0,0,.3)}.pv-c.none{border-style:dashed;opacity:.85}"+
    ".pv-h{display:flex;align-items:center;gap:12px}.pv-av{flex:0 0 52px;height:52px;border-radius:16px;display:grid;place-items:center;font-weight:800;font-size:18px;color:#050505;background:linear-gradient(135deg,#e6dcff,#cfe6ff,#8ef0c8)}"+
    ".pv-h b{display:block;font-size:16px}.pv-h small{color:rgba(246,247,248,.6);font-size:12px}.pv-st{color:#ffe7a8;font-size:12px;letter-spacing:1px}"+
    ".pv-x{position:absolute;top:10px;right:10px;display:flex;gap:6px}.pv-x button{width:30px;height:30px;border-radius:50%;border:1px solid rgba(246,247,248,.18);background:rgba(0,0,0,.4);color:rgba(246,247,248,.75);cursor:pointer;font-size:13px}.pv-x button[data-del]:hover{color:#ffb4a8;border-color:rgba(255,120,100,.6)}"+
    ".pv-tags{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.pv-t{font-size:10.5px;border-radius:999px;padding:3px 8px;background:rgba(255,255,255,.07);border:1px solid rgba(246,247,248,.14)}.pv-t.c{background:rgba(201,167,255,.12);border-color:rgba(201,167,255,.4);color:#e6dcff}"+
    ".pv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}.pv-s{border-radius:12px;padding:8px;background:rgba(255,255,255,.035);border:1px solid rgba(246,247,248,.08)}.pv-s b{display:block;font-size:15px}.pv-s span{font-size:10.5px;color:rgba(246,247,248,.55)}.pv-s.good b{color:#8ef0c8}.pv-s.bad b{color:#ffb4a8}.pv-s.hot b{color:#ffe7a8}"+
    ".pv-top{font-size:12px;color:rgba(246,247,248,.75);line-height:1.6;margin:6px 0}.pv-top b{color:#fff}"+
    ".pv-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.pv-act button,.pv-act a{border:0;border-radius:999px;padding:8px 12px;font:700 11.5px Inter,sans-serif;cursor:pointer;background:#f6f7f8;color:#050505;text-decoration:none}.pv-act .wa{background:#25d366!important;color:#04140a!important}.pv-act .gh{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.25)}"+
    ".pv-msgs{display:none;margin-top:10px;gap:6px;flex-direction:column}.pv-msgs.on{display:flex}.pv-msgs a,.pv-msgs a.cvw-a{white-space:normal!important;font-weight:400!important;display:block;border-radius:12px;padding:10px 12px;background:#0b2b20;border:1px solid rgba(37,211,102,.35);color:#d9ffe9!important;text-decoration:none;font-size:12.5px}.pv-msgs a b{color:#fff}"+
    ".pv-pur{margin-top:10px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px}.pv-pur summary{cursor:pointer;font-size:12px;color:rgba(246,247,248,.7);list-style:none}.pv-pur summary::-webkit-details-marker{display:none}"+
    ".pv-pr{display:flex;align-items:center;gap:8px;font-size:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}.pv-pr .m{margin-left:auto;text-align:right}.pv-pr .owe{color:#ffb4a8}.pv-pr button{border:1px solid rgba(246,247,248,.25);background:none;color:#f6f7f8;border-radius:999px;padding:4px 8px;font-size:10.5px;cursor:pointer}"+
    ".pv-box{border-radius:20px;padding:14px;margin:12px 0;background:#0e0e10;border:1px dashed rgba(201,167,255,.45)}"+
    ".pv-f{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pv-f input,.pv-f select,.pv-f textarea{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:9px 10px;font:13.5px Inter,sans-serif}.pv-f .w{grid-column:1/-1}"+
    ".pv-cats{display:flex;flex-wrap:wrap;gap:6px}.pv-cats label{display:flex;align-items:center;gap:5px;font-size:12px;border:1px solid rgba(246,247,248,.18);border-radius:999px;padding:5px 10px;cursor:pointer}.pv-cats input{width:auto}"+
    ".pv-go{border:0;border-radius:999px;padding:12px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#e6dcff,#fff 45%,#cfe6ff);color:#050505;cursor:pointer}"+
    ".pv-note{font-size:11.5px;color:rgba(246,247,248,.55);line-height:1.5;margin-top:6px}.pv-empty{padding:28px 10px;text-align:center;color:rgba(246,247,248,.65)}"+
    ".pv-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#f6f7f8;color:#050505;border-radius:999px;padding:10px 16px;font:600 13px Inter,sans-serif;z-index:99999}"+
    ".pv-ov{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}.pv-dlg{width:min(400px,100%);border-radius:22px;padding:20px;background:#121214;border:1px solid rgba(255,120,100,.45);text-align:center;color:#f6f7f8;font-family:Inter,sans-serif}"+
    ".pv-dlg h3{margin:6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:25px}.pv-dlg p{font-size:13px;line-height:1.5;color:rgba(246,247,248,.75)}.pv-dlg .row{display:flex;gap:8px}.pv-dlg button{flex:1;border:0;border-radius:999px;padding:12px;font:800 13px Inter,sans-serif;cursor:pointer}.pv-dlg .no{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.3)}.pv-dlg .yes{background:#ff6b5e;color:#fff}";
    document.head.appendChild(s);}

  function ask(title,text,ok){return new Promise(function(res){var ov=document.createElement("div");ov.className="pv-ov";
    ov.innerHTML='<div class="pv-dlg"><div style="font-size:38px">🗑</div><h3>'+esc(title)+'</h3><p>'+text+'</p><div class="row"><button type="button" class="no">Cancelar</button><button type="button" class="yes">'+esc(ok||"Sí, borrar")+'</button></div></div>';
    document.body.appendChild(ov);var done=function(v){ov.remove();res(v);};ov.querySelector(".no").onclick=function(){done(false);};ov.querySelector(".yes").onclick=function(){done(true);};ov.onclick=function(e){if(e.target===ov)done(false);};});}

  // ---------- messages to a supplier ----------
  function msgs(sp){
    var st=S.d.stats[sp.id]||{},low=(st.low||[]),made=S.made.filter(function(x){return x.supplier===sp.id&&x.status!=="entregado";});
    var L=[];
    if(low.length)L.push(["🔥 Pedir reposición","Hola "+first(sp.contact||sp.name)+" 👋 Te escribe CΛNEVΛ. Necesito reponer:\n"+low.map(function(p){return "• "+p.nombre+(p.out&&p.out.length?" (agotada en talla "+p.out.join(", ")+")":" (quedan "+p.total+")");}).join("\n")+"\n¿Me confirmas disponibilidad y para cuándo? 🙏"]);
    if(made.length)L.push(["🧵 ¿Cómo van mis pedidos?","Hola "+first(sp.contact||sp.name)+" 🧵 Te escribe CΛNEVΛ. ¿Cómo vamos con estos pedidos?\n"+made.map(function(x){return "• "+(x.items[0]||{}).nombre+(x.items[0]&&x.items[0].size?" · Talla "+x.items[0].size:"")+" para "+first(x.name)+" — entrega "+fdate(x.dueAt);}).join("\n")+"\n¡Gracias! 🖤"]);
    L.push(["🆕 Nuevo pedido","Hola "+first(sp.contact||sp.name)+" ✨ Te escribe CΛNEVΛ. Quiero hacerte un nuevo pedido: ______. ¿Me confirmas precio y tiempo de entrega?"]);
    L.push(["💰 Confirmar pago","Hola "+first(sp.contact||sp.name)+" 💎 Te escribe CΛNEVΛ. Te acabo de hacer un pago de $______. Te envío el comprobante 👇"]);
    L.push(["📦 Catálogo / novedades","Hola "+first(sp.contact||sp.name)+" 👋 ¿Me compartes lo nuevo que tienes"+(sp.categories&&sp.categories.length?" en "+sp.categories.join(", "):"")+"? Fotos y precios por favor 🙏"]);
    return L;
  }

  // ---------- render ----------
  function paint(){
    var d=S.d,sups=d.suppliers||[],st=d.stats||{};
    var owed=sups.reduce(function(a,s){return a+((st[s.id]||{}).owed||0);},0),made=Object.keys(st).reduce(function(a,k){return a+(st[k].made||0);},0),late=Object.keys(st).reduce(function(a,k){return a+(st[k].madeLate||0);},0);
    var lowBySup={};(d.low||[]).forEach(function(p){(lowBySup[p.supplier]=lowBySup[p.supplier]||[]).push(p);});
    var none=st[""]||{};
    S.el.innerHTML='<div class="pv"><div class="pv-hero"><h2>🤝 Proveedores</h2><p>Quién te surte cada prenda, cuánto se vende de lo suyo, qué se está agotando, qué tienen en el taller y cuánto les debes.</p>'+
      '<div class="pv-kpis"><div class="pv-k"><b>'+sups.length+'</b><span>Proveedores</span></div><div class="pv-k'+(late?' warn':'')+'"><b>'+made+(late?' <small style="font-size:12px">· '+late+' atrasados</small>':'')+'</b><span>🧵 En taller</span></div><div class="pv-k hot"><b>'+money(owed)+'</b><span>💰 Por pagar</span></div><div class="pv-k'+((d.low||[]).length?' warn':'')+'"><b>'+(d.low||[]).length+'</b><span>🔥 Por reponer</span></div></div></div>'+
      ((d.low||[]).length?'<div class="pv-alert"><h3>🔥 Se están agotando</h3><div class="pv-low">'+(d.low||[]).slice(0,20).map(function(p){var img=p.imagen?"https://wsrv.nl/?url="+encodeURIComponent(p.imagen)+"&w=260&output=webp":"";return '<div class="pv-li">'+(img?'<img src="'+img+'" alt="" loading="lazy">':'')+'<b>'+esc(p.nombre)+'</b><small>'+(p.out&&p.out.length?'Agotada T'+esc(p.out.join(", ")):'Quedan '+p.total)+'</small><br><small style="color:rgba(246,247,248,.55)">'+esc(supName(p.supplier)||"Sin proveedor")+'</small></div>';}).join("")+'</div>'+
        Object.keys(lowBySup).filter(function(k){return k&&supById(k)&&waNum(supById(k).phone);}).map(function(k){var sp=supById(k);return '<div class="pv-act" style="margin-top:8px"><a class="wa" data-direct="1" target="_blank" rel="noopener" href="https://wa.me/'+waNum(sp.phone)+'?text='+encodeURIComponent(msgs(sp)[0][1])+'">💬 Pedir reposición a '+esc(sp.name)+' ('+lowBySup[k].length+')</a></div>';}).join("")+'</div>':'')+
      '<div class="pv-grid">'+sups.map(cardHtml).join("")+(none.units90||none.made?noneHtml(none):'')+'</div>'+
      (sups.length?'':'<div class="pv-empty">🤝 Agrega tu primer proveedor abajo: el taller, la tela, el mayorista… y asígnale las categorías que te surte. Desde ese momento el admin cruza sus ventas, inventario y pedidos.</div>')+
      formHtml()+purchaseForm()+'</div>';
  }
  function supById(id){var l=(S.d&&S.d.suppliers)||[];for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return null;}
  function supName(id){var s=supById(id);return s?s.name:"";}
  function cardHtml(sp){
    var st=S.d.stats[sp.id]||{},k=waNum(sp.phone),margin=st.costed90?Math.round(st.profit90/st.costed90*100):null;
    var pur=(S.d.purchases||[]).filter(function(p){return p.supplierId===sp.id;});
    return '<div class="pv-c" data-id="'+esc(sp.id)+'"><div class="pv-x"><button type="button" data-edit title="Editar">✏️</button><button type="button" data-del title="Eliminar">✕</button></div>'+
      '<div class="pv-h"><div class="pv-av">'+esc(initials(sp.name))+'</div><div><b>'+esc(sp.name)+'</b><small>'+(KIND_IC[sp.kind]||"🤝")+' '+esc(sp.kind)+(sp.city?' · '+esc(sp.city):'')+'</small>'+(sp.rating?'<div class="pv-st">'+stars(sp.rating)+'</div>':'')+'</div></div>'+
      '<div class="pv-tags">'+(sp.categories||[]).map(function(c){return '<span class="pv-t c">'+esc(c)+'</span>';}).join("")+(sp.leadDays?'<span class="pv-t">⏱ '+sp.leadDays+' días</span>':'')+(sp.terms?'<span class="pv-t">'+esc(sp.terms)+'</span>':'')+(sp.phone?'<span class="pv-t">📱 '+esc(sp.phone)+'</span>':'')+'</div>'+
      '<div class="pv-stats"><div class="pv-s"><b>'+money(st.revenue90||0)+'</b><span>Vendido 90 días</span></div><div class="pv-s"><b>'+(st.units30||0)+'</b><span>Prendas 30 días</span></div>'+
        '<div class="pv-s good"><b>'+(margin!=null?money(st.profit90)+'':'—')+'</b><span>'+(margin!=null?'Ganancia · '+margin+'%':'Ganancia (sin costos)')+'</span></div>'+
        '<div class="pv-s'+(st.madeLate?' bad':'')+'"><b>'+(st.made||0)+'</b><span>🧵 En taller'+(st.madeLate?' · '+st.madeLate+' atras.':'')+'</span></div><div class="pv-s'+((st.low||[]).length?' bad':'')+'"><b>'+(st.low||[]).length+'</b><span>🔥 Por reponer</span></div><div class="pv-s hot"><b>'+money(st.owed||0)+'</b><span>💰 Le debes</span></div></div>'+
      ((st.top||[]).length?'<div class="pv-top">⭐ Lo que más vendes de '+esc(sp.name)+': '+st.top.map(function(t){return '<b>'+esc(t.nombre)+'</b> ('+t.units+')';}).join(", ")+'</div>':'')+
      (sp.notes?'<div class="pv-note">📝 '+esc(sp.notes)+'</div>':'')+
      '<div class="pv-act">'+(k?'<button type="button" class="wa" data-msgs>💬 Contactar</button>':'')+'<button type="button" class="gh" data-buy>🧾 Registrar compra</button>'+(st.made&&S.o.goTaller?'<button type="button" class="gh" data-taller>🧵 Ver en taller</button>':'')+'</div>'+
      (k?'<div class="pv-msgs">'+msgs(sp).map(function(m){return '<a target="_blank" rel="noopener" data-direct="1" href="https://wa.me/'+k+'?text='+encodeURIComponent(m[1])+'"><b>'+esc(m[0])+'</b><br>'+esc(m[1].split("\n").slice(0,2).join(" ")).slice(0,110)+'…</a>';}).join("")+'</div>':'')+
      (pur.length?'<details class="pv-pur"'+(S.open[sp.id]?' open':'')+'><summary>🧾 Compras ('+pur.length+') · por pagar <b style="color:#ffb4a8">'+money(st.owed||0)+'</b></summary>'+pur.slice(0,12).map(function(p){return '<div class="pv-pr" data-pid="'+esc(p.id)+'"><div>'+esc(p.desc)+'<br><small style="color:rgba(246,247,248,.5)">'+esc(fdate(p.at))+(p.dueAt?' · vence '+esc(fdate(p.dueAt)):'')+'</small></div><div class="m">'+money(p.total)+'<br>'+(p.balance>0?'<span class="owe">debes '+money(p.balance)+'</span>':'<span style="color:#8ef0c8">✓ pagada</span>')+'</div>'+(p.balance>0?'<button type="button" data-pay>Abonar</button>':'')+'<button type="button" data-delp title="Borrar compra">✕</button></div>';}).join("")+'</details>':'')+
    '</div>';
  }
  function noneHtml(st){return '<div class="pv-c none"><div class="pv-h"><div class="pv-av" style="background:#333;color:#fff">?</div><div><b>Sin proveedor asignado</b><small>Ventas de categorías que ningún proveedor tiene</small></div></div>'+
    '<div class="pv-stats"><div class="pv-s"><b>'+money(st.revenue90||0)+'</b><span>Vendido 90 días</span></div><div class="pv-s"><b>'+(st.units30||0)+'</b><span>Prendas 30 días</span></div><div class="pv-s"><b>'+(st.made||0)+'</b><span>🧵 En taller</span></div></div>'+
    ((st.top||[]).length?'<div class="pv-top">Por ejemplo: '+st.top.map(function(t){return '<b>'+esc(t.nombre)+'</b>';}).join(", ")+'. Edita un proveedor y márcale esas categorías para cruzar sus datos.</div>':'')+'</div>';}
  function formHtml(){
    var e=S.edit||{},cats=(S.d.categories||[]).slice();["Deportivo","Atelier"].forEach(function(c){if(cats.indexOf(c)<0)cats.push(c);});
    return '<div class="pv-box" id="pvForm"><h3>'+(e.id?'✏️ Editar proveedor':'➕ Nuevo proveedor')+'</h3><div class="pv-f">'+
      '<input id="pvN" placeholder="Nombre del proveedor *" value="'+esc(e.name||"")+'"><select id="pvK">'+(S.d.kinds||[]).map(function(k){return '<option'+(k===e.kind?' selected':'')+'>'+esc(k)+'</option>';}).join("")+'</select>'+
      '<input id="pvC" placeholder="Persona de contacto" value="'+esc(e.contact||"")+'"><input id="pvP" type="tel" inputmode="tel" placeholder="Celular (WhatsApp)" value="'+esc(e.phone||"")+'">'+
      '<input id="pvCi" placeholder="Ciudad" value="'+esc(e.city||"")+'"><input id="pvL" type="number" inputmode="numeric" placeholder="Días de entrega" value="'+esc(e.leadDays||"")+'">'+
      '<input id="pvT" class="w" placeholder="Condiciones (ej: 50% anticipo, saldo contra entrega)" value="'+esc(e.terms||"")+'">'+
      '<div class="w"><div class="pv-note" style="margin:0 0 6px">¿Qué categorías te surte? (así el admin cruza sus ventas, inventario y taller)</div><div class="pv-cats">'+cats.map(function(c){return '<label><input type="checkbox" value="'+esc(c)+'"'+((e.categories||[]).indexOf(c)>=0?' checked':'')+'>'+esc(c)+'</label>';}).join("")+'</div></div>'+
      '<select id="pvR"><option value="0">Calificación</option>'+[5,4,3,2,1].map(function(n){return '<option value="'+n+'"'+(n===e.rating?' selected':'')+'>'+stars(n)+'</option>';}).join("")+'</select><span></span>'+
      '<textarea id="pvO" class="w" placeholder="Notas (calidad, horarios, cuenta para pagos…)">'+esc(e.notes||"")+'</textarea>'+
      '<button type="button" class="pv-go w" id="pvSave">'+(e.id?'Guardar cambios':'Agregar proveedor')+'</button>'+(e.id?'<button type="button" class="w" id="pvCancel" style="border:1px solid rgba(246,247,248,.25);background:none;color:#f6f7f8;border-radius:999px;padding:10px;cursor:pointer">Cancelar edición</button>':'')+'</div></div>';
  }
  function purchaseForm(){var sups=S.d.suppliers||[];if(!sups.length)return "";
    return '<div class="pv-box" id="pvBuy"><h3>🧾 Registrar compra a proveedor</h3><div class="pv-f"><select id="buS" class="w">'+sups.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>';}).join("")+'</select>'+
      '<input id="buD" class="w" placeholder="¿Qué compraste? (ej: 20 sets deportivos, confección 3 vestidos)"><input id="buT" type="number" inputmode="numeric" placeholder="Valor total"><input id="buP" type="number" inputmode="numeric" placeholder="Pagado hoy">'+
      '<input id="buV" type="date" class="w" title="Fecha límite de pago"><button type="button" class="pv-go w" id="buGo">Guardar compra</button></div><div class="pv-note">Lo que quede sin pagar aparece en "💰 Le debes" de ese proveedor, con botón para abonar.</div></div>';}

  // ---------- events ----------
  function save(body,msg){return api("/admin/suppliers",{method:"POST",body:body}).then(function(){if(msg)toast(msg);return load();}).catch(function(e){toast("⚠️ "+e.message);});}
  function bindOnce(){
    var el=S.el;
    el.addEventListener("click",function(e){
      var b=e.target.closest("button");if(!b||!el.contains(b))return;
      if(b.id==="pvSave"){var g=function(id){return el.querySelector(id).value.trim();},cats=[].slice.call(el.querySelectorAll(".pv-cats input:checked")).map(function(i){return i.value;});
        var sup={id:(S.edit||{}).id,name:g("#pvN"),kind:g("#pvK"),contact:g("#pvC"),phone:g("#pvP"),city:g("#pvCi"),leadDays:g("#pvL"),terms:g("#pvT"),rating:g("#pvR"),notes:g("#pvO"),categories:cats};
        if(!sup.name){toast("Escribe el nombre del proveedor");return;}
        S.edit=null;save({action:"save",supplier:sup},"🤝 Proveedor guardado");return;}
      if(b.id==="pvCancel"){S.edit=null;paint();return;}
      if(b.id==="buGo"){var g2=function(id){return el.querySelector(id).value.trim();};save({action:"purchase",purchase:{supplierId:g2("#buS"),desc:g2("#buD"),total:g2("#buT"),paid:g2("#buP"),dueAt:g2("#buV")}},"🧾 Compra registrada");return;}
      var c=b.closest(".pv-c");if(!c)return;var sp=supById(c.dataset.id);
      if(b.hasAttribute("data-msgs")){c.querySelector(".pv-msgs").classList.toggle("on");return;}
      if(b.hasAttribute("data-edit")&&sp){S.edit=sp;paint();el.querySelector("#pvForm").scrollIntoView({behavior:"smooth",block:"center"});return;}
      if(b.hasAttribute("data-del")&&sp){ask("¿Seguro que deseas borrar?","Vas a borrar a <b>"+esc(sp.name)+"</b>. Sus compras registradas quedan guardadas, pero ya no se cruzarán sus ventas ni su taller.","Sí, borrar proveedor").then(function(ok){if(ok)save({action:"delete",id:sp.id},"🗑 Proveedor borrado");});return;}
      if(b.hasAttribute("data-buy")&&sp){var f=el.querySelector("#buS");if(f){f.value=sp.id;el.querySelector("#pvBuy").scrollIntoView({behavior:"smooth",block:"center"});el.querySelector("#buD").focus();}return;}
      if(b.hasAttribute("data-taller")&&S.o.goTaller){S.o.goTaller();return;}
      var row=b.closest(".pv-pr");if(row&&sp){S.open[sp.id]=1;
        if(b.hasAttribute("data-pay")){var v=prompt("¿Cuánto le abonaste a "+sp.name+"?","");if(v)save({action:"pay",id:row.dataset.pid,amount:String(v).replace(/[^\d]/g,"")},"💰 Abono registrado");return;}
        if(b.hasAttribute("data-delp")){ask("¿Seguro que deseas borrar?","Vas a borrar esta compra y sus abonos.","Sí, borrar compra").then(function(ok){if(ok)save({action:"delPurchase",id:row.dataset.pid},"🗑 Compra borrada");});return;}}
    });
  }
  function load(){if(!S.el)return Promise.resolve();if(!S.d)S.el.innerHTML='<div class="pv-empty">🤝 Cargando proveedores…</div>';
    return Promise.all([api("/admin/suppliers"),api("/admin/made").catch(function(){return {list:[]};})]).then(function(r){S.d=r[0];S.made=r[1].list||[];paint();})
      .catch(function(e){S.el.innerHTML='<div class="pv-empty">⚠️ '+esc(e.message)+'<br><br>Si dice que falta actualizar, pega el Worker v84 en Cloudflare.</div>';});}
  window.CanevaProveedores={mount:function(el,o){S.el=el;S.o=o;css();bindOnce();load();},reload:load};
})();
