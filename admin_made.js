/* CANEVA admin · Bajo pedido (v1)
   Board of made-to-order garments (Deportivo, Atelier and every category with more than 1 day of delivery):
   production status, delivery date, measures and notes, abonos and balance, and a WhatsApp notice when it is ready.
   Money stays where the sale lives (manual sales, layaways, web orders), so the general sales report is never off.
   Mounted by admin_movil.html: CanevaMade.mount(el, {api, token, goVentas}) */
(function(){
  var S={el:null,o:null,list:[],f:"activos",kind:"Todas",q:""};
  var ST={pedido:["📝","Pedido"],confeccion:["🧵","En confección"],listo:["✨","Lista"],entregado:["✅","Entregada"]};
  var SRC={web:["🌐","Página web"],manual:["💵","Venta manual"],apartado:["⏳","Apartado"],nota:["📝","Anotado aquí"]};
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function api(path,opt){opt=opt||{};return fetch(S.o.api+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":S.o.token()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function first(n){var f=String(n||"").trim().split(/\s+/)[0]||"";return f?f.charAt(0).toUpperCase()+f.slice(1).toLowerCase():"";}
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d.length>=11?d:"";}
  function daysTo(iso){return Math.ceil((Date.parse(iso)-Date.now())/864e5);}
  function fdate(iso){try{return new Date(iso).toLocaleDateString("es-CO",{day:"numeric",month:"short"});}catch(e){return "";}}
  function toast(t){var d=document.createElement("div");d.className="mk-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2600);}

  function css(){if(document.getElementById("mk-css"))return;var s=document.createElement("style");s.id="mk-css";s.textContent=
    ".mk{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".mk-hero{border-radius:22px;padding:18px;margin:4px 0 12px;background:radial-gradient(500px 220px at 10% 0%,rgba(255,214,102,.14),transparent 60%),radial-gradient(400px 200px at 100% 100%,rgba(201,167,255,.14),transparent 60%),#0c0c0e;border:1px solid rgba(255,214,102,.28)}"+
    ".mk-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:28px}.mk-hero p{margin:4px 0 12px;font-size:13px;color:rgba(246,247,248,.7)}"+
    ".mk-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media(max-width:560px){.mk-kpis{grid-template-columns:repeat(2,1fr)}}"+
    ".mk-k{border-radius:14px;padding:10px;background:rgba(255,255,255,.04);border:1px solid rgba(246,247,248,.12)}.mk-k b{display:block;font-size:20px}.mk-k span{font-size:11px;color:rgba(246,247,248,.6)}.mk-k.warn{border-color:rgba(255,120,100,.5)}.mk-k.warn b{color:#ffb4a8}"+
    ".mk-bar{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}.mk-bar::-webkit-scrollbar{display:none}.mk-bar button{flex:0 0 auto;border:1px solid rgba(246,247,248,.18);background:#121214;color:#f6f7f8;border-radius:999px;padding:8px 12px;font:600 12px Inter,sans-serif;cursor:pointer}.mk-bar button.on{background:#f6f7f8;color:#050505}"+
    ".mk-q{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:10px 12px;font:14px Inter,sans-serif;margin:4px 0 10px}"+
    ".mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:10px}"+
    ".mk-c{border-radius:18px;padding:14px;background:#0e0e10;border:1px solid rgba(246,247,248,.12)}.mk-c.late{border-color:rgba(255,120,100,.55)}.mk-c.listo{border-color:rgba(142,240,200,.55)}.mk-c.done{opacity:.7}"+
    ".mk-h{display:flex;align-items:flex-start;gap:8px}.mk-h b{font-size:15px}.mk-h .r{margin-left:auto;text-align:right;font-size:11px;color:rgba(246,247,248,.55)}"+
    ".mk-tags{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.mk-t{font-size:10.5px;border-radius:999px;padding:3px 8px;background:rgba(255,255,255,.07);border:1px solid rgba(246,247,248,.14)}.mk-t.k{background:rgba(255,214,102,.12);border-color:rgba(255,214,102,.4);color:#ffe7a8}.mk-t.bad{background:rgba(255,120,100,.12);border-color:rgba(255,120,100,.5);color:#ffb4a8}"+
    ".mk-it{font-size:13px;line-height:1.5;margin:4px 0}.mk-it small{color:rgba(246,247,248,.55)}"+
    ".mk-money{margin:8px 0}.mk-prog{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.mk-prog i{display:block;height:100%;background:linear-gradient(90deg,#8ef0c8,#cfe6ff)}"+
    ".mk-mrow{display:flex;justify-content:space-between;font-size:12px;margin-top:5px;color:rgba(246,247,248,.7)}.mk-mrow b{color:#fff}.mk-mrow .owe{color:#ffb4a8}"+
    ".mk-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0}.mk-steps button{border:1px solid rgba(246,247,248,.15);background:#121214;color:rgba(246,247,248,.7);border-radius:10px;padding:7px 2px;font:600 10.5px Inter,sans-serif;cursor:pointer}"+
    ".mk-steps button.on{background:#f6f7f8;color:#050505;border-color:#f6f7f8}.mk-steps button.past{color:#8ef0c8;border-color:rgba(142,240,200,.35)}"+
    ".mk-due{display:flex;align-items:center;gap:8px;font-size:12px;margin:6px 0}.mk-due input{background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:8px;color:#fff;padding:5px 7px;font:12px Inter,sans-serif}"+
    ".mk-c textarea{width:100%;box-sizing:border-box;min-height:52px;background:#050505;border:1px solid rgba(246,247,248,.16);border-radius:10px;color:#fff;padding:8px 10px;font:13px/1.4 Inter,sans-serif;resize:vertical;margin-top:6px}"+
    ".mk-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.mk-act button,.mk-act a{border:0;border-radius:999px;padding:8px 12px;font:700 11.5px Inter,sans-serif;cursor:pointer;background:#f6f7f8;color:#050505;text-decoration:none}"+
    ".mk-act .wa,.mk-act a.wa.cvw-a{background:#25d366!important;color:#04140a!important}.mk-act a.wa .cvw-ic svg path:first-child{fill:#04140a}.mk-act .gh{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.25)}"+
    ".mk-pay{display:none;gap:6px;margin-top:8px}.mk-pay.on{display:flex}.mk-pay input,.mk-pay select{flex:1;min-width:0;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:8px;font:13px Inter,sans-serif}"+
    ".mk-new{border-radius:18px;padding:14px;margin:12px 0;background:#0e0e10;border:1px dashed rgba(255,214,102,.4)}.mk-new h3{margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,247,248,.6)}"+
    ".mk-f{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mk-f input,.mk-f select,.mk-f textarea{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:9px 10px;font:13.5px Inter,sans-serif}.mk-f .w{grid-column:1/-1}"+
    ".mk-note{font-size:11.5px;color:rgba(246,247,248,.55);line-height:1.5;margin-top:6px}.mk-empty{padding:30px 10px;text-align:center;color:rgba(246,247,248,.6)}"+
    ".mk-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#f6f7f8;color:#050505;border-radius:999px;padding:10px 16px;font:600 13px Inter,sans-serif;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.5)}";
    document.head.appendChild(s);}

  function visible(){
    var q=S.q.toLowerCase();
    return S.list.filter(function(x){
      if(S.f==="activos"&&x.status==="entregado")return false;
      if(S.f==="entregados"&&x.status!=="entregado")return false;
      if(ST[S.f]&&x.status!==S.f)return false;
      if(S.f==="saldo"&&!(x.balance>0))return false;
      if(S.f==="tarde"&&!(x.status!=="entregado"&&daysTo(x.dueAt)<0))return false;
      if(S.kind!=="Todas"&&!x.items.some(function(i){return i.kind===S.kind;}))return false;
      if(q&&(x.name+" "+x.phone+" "+x.ticket+" "+x.items.map(function(i){return i.nombre;}).join(" ")).toLowerCase().indexOf(q)<0)return false;
      return true;});
  }
  function kinds(){var k={};S.list.forEach(function(x){x.items.forEach(function(i){k[i.kind]=1;});});return ["Todas"].concat(Object.keys(k));}
  function paint(){
    var act=S.list.filter(function(x){return x.status!=="entregado";});
    var conf=act.filter(function(x){return x.status==="confeccion"||x.status==="pedido";}).length,ready=act.filter(function(x){return x.status==="listo";}).length;
    var owe=S.list.reduce(function(a,x){return a+(x.balance||0);},0),late=act.filter(function(x){return daysTo(x.dueAt)<0;}).length;
    var F=[["activos","Activos"],["pedido","📝 Pedido"],["confeccion","🧵 En confección"],["listo","✨ Listas"],["saldo","💰 Con saldo"],["tarde","⚠ Atrasados"],["entregados","✅ Entregados"]];
    S.el.innerHTML='<div class="mk"><div class="mk-hero"><h2>🧵 Bajo pedido</h2><p>Deportivo, Atelier y todo lo que se confecciona: abonos, saldo, estado y fecha de entrega en un solo lugar.</p>'+
      '<div class="mk-kpis"><div class="mk-k"><b>'+conf+'</b><span>Por confeccionar</span></div><div class="mk-k"><b>'+ready+'</b><span>Listas para entregar</span></div><div class="mk-k"><b>'+money(owe)+'</b><span>Saldo por cobrar</span></div><div class="mk-k'+(late?' warn':'')+'"><b>'+late+'</b><span>Atrasados</span></div></div></div>'+
      '<div class="mk-bar" id="mkF">'+F.map(function(f){return '<button type="button" data-f="'+f[0]+'"'+(S.f===f[0]?' class="on"':'')+'>'+f[1]+'</button>';}).join("")+'</div>'+
      '<div class="mk-bar" id="mkK">'+kinds().map(function(k){return '<button type="button" data-k="'+esc(k)+'"'+(S.kind===k?' class="on"':'')+'>'+(k==="Deportivo"?"🏃‍♀️ ":k==="Atelier"?"🪡 ":"")+esc(k)+'</button>';}).join("")+'</div>'+
      '<input class="mk-q" id="mkQ" placeholder="🔎 Buscar clienta, prenda o recibo" value="'+esc(S.q)+'">'+
      '<div class="mk-grid" id="mkG"></div>'+
      '<div class="mk-new"><h3>➕ Anotar un pedido</h3><div class="mk-f">'+
        '<input id="nkN" placeholder="Clienta *"><input id="nkP" type="tel" inputmode="tel" placeholder="Celular">'+
        '<input id="nkR" class="w" placeholder="Prenda * (ej: Vestido atelier satín negro)">'+
        '<select id="nkK"><option>Atelier</option><option>Deportivo</option><option>Bajo pedido</option></select><input id="nkS" placeholder="Talla">'+
        '<input id="nkT" type="number" inputmode="numeric" placeholder="Valor total"><input id="nkD" type="number" inputmode="numeric" placeholder="Abono inicial">'+
        '<input id="nkE" type="date" class="w" title="Fecha de entrega">'+
        '<textarea id="nkM" class="w" placeholder="Medidas (busto, cintura, cadera, largo…)"></textarea>'+
        '<button type="button" id="nkGo" class="w" style="border:0;border-radius:999px;padding:12px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#ffe7a8,#fff 45%,#f3dca0);color:#050505;cursor:pointer">Guardar pedido</button></div>'+
        '<div class="mk-note">Úsalo para lo que no registraste como venta. Para que cuente en tus ventas y ganancias, regístralo también en 💵 Ventas (venta manual con abono): ahí ya aparece aquí solo.</div></div></div>';
    grid();bind();
  }
  function card(x){
    var tot=x.total||0,pct=tot?Math.min(100,Math.round(x.paid/tot*100)):0,d=daysTo(x.dueAt),late=x.status!=="entregado"&&d<0;
    var steps=["pedido","confeccion","listo","entregado"],idx=steps.indexOf(x.status);
    var src=SRC[x.src]||["",""],k=waNum(x.phone);
    var readyTxt="Hola "+first(x.name)+" ✨ ¡Tu "+(x.items[0]?x.items[0].nombre:"prenda")+" CΛNEVΛ ya está lista! 💎"+(x.balance>0?" Te queda un saldo de "+money(x.balance)+".":"")+" ¿Coordinamos la entrega? 🖤";
    var progTxt="Hola "+first(x.name)+" 💎 Te cuento que tu "+(x.items[0]?x.items[0].nombre:"prenda")+" ya está en confección 🧵 La tendrás lista para el "+fdate(x.dueAt)+". ¡Va a quedar divina! ✨";
    return '<div class="mk-c'+(late?' late':'')+(x.status==="listo"?' listo':'')+(x.status==="entregado"?' done':'')+'" data-key="'+esc(x.key)+'">'+
      '<div class="mk-h"><div><b>'+esc(x.name||"Sin nombre")+'</b>'+(x.phone?'<br><a href="https://wa.me/'+k+'" target="_blank" rel="noopener" data-name="'+esc(x.name)+'" style="font-size:12px">'+esc(x.phone)+'</a>':'')+'</div>'+
        '<div class="r">'+(x.ticket?esc(x.ticket)+'<br>':'')+esc(fdate(x.createdAt))+'</div></div>'+
      '<div class="mk-tags">'+x.items.map(function(i){return '<span class="mk-t k">'+(i.kind==="Deportivo"?"🏃‍♀️ ":i.kind==="Atelier"?"🪡 ":"🧵 ")+esc(i.kind)+'</span>';}).filter(function(v,i,a){return a.indexOf(v)===i;}).join("")+
        '<span class="mk-t">'+src[0]+' '+src[1]+'</span>'+(x.unpaidOrder?'<span class="mk-t bad">Pedido sin pagar</span>':'')+(x.src==="nota"?'<span class="mk-t bad">No está en Ventas</span>':'')+(x.more>0?'<span class="mk-t">+'+x.more+' prenda'+(x.more>1?'s':'')+' de stock</span>':'')+'</div>'+
      '<div class="mk-it">'+x.items.map(function(i){return '• '+esc(i.nombre)+' <small>'+(i.size?'Talla '+esc(i.size)+' · ':'')+'x'+(i.qty||1)+'</small>';}).join('<br>')+'</div>'+
      '<div class="mk-money"><div class="mk-prog"><i style="width:'+pct+'%"></i></div><div class="mk-mrow"><span>Abonado <b>'+money(x.paid)+'</b> de '+money(tot)+' ('+pct+'%)</span>'+(x.balance>0?'<span class="owe">Saldo <b>'+money(x.balance)+'</b></span>':'<span style="color:#8ef0c8">✓ Pagado</span>')+'</div></div>'+
      '<div class="mk-steps">'+steps.map(function(s,i){return '<button type="button" data-st="'+s+'"'+(i===idx?' class="on"':i<idx?' class="past"':'')+'>'+ST[s][0]+' '+ST[s][1]+'</button>';}).join("")+'</div>'+
      '<div class="mk-due">📅 Entrega <input type="date" data-due value="'+esc(String(x.dueAt||"").slice(0,10))+'"> <span style="color:'+(late?'#ffb4a8':d<=2?'#ffe7a8':'rgba(246,247,248,.6)')+'">'+(x.status==="entregado"?"":late?"⚠ atrasado "+Math.abs(d)+" día"+(Math.abs(d)===1?"":"s"):d===0?"es hoy":"en "+d+" día"+(d===1?"":"s"))+'</span></div>'+
      '<textarea data-ms placeholder="Medidas">'+esc(x.measures||"")+'</textarea><textarea data-nt placeholder="Notas de confección (tela, color, detalles)">'+esc(x.notes||"")+'</textarea>'+
      '<div class="mk-act">'+(k?(x.status==="listo"?'<a class="wa" target="_blank" rel="noopener" data-direct="1" href="https://wa.me/'+k+'?text='+encodeURIComponent(readyTxt)+'">💬 Avisar que está lista</a>':'<a class="wa" target="_blank" rel="noopener" data-direct="1" href="https://wa.me/'+k+'?text='+encodeURIComponent(progTxt)+'">💬 Contarle cómo va</a>'):'')+
        (x.balance>0&&x.src!=="web"?'<button type="button" class="gh" data-paybtn>💰 Registrar abono</button>':'')+
        (x.src==="nota"?'<button type="button" class="gh" data-del>🗑</button>':'')+(x.unpaidOrder?'<button type="button" class="gh" data-goped>Ver en Pedidos</button>':'')+'</div>'+
      '<div class="mk-pay"><input type="number" inputmode="numeric" placeholder="Abono $" data-amt><select data-pm><option value="efectivo">Efectivo</option><option value="breb">Bre-B</option><option value="transferencia">Transferencia</option><option value="nequi">Nequi</option><option value="datafono">Datáfono</option></select><button type="button" data-paygo style="border:0;border-radius:10px;padding:0 12px;font-weight:800;background:#8ef0c8;color:#04140a">OK</button></div>'+
    '</div>';
  }
  function grid(){var L=visible();S.el.querySelector("#mkG").innerHTML=L.length?L.map(card).join(""):'<div class="mk-empty">'+(S.list.length?"No hay pedidos con este filtro.":"Aún no hay prendas bajo pedido. Aparecen solas cuando vendes una prenda Deportiva o Atelier (en la página, en 💵 Ventas o en ⏳ Apartados), o anótala abajo.")+'</div>';}
  function find(key){for(var i=0;i<S.list.length;i++)if(S.list[i].key===key)return S.list[i];return null;}
  function upd(key,patch,msg){return api("/admin/made/update",{method:"POST",body:Object.assign({key:key},patch)}).then(function(d){var x=find(key);if(x){Object.assign(x,{status:d.state.status||x.status,dueAt:d.state.dueAt||x.dueAt,notes:d.state.notes!==undefined?d.state.notes:x.notes,measures:d.state.measures!==undefined?d.state.measures:x.measures});}if(msg)toast(msg);}).catch(function(e){toast("⚠️ "+e.message);});}
  function bind(){
    var el=S.el;
    el.querySelector("#mkQ").oninput=function(){S.q=this.value;grid();};
    el.querySelector("#nkGo").onclick=function(){
      var g=function(id){return el.querySelector(id).value.trim();},b={name:g("#nkN"),phone:g("#nkP"),prenda:g("#nkR"),kind:g("#nkK"),size:g("#nkS"),total:g("#nkT"),deposit:g("#nkD"),dueAt:g("#nkE"),measures:g("#nkM")};
      if(!b.name||!b.prenda){toast("Escribe la clienta y la prenda");return;}
      api("/admin/made/note",{method:"POST",body:b}).then(function(){toast("🧵 Pedido anotado");load();}).catch(function(e){toast("⚠️ "+e.message);});};
  }
  // delegated listeners: attached once per mount (paint() re-renders the content many times)
  function bindOnce(){
    var el=S.el;
    el.addEventListener("click",function(e){
      var b=e.target.closest("button");if(!b||!el.contains(b))return;
      if(b.dataset.f){S.f=b.dataset.f;paint();return;}
      if(b.dataset.k){S.kind=b.dataset.k;paint();return;}
      var c=b.closest(".mk-c");if(!c)return;var key=c.dataset.key,x=find(key);if(!x)return;
      if(b.dataset.st){upd(key,{status:b.dataset.st},ST[b.dataset.st][0]+" "+ST[b.dataset.st][1]).then(function(){paint();});return;}
      if(b.hasAttribute("data-paybtn")){c.querySelector(".mk-pay").classList.toggle("on");var i=c.querySelector("[data-amt]");i.value=x.balance||"";i.focus();return;}
      if(b.hasAttribute("data-paygo")){
        var amt=parseInt(c.querySelector("[data-amt]").value,10)||0,pm=c.querySelector("[data-pm]").value;if(amt<=0){toast("Escribe el valor del abono");return;}
        var path=x.src==="manual"?"/admin/sales/manual/"+x.id+"/pay":x.src==="apartado"?"/admin/layaways/"+x.id+"/pay":"/admin/made/note",body=x.src==="nota"?{pay:true,id:x.id,amount:amt,payMethod:pm}:{amount:amt,pay:pm};
        b.disabled=true;api(path,{method:"POST",body:body}).then(function(){toast("💰 Abono de "+money(amt)+" registrado");load();}).catch(function(err){b.disabled=false;toast("⚠️ "+err.message);});return;}
      if(b.hasAttribute("data-del")){if(confirm("¿Borrar este pedido anotado?"))api("/admin/made/note",{method:"POST",body:{delete:true,id:x.id}}).then(load);return;}
      if(b.hasAttribute("data-goped")&&S.o.goPedidos){S.o.goPedidos();return;}
    });
    el.addEventListener("change",function(e){var t=e.target,c=t.closest&&t.closest(".mk-c");if(!c)return;
      if(t.hasAttribute("data-due")&&t.value)upd(c.dataset.key,{dueAt:t.value+"T12:00:00Z"},"📅 Fecha de entrega guardada").then(function(){paint();});
      if(t.hasAttribute("data-ms"))upd(c.dataset.key,{measures:t.value},"📏 Medidas guardadas");
      if(t.hasAttribute("data-nt"))upd(c.dataset.key,{notes:t.value},"📝 Notas guardadas");});
  }
  function load(){if(!S.el)return;S.el.innerHTML='<div class="mk-empty">Cargando…</div>';
    api("/admin/made").then(function(d){S.list=d.list||[];paint();}).catch(function(e){S.el.innerHTML='<div class="mk-empty">⚠️ '+esc(e.message)+'<br><br>Si dice que falta actualizar, pega el Worker v82 en Cloudflare.</div>';});}
  window.CanevaMade={mount:function(el,o){S.el=el;S.o=o;css();bindOnce();load();},reload:load};
})();
