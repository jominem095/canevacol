/* CANEVA Admin — Ventas manuales (store counter, WhatsApp, Instagram, fairs).
   Records sales that did not go through the website so they count in Reportes, the month goal,
   Club points and inventory. Shared by admin.html and admin_movil.html.
   Usage: CanevaVentas.mount(element, { api, token: () => "..." })
   Needs Worker v57 (/admin/sales/manual). */
(function(){
  "use strict";
  var OPT={api:"https://caneva-ai.canevacol.workers.dev",token:function(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}};
  var S={el:null,cat:[],data:null,days:1,lines:[],busy:false};
  var CH={tienda:"Tienda física",whatsapp:"WhatsApp",instagram:"Instagram",feria:"Feria / evento",otro:"Otro"};
  var PAY={efectivo:"Efectivo",transferencia:"Transferencia",nequi:"Nequi",daviplata:"Daviplata",datafono:"Datáfono",bold:"Link Bold",otro:"Otro"};

  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function num(v){var n=parseInt(String(v==null?"":v).replace(/[^\d]/g,""),10);return isFinite(n)?n:0;}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function today(){var d=new Date(Date.now()-5*3600000);return d.toISOString().slice(0,10);}
  function norm(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}
  function sizesOf(p){var t=String((p&&p.tallas)||"").trim();if(!t||/^[uú]nica$/i.test(t))return ["Única"];return t.split(/[\s,\/\-]+/).map(function(x){return x.trim().toUpperCase();}).filter(Boolean);}
  function api(path,opts){opts=opts||{};return fetch(OPT.api+path,{method:opts.method||"GET",headers:{"x-admin-token":OPT.token(),"Content-Type":"application/json"},body:opts.body?JSON.stringify(opts.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function toast(msg,bad){var t=document.createElement("div");t.className="vt-toast"+(bad?" bad":"");t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.classList.add("on");},10);setTimeout(function(){t.classList.remove("on");setTimeout(function(){t.remove();},300);},3200);}

  var CSS='.vt{max-width:980px;margin:0 auto;padding:18px 14px 90px;color:#f7f7f4;font-family:Inter,system-ui,sans-serif}'+
  '.vt h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:400;font-size:2rem;margin:.1rem 0 .2rem}.vt .dim{color:rgba(247,247,244,.55);font-size:.82rem}'+
  '.vt-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px}'+
  '.vt-seg{display:flex;border:1px solid rgba(247,247,244,.18);border-radius:999px;overflow:hidden}.vt-seg button{background:none;border:0;color:#f7f7f4;padding:.5rem .9rem;font-size:.78rem;cursor:pointer}.vt-seg button.on{background:#f7f7f4;color:#050505}'+
  '.vt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 16px}.vt-kpi{border:1px solid rgba(247,247,244,.14);border-radius:14px;padding:.75rem .85rem;background:#0d0d0d}.vt-kpi span{display:block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(247,247,244,.55)}.vt-kpi b{font-size:1.25rem;font-weight:600}'+
  '.vt-card{border:1px solid rgba(247,247,244,.16);border-radius:18px;background:#0b0b0b;padding:16px;margin-bottom:16px}.vt-card h3{margin:0 0 10px;font-size:1rem;font-weight:600}'+
  '.vt input,.vt select,.vt textarea{width:100%;background:#151515;border:1px solid rgba(247,247,244,.18);border-radius:10px;color:#f7f7f4;padding:.62rem .7rem;font:inherit;font-size:.9rem}'+
  '.vt label{display:block;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,247,244,.6);margin:0 0 4px}'+
  '.vt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px}'+
  '.vt-search{position:relative}.vt-sug{position:absolute;left:0;right:0;top:100%;z-index:20;background:#121212;border:1px solid rgba(247,247,244,.2);border-radius:12px;margin-top:4px;max-height:300px;overflow:auto}'+
  '.vt-sug button{display:flex;gap:10px;align-items:center;width:100%;background:none;border:0;border-bottom:1px solid rgba(247,247,244,.08);color:#f7f7f4;padding:.5rem .6rem;text-align:left;cursor:pointer}.vt-sug button:hover{background:#1c1c1c}'+
  '.vt-sug img{width:38px;height:48px;object-fit:cover;border-radius:6px;background:#222}.vt-sug small{display:block;color:rgba(247,247,244,.55)}'+
  '.vt-lines{margin-top:12px;display:grid;gap:8px}.vt-line{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;border:1px solid rgba(247,247,244,.12);border-radius:12px;padding:.5rem}'+
  '.vt-line img{width:44px;height:56px;object-fit:cover;border-radius:6px;background:#222}.vt-line .nm{font-weight:600;font-size:.9rem}.vt-line .ctl{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}'+
  '.vt-line .ctl select,.vt-line .ctl input{width:auto;min-width:70px;padding:.4rem .5rem;font-size:.82rem}.vt-line .ctl input.q{width:62px}.vt-line .ctl input.p{width:110px}'+
  '.vt-x{background:none;border:1px solid rgba(247,247,244,.2);color:#f7f7f4;border-radius:999px;width:32px;height:32px;cursor:pointer}'+
  '.vt-btn{border:1px solid #f7f7f4;background:#f7f7f4;color:#050505;border-radius:999px;padding:.75rem 1.2rem;font-weight:600;cursor:pointer;font-size:.88rem}.vt-btn.ghost{background:none;color:#f7f7f4;border-color:rgba(247,247,244,.3)}.vt-btn:disabled{opacity:.5}'+
  '.vt-total{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(247,247,244,.12)}.vt-total b{font-size:1.5rem}'+
  '.vt-chk{display:flex;gap:8px;align-items:center;font-size:.84rem;margin-top:10px;color:rgba(247,247,244,.8)}.vt-chk input{width:auto}'+
  '.vt-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:.75rem 0;border-bottom:1px solid rgba(247,247,244,.08)}.vt-row:last-child{border-bottom:0}.vt-row .t{font-weight:600}.vt-row .it{font-size:.82rem;color:rgba(247,247,244,.7);margin-top:2px}'+
  '.vt-row .tag{display:inline-block;font-size:.68rem;border:1px solid rgba(247,247,244,.2);border-radius:999px;padding:.12rem .5rem;margin:4px 4px 0 0;color:rgba(247,247,244,.75)}.vt-row.void{opacity:.45}.vt-row.void .t{text-decoration:line-through}'+
  '.vt-row .r{text-align:right}.vt-row .r b{display:block;font-size:1.05rem}.vt-void{background:none;border:0;color:#ffb4a8;font-size:.75rem;cursor:pointer;margin-top:6px;padding:0}.vt-mail{background:none;border:1px solid rgba(247,247,244,.25);border-radius:999px;color:#f7f7f4;font-size:.72rem;cursor:pointer;margin-top:6px;padding:.25rem .6rem}'+
  '.vt-empty{color:rgba(247,247,244,.5);font-size:.86rem;padding:.6rem 0}'+
  '.vt-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;background:#f7f7f4;color:#050505;padding:.7rem 1.1rem;border-radius:999px;font-weight:600;z-index:9999;transition:.3s;font-family:Inter,sans-serif;font-size:.88rem}.vt-toast.on{opacity:1;transform:translate(-50%,0)}.vt-toast.bad{background:#ffb4a8}'+
  '@media(max-width:560px){.vt h2{font-size:1.6rem}.vt-line{grid-template-columns:40px 1fr auto}}';

  function opts(map,sel){return Object.keys(map).map(function(k){return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(map[k])+'</option>';}).join("");}

  function render(){
    var el=S.el;if(!el)return;
    el.innerHTML='<div class="vt"><div class="vt-head"><div><div class="dim">Ventas que no pasan por la página</div><h2>💵 Ventas manuales</h2></div>'+
      '<div class="vt-seg">'+[[1,"Hoy"],[7,"7 días"],[30,"30 días"]].map(function(x){return '<button type="button" data-days="'+x[0]+'" class="'+(x[0]===S.days?"on":"")+'">'+x[1]+'</button>';}).join("")+'</div></div>'+
      '<div class="vt-kpis" id="vtKpis"></div>'+
      '<div class="vt-card"><h3>Registrar una venta</h3>'+
        '<div class="vt-search"><label>Buscar prenda</label><input id="vtQ" placeholder="Escribe el nombre: vestido, jean, body…" autocomplete="off"><div class="vt-sug" id="vtSug" hidden></div></div>'+
        '<div style="margin-top:8px"><button type="button" class="vt-btn ghost" data-free="1" style="padding:.5rem .9rem;font-size:.8rem">+ Prenda que no está en la tienda</button></div>'+
        '<div class="vt-lines" id="vtLines"></div>'+
        '<div class="vt-grid">'+
          '<div><label>Dónde se vendió</label><select id="vtCh">'+opts(CH,"tienda")+'</select></div>'+
          '<div><label>Cómo pagó</label><select id="vtPay">'+opts(PAY,"efectivo")+'</select></div>'+
          '<div><label>Fecha</label><input id="vtDate" type="date" value="'+today()+'" max="'+today()+'"></div>'+
          '<div><label>Descuento ($)</label><input id="vtDisc" inputmode="numeric" placeholder="0"></div>'+
          '<div><label>Clienta (opcional)</label><input id="vtName" placeholder="Nombre"></div>'+
          '<div><label>Celular (opcional)</label><input id="vtPhone" inputmode="tel" placeholder="300 000 0000"></div>'+
          '<div><label>Enviar recibo al correo</label><input id="vtMail" type="email" inputmode="email" placeholder="clienta@gmail.com"></div>'+
          '<div><label>Nota (opcional)</label><input id="vtNote" placeholder="Ej: cambio de talla, vendió Ana"></div>'+
        '</div>'+
        '<label class="vt-chk"><input type="checkbox" id="vtStock" checked> Descontar del inventario</label>'+
        '<div class="vt-total"><div><div class="dim">Total de la venta</div><b id="vtTotal">$0</b></div><button type="button" class="vt-btn" id="vtSave">Guardar venta</button></div>'+
      '</div>'+
      '<div class="vt-card"><h3>Ventas registradas</h3><div id="vtList"><div class="vt-empty">Cargando…</div></div></div></div>';
    paintLines();paintData();
  }

  function paintLines(){
    var box=S.el&&S.el.querySelector("#vtLines");if(!box)return;
    box.innerHTML=S.lines.length?S.lines.map(function(l,i){
      var sizes=l.sizes||[];
      return '<div class="vt-line" data-i="'+i+'">'+(l.img?'<img src="'+esc(l.img)+'" alt="">':'<span></span>')+'<div>'+
        (l.free?'<input data-f="nombre" value="'+esc(l.nombre)+'" placeholder="Nombre de la prenda">':'<div class="nm">'+esc(l.nombre)+'</div>')+
        '<div class="ctl">'+(sizes.length>1?'<select data-f="size">'+sizes.map(function(s){return '<option'+(s===l.size?' selected':'')+'>'+esc(s)+'</option>';}).join("")+'</select>':(l.free?'<input data-f="size" value="'+esc(l.size)+'" placeholder="Talla" style="width:80px">':''))+
        '<input class="q" data-f="qty" type="number" min="1" max="99" value="'+l.qty+'" title="Cantidad">'+
        '<input class="p" data-f="precio" inputmode="numeric" value="'+esc(money(l.precio))+'" title="Precio unitario"></div></div>'+
        '<button type="button" class="vt-x" data-del="'+i+'" aria-label="Quitar">×</button></div>';}).join(""):'<div class="vt-empty">Busca una prenda arriba para agregarla.</div>';
    total();
  }
  function total(){
    var sub=S.lines.reduce(function(s,l){return s+(l.precio||0)*(l.qty||1);},0),disc=num((S.el.querySelector("#vtDisc")||{}).value);
    var t=Math.max(0,sub-Math.min(sub,disc)),el=S.el.querySelector("#vtTotal");if(el)el.textContent=money(t)+(disc?"  (desc. "+money(Math.min(sub,disc))+")":"");
  }

  function paintData(){
    var D=S.data,k=S.el&&S.el.querySelector("#vtKpis"),list=S.el&&S.el.querySelector("#vtList");if(!k||!list)return;
    if(!D){k.innerHTML="";return;}
    var T=D.totals;
    k.innerHTML='<div class="vt-kpi"><span>Vendido '+(S.days===1?"hoy":"en "+S.days+" días")+'</span><b>'+money(T.revenue)+'</b></div><div class="vt-kpi"><span>Ventas</span><b>'+T.count+'</b></div>'+
      T.byPay.slice(0,3).map(function(x){return '<div class="vt-kpi"><span>'+esc(x.label)+'</span><b>'+money(x.total)+'</b></div>';}).join("");
    list.innerHTML=D.list.length?D.list.map(function(v){
      var when=new Date(v.paidAt).toLocaleString("es-CO",{timeZone:"America/Bogota",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
      var it=v.items.map(function(x){return esc(x.nombre)+(x.size?" ("+esc(x.size)+")":"")+(x.qty>1?" ×"+x.qty:"");}).join(" · ");
      return '<div class="vt-row'+(v.status!=="pagado"?" void":"")+'"><div><div class="t">'+esc(v.ticket)+' · '+esc(when)+(v.name?' · '+esc(v.name):'')+'</div><div class="it">'+it+'</div>'+
        '<span class="tag">'+esc(v.channelLabel||"")+'</span><span class="tag">'+esc(v.payLabel||"")+'</span>'+(v.points?'<span class="tag">+'+v.points+' pts Club</span>':'')+(v.note?'<span class="tag">'+esc(v.note)+'</span>':'')+(v.status!=="pagado"?'<span class="tag">Anulada</span>':'')+'</div>'+
        '<div class="r"><b>'+money(v.total)+'</b>'+(v.status==="pagado"?'<button type="button" class="vt-mail" data-mail="'+esc(v.id)+'">📧 Recibo</button><br><button type="button" class="vt-void" data-void="'+esc(v.id)+'">Anular</button>':'')+'</div></div>';}).join(""):'<div class="vt-empty">No hay ventas manuales en este periodo.</div>';
  }

  function load(){
    return api("/admin/sales/manual?days="+S.days).then(function(d){S.data=d;paintData();}).catch(function(e){
      var l=S.el&&S.el.querySelector("#vtList");if(l)l.innerHTML='<div class="vt-empty">'+(/Ruta no encontrada|404/.test(e.message)?"Falta pegar la Worker v57 en Cloudflare para usar este módulo.":esc(e.message))+'</div>';});
  }
  function loadCat(){return fetch(OPT.api+"/catalog?ts="+Date.now()).then(function(r){return r.json();}).then(function(d){S.cat=(d.products||[]).filter(function(p){return p.nombre;});}).catch(function(){});}

  function suggest(q){
    var box=S.el.querySelector("#vtSug");q=norm(q).trim();
    if(!q){box.hidden=true;return;}
    var res=S.cat.filter(function(p){return norm(p.nombre+" "+p.categoria).indexOf(q)>=0;}).slice(0,12);
    box.innerHTML=res.length?res.map(function(p){return '<button type="button" data-add="'+esc(p.id||p.nombre)+'">'+(p.imagen?'<img src="'+esc(p.imagen)+'" alt="" loading="lazy">':'')+'<span>'+esc(p.nombre)+'<small>'+esc(p.categoria||"")+' · '+esc(p.precio||"")+' · '+esc(p.tallas||"")+'</small></span></button>';}).join(""):'<div class="vt-empty" style="padding:.6rem">Sin resultados. Usa “Prenda que no está en la tienda”.</div>';
    box.hidden=false;
  }
  function addProduct(key){
    var p=S.cat.find(function(x){return (x.id||x.nombre)===key;});if(!p)return;
    var sizes=sizesOf(p);
    S.lines.push({pid:p.id||"",nombre:p.nombre,categoria:p.categoria||"",precio:num(p.precio),qty:1,size:sizes[0]||"",sizes:sizes,img:p.imagen||""});
    var q=S.el.querySelector("#vtQ");q.value="";S.el.querySelector("#vtSug").hidden=true;paintLines();
  }

  function save(){
    if(S.busy)return;
    var lines=S.lines.filter(function(l){return String(l.nombre||"").trim();});
    if(!lines.length)return toast("Agrega al menos una prenda",true);
    if(lines.some(function(l){return !(l.precio>0);})&&!confirm("Hay prendas con precio $0. ¿Guardar así?"))return;
    var g=function(id){return (S.el.querySelector(id)||{}).value||"";};
    var body={items:lines.map(function(l){return {pid:l.pid,nombre:l.nombre,categoria:l.categoria,precio:l.precio,qty:l.qty,size:l.size==="Única"?"":l.size,imagen:l.img};}),
      channel:g("#vtCh"),pay:g("#vtPay"),date:g("#vtDate"),discount:num(g("#vtDisc")),name:g("#vtName"),phone:g("#vtPhone"),email:g("#vtMail").trim(),note:g("#vtNote"),noStock:!S.el.querySelector("#vtStock").checked};
    S.busy=true;var b=S.el.querySelector("#vtSave");b.disabled=true;b.textContent="Guardando…";
    api("/admin/sales/manual",{method:"POST",body:body}).then(function(d){
      S.busy=false;S.lines=[];
      var w=(d.inventory&&d.inventory.warnings)||[];
      var em=d.email||{},mailTxt=em.sent?" · 📧 recibo enviado":(body.email&&!em.skipped?" · ⚠ el recibo no se pudo enviar":"");
      toast("✓ Venta "+d.ticket+" guardada · "+money(d.total)+(d.points?" · +"+d.points+" pts":"")+mailTxt,!!(body.email&&!em.sent&&!em.skipped));
      if(body.email&&!em.sent&&!em.skipped)setTimeout(function(){alert("La venta quedó guardada, pero el recibo no se pudo enviar: "+(em.error||"revisa el correo")+"\nPuedes reenviarlo desde la lista con 📧 Recibo.");},500);
      if(w.length)setTimeout(function(){alert("Venta guardada. Revisa el inventario:\n\n"+w.join("\n"));},400);
      render();load();
    }).catch(function(e){S.busy=false;b.disabled=false;b.textContent="Guardar venta";toast(e.message,true);});
  }

  function bind(el){
    el.addEventListener("input",function(e){
      var t=e.target;
      if(t.id==="vtQ")return suggest(t.value);
      if(t.id==="vtDisc")return total();
      var row=t.closest(".vt-line");if(!row)return;
      var l=S.lines[+row.dataset.i],f=t.dataset.f;if(!l||!f)return;
      if(f==="qty")l.qty=Math.max(1,Math.min(99,parseInt(t.value,10)||1));else if(f==="precio")l.precio=num(t.value);else l[f]=t.value;
      total();
    });
    el.addEventListener("change",function(e){var t=e.target,row=t.closest(".vt-line");if(row&&t.dataset.f==="precio")t.value=money(S.lines[+row.dataset.i].precio);if(row&&t.dataset.f==="size")S.lines[+row.dataset.i].size=t.value;});
    el.addEventListener("click",function(e){
      var t=e.target,b;
      if((b=t.closest("[data-days]"))){S.days=+b.dataset.days;el.querySelectorAll("[data-days]").forEach(function(x){x.classList.toggle("on",x===b);});return load();}
      if((b=t.closest("[data-add]")))return addProduct(b.dataset.add);
      if(t.closest("[data-free]")){S.lines.push({pid:"",nombre:"",categoria:"",precio:0,qty:1,size:"",sizes:[],img:"",free:true});paintLines();var ins=el.querySelectorAll('.vt-line [data-f="nombre"]');if(ins.length)ins[ins.length-1].focus();return;}
      if((b=t.closest("[data-del]"))){S.lines.splice(+b.dataset.del,1);return paintLines();}
      if(t.closest("#vtSave"))return save();
      if((b=t.closest("[data-mail]"))){
        var to=(prompt("¿A qué correo enviamos el recibo?")||"").trim();if(!to)return;
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))return toast("Ese correo no es válido",true);
        b.disabled=true;b.textContent="Enviando…";
        api("/admin/orders/"+b.dataset.mail+"/resend",{method:"POST",body:{email:to}}).then(function(d){toast("📧 Recibo "+d.ticket+" enviado a "+to);b.disabled=false;b.textContent="📧 Recibo";}).catch(function(x){b.disabled=false;b.textContent="📧 Recibo";toast(x.message,true);});return;
      }
      if((b=t.closest("[data-void]"))){
        if(!confirm("¿Anular esta venta? Deja de contar en reportes, las prendas vuelven al inventario y se descuentan los puntos del Club."))return;
        api("/admin/sales/manual/"+b.dataset.void+"/void",{method:"POST",body:{}}).then(function(){toast("Venta anulada");load();}).catch(function(x){toast(x.message,true);});return;
      }
      if(!t.closest(".vt-search")){var s=el.querySelector("#vtSug");if(s)s.hidden=true;}
    });
  }

  function mount(el,o){
    o=o||{};if(o.api)OPT.api=o.api;if(o.token)OPT.token=o.token;
    if(!document.getElementById("vt-css")){var st=document.createElement("style");st.id="vt-css";st.textContent=CSS;document.head.appendChild(st);}
    if(S.el!==el){S.el=el;bind(el);}
    render();
    return Promise.all([loadCat(),load()]);
  }
  window.CanevaVentas={mount:mount};
})();
