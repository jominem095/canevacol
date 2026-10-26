/* CANEVA admin · Registrar con IA + Libretas (v1)
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
  var S={acts:[],hist:[],busy:false};

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
  function open(pre){
    css();close();var ov=document.createElement("div");ov.className="ia-ov";ov.id="iaOv";
    ov.innerHTML='<div class="ia-sh"><div class="ia-hd"><span style="font-size:24px">✨</span><h2>Registrar con IA</h2><button type="button" data-x aria-label="Cerrar">×</button></div>'+
      '<div class="ia-sub">Escríbelo o díctalo como se lo dirías a una asistente: un proveedor, una compra, un pedido, una prenda nueva, un gasto, una idea… lo que sea. Te muestro lo que entendí y tú confirmas.</div>'+
      '<div class="ia-in"><textarea id="iaTx" placeholder="Ej: le compré a Doña Rosa 3 vestidos por 450 mil y le di 200"></textarea><div style="display:flex;flex-direction:column;gap:6px"><button type="button" class="ia-mic" id="iaMic" title="Dictar">🎤</button><button type="button" class="ia-go" id="iaGo" title="Enviar">➤</button></div></div>'+
      '<div class="ia-ex">'+EX.map(function(e){return '<button type="button" data-ex>'+esc(e)+'</button>';}).join("")+'</div><div id="iaOut"></div></div>';
    document.body.appendChild(ov);
    var tx=ov.querySelector("#iaTx");if(pre)tx.value=pre;setTimeout(function(){tx.focus();},200);
    ov.addEventListener("click",function(e){
      if(e.target===ov||e.target.closest("[data-x]")){close();return;}
      var ex=e.target.closest("[data-ex]");if(ex){tx.value=ex.textContent;tx.focus();return;}
      if(e.target.closest("#iaGo")){send(tx.value);return;}
      if(e.target.closest("#iaMic")){mic(e.target.closest("#iaMic"),tx);return;}
      var ok=e.target.closest("[data-ok]");if(ok){run(+ok.dataset.ok);return;}
      var no=e.target.closest("[data-no]");if(no){var c=no.closest(".ia-card");if(c)c.remove();S.acts[+no.dataset.no]=null;return;}
      if(e.target.closest("[data-all]")){runAll();return;}
    });
    tx.addEventListener("keydown",function(e){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))send(tx.value);});
  }
  function close(){var o=document.getElementById("iaOv");if(o)o.remove();}
  function mic(btn,tx){var R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast("Tu navegador no permite dictar aquí: usa el micrófono del teclado");return;}
    var r=new R();r.lang="es-CO";r.interimResults=true;btn.classList.add("rec");var base=tx.value?tx.value+" ":"";
    r.onresult=function(ev){var t="";for(var i=0;i<ev.results.length;i++)t+=ev.results[i][0].transcript;tx.value=base+t;};r.onend=function(){btn.classList.remove("rec");};r.onerror=function(){btn.classList.remove("rec");};r.start();}
  function send(text){
    text=String(text||"").trim();if(!text||S.busy)return;S.busy=true;var out=document.getElementById("iaOut");out.innerHTML='<div class="ia-rep">✨ Entendiendo…</div>';
    api("/admin/ai/act",{method:"POST",body:{message:text,history:S.hist}}).then(function(d){
      S.hist=S.hist.concat([{role:"user",text:text},{role:"model",text:d.reply||""}]).slice(-6);S.acts=d.actions||[];S.sups=d.suppliers||[];
      out.innerHTML='<div class="ia-rep">'+esc(d.reply||"Esto es lo que entendí:")+'</div>'+S.acts.map(cardHtml).join("")+(S.acts.length>1?'<button type="button" class="ia-all" data-all>✓ Registrar todo ('+S.acts.length+')</button>':'');
    }).catch(function(e){out.innerHTML='<div class="ia-rep">⚠️ '+esc(e.message)+(/404|Ruta|actualizar/i.test(e.message)?'<br>Pega el Worker v85 en Cloudflare.':'')+'</div>';}).then(function(){S.busy=false;});
  }
  function fieldsOf(a){var d=a.data||{};if(a.type==="record"){return [["collection",d.collection||""],["icon",d.icon||"📒"]].concat(Object.keys(d.fields||{}).map(function(k){return ["f:"+k,d.fields[k]];}));}
    return Object.keys(d).map(function(k){var v=d[k];return [k,Array.isArray(v)?v.join(", "):v];});}
  function cardHtml(a,i){var t=T[a.type]||["•",a.type];
    return '<div class="ia-card" data-i="'+i+'"><div class="ia-ch">'+t[0]+' '+t[1]+(a.summary?' <small>· '+esc(a.summary)+'</small>':'')+'</div><div class="ia-f">'+fieldsOf(a).map(function(f){var k=f[0],lab=k.indexOf("f:")===0?k.slice(2):(LABEL[k]||k),long=/text|notes|measures|descripcion|desc/.test(k)||String(f[1]||"").length>40;
      return '<div class="'+(long?'w':'')+'"><label>'+esc(lab)+'</label>'+(long?'<textarea data-k="'+esc(k)+'" rows="2">'+esc(f[1]==null?"":f[1])+'</textarea>':'<input data-k="'+esc(k)+'" value="'+esc(f[1]==null?"":f[1])+'">')+'</div>';}).join("")+'</div>'+
      '<div class="ia-act"><button type="button" class="ia-ok" data-ok="'+i+'">✓ Registrar</button><button type="button" class="ia-no" data-no="'+i+'">Descartar</button></div></div>';}
  function readCard(i){var c=document.querySelector('.ia-card[data-i="'+i+'"]'),a=S.acts[i];if(!c||!a)return null;var d={},fields={};
    c.querySelectorAll("[data-k]").forEach(function(el){var k=el.dataset.k,v=el.value.trim();if(k.indexOf("f:")===0){if(v)fields[k.slice(2)]=/^\d+$/.test(v)?Number(v):v;}else d[k]=v;});
    if(a.type==="record")d.fields=fields;return {type:a.type,data:d,el:c};}
  function num(v){var t=String(v||""),n=parseInt(t.replace(/[^\d]/g,""),10)||0;if(n&&n<1000&&/mil|k\b/i.test(t))n*=1000;return n;}
  function exec(x){var d=x.data;
    if(x.type==="supplier")return api("/admin/suppliers",{method:"POST",body:{action:"save",supplier:Object.assign({},d,{categories:String(d.categories||"").split(/\s*,\s*/).filter(Boolean)})}}).then(function(){return "🤝 Proveedor "+d.name+" registrado";});
    if(x.type==="purchase")return api("/admin/suppliers").then(function(s){var sp=(s.suppliers||[]).filter(function(p){return norm(p.name)===norm(d.supplier);})[0]||(s.suppliers||[]).filter(function(p){return norm(p.name).indexOf(norm(d.supplier))>=0||norm(d.supplier).indexOf(norm(p.name))>=0;})[0];
      if(!sp)throw new Error("No encuentro al proveedor \""+d.supplier+"\". Regístralo primero.");
      return api("/admin/suppliers",{method:"POST",body:{action:"purchase",purchase:{supplierId:sp.id,desc:d.desc,total:num(d.total),paid:num(d.paid),dueAt:d.dueAt}}}).then(function(){return "🧾 Compra a "+sp.name+" registrada";});});
    if(x.type==="made")return api("/admin/made/note",{method:"POST",body:{name:d.name,phone:d.phone,prenda:d.prenda,kind:d.kind,size:d.size,total:num(d.total),deposit:num(d.deposit),dueAt:d.dueAt,measures:d.measures,notes:d.notes}}).then(function(){return "🧵 Pedido de "+d.name+" anotado en el taller";});
    if(x.type==="product"){if(!window.cvNewProduct)return Promise.reject(new Error("Abre la pestaña Productos"));close();window.cvNewProduct(d);return Promise.resolve("👗 Revisa la prenda, ponle la foto y publícala");}
    if(x.type==="reply")return api("/admin/replies").then(function(r){var l=r.list||[];l.unshift({id:"m"+Date.now().toString(36),cat:d.cat||"Mías",title:d.title,text:d.text});return api("/admin/replies",{method:"POST",body:{list:l}});}).then(function(){return "💬 Respuesta guardada en Respuestas";});
    if(x.type==="record")return api("/admin/records",{method:"POST",body:{action:"add",collection:d.collection,icon:d.icon,fields:d.fields}}).then(function(){return (d.icon||"📒")+" Anotado en la libreta "+d.collection;});
    return Promise.reject(new Error("Tipo desconocido"));}
  function refresh(){var vis=function(id){var e=document.getElementById(id);return e&&e.firstChild;};try{if(window.CanevaProveedores&&vis("pvBody"))CanevaProveedores.reload();}catch(e){}try{if(window.CanevaMade&&vis("mkBody"))CanevaMade.reload();}catch(e){}try{if(window.CanevaLibretas&&L.el)CanevaLibretas.reload();}catch(e){}}
  function run(i){var x=readCard(i);if(!x)return Promise.resolve();var b=x.el.querySelector("[data-ok]");if(b){b.disabled=true;b.textContent="Guardando…";}
    return exec(x).then(function(m){toast("✓ "+m);x.el.classList.add("done");x.el.querySelector(".ia-act").innerHTML='<span style="color:#8ef0c8;font-weight:700">✓ Registrado</span>';S.acts[i]=null;refresh();})
      .catch(function(e){if(b){b.disabled=false;b.textContent="✓ Registrar";}toast("⚠️ "+e.message);throw e;});}
  function runAll(){var idx=S.acts.map(function(a,i){return a?i:-1;}).filter(function(i){return i>=0;});var p=Promise.resolve();idx.forEach(function(i){p=p.then(function(){return run(i).catch(function(){});});});}

  // ---------- Libretas tab ----------
  var L={el:null,cols:[]};
  function lbPaint(){
    var el=L.el;if(!el)return;
    el.innerHTML='<div class="lb"><div class="lb-hero"><h2>📒 Libretas</h2><p>Todo lo que le pidas anotar a la IA y no tenga su propio módulo: gastos, ideas, citas, pendientes, clientas VIP, telas… cada tema en su libreta.</p><button type="button" data-ianew>✨ Anotar algo con IA</button></div>'+
      (L.cols.length?L.cols.map(function(c){var keys=[];c.items.forEach(function(it){Object.keys(it.fields).forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});});
        var vk=keys.filter(function(k){return /valor|monto|total|precio|costo|gasto/i.test(k);})[0],sum=vk?c.items.reduce(function(a,it){return a+(Number(String(it.fields[vk]).replace(/[^\d]/g,""))||0);},0):0;
        return '<div class="lb-c" data-c="'+esc(c.name)+'"><div class="lb-h"><span style="font-size:22px">'+esc(c.icon||"📒")+'</span><div><b>'+esc(c.name)+'</b><br><small>'+c.items.length+' registro'+(c.items.length===1?'':'s')+'</small></div><div class="r"><button type="button" data-add>✨ Anotar</button><button type="button" data-csv>⬇ Excel</button><button type="button" data-delc>🗑</button></div></div>'+
          (vk?'<div class="lb-sum">Total '+esc(vk.toLowerCase())+': <b>'+money(sum)+'</b></div>':'')+
          '<div class="lb-tw"><table class="lb-t"><thead><tr><th>Fecha</th>'+keys.map(function(k){return '<th>'+esc(k)+'</th>';}).join("")+'<th></th></tr></thead><tbody>'+
          c.items.slice(0,100).map(function(it){return '<tr><td style="white-space:nowrap;color:rgba(246,247,248,.5)">'+esc(new Date(it.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"}))+'</td>'+keys.map(function(k){var v=it.fields[k];return '<td>'+esc(v==null?"":(typeof v==="number"&&/valor|monto|total|precio|costo|gasto/i.test(k)?money(v):v))+'</td>';}).join("")+'<td><button type="button" data-deli="'+esc(it.id)+'" title="Borrar">✕</button></td></tr>';}).join("")+'</tbody></table></div></div>';}).join("")
       :'<div class="lb-empty">Aún no hay libretas. Toca ✨ y escribe por ejemplo: "anota gasto: bolsas 45 mil" o "idea de contenido: reel con el set deportivo".</div>')+'</div>';
  }
  function lbLoad(){if(!L.el)return;api("/admin/records").then(function(d){L.cols=d.collections||[];lbPaint();}).catch(function(e){L.el.innerHTML='<div class="lb-empty">⚠️ '+esc(e.message)+'<br>Pega el Worker v85 en Cloudflare.</div>';});}
  function csv(c){var keys=[];c.items.forEach(function(it){Object.keys(it.fields).forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});});
    var q=function(v){v=String(v==null?"":v);return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    var rows=[["Fecha"].concat(keys).map(q).join(";")].concat(c.items.map(function(it){return [new Date(it.at).toLocaleDateString("es-CO")].concat(keys.map(function(k){return it.fields[k];})).map(q).join(";");}));
    var b=new Blob(["﻿"+rows.join("\n")],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="libreta-"+norm(c.name).replace(/\s+/g,"-")+".csv";document.body.appendChild(a);a.click();a.remove();}
  function lbMount(el){L.el=el;css();
    el.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
      if(b.hasAttribute("data-ianew")){open("");return;}
      var c=b.closest(".lb-c");if(!c)return;var name=c.dataset.c,col=L.cols.filter(function(x){return x.name===name;})[0];
      if(b.hasAttribute("data-add")){open("En la libreta "+name+": ");return;}
      if(b.hasAttribute("data-csv")&&col){csv(col);return;}
      if(b.hasAttribute("data-delc")){ask("¿Seguro que deseas borrar?","Vas a borrar la libreta <b>"+esc(name)+"</b> con todos sus registros. No se puede deshacer.","Sí, borrar libreta").then(function(ok){if(ok)api("/admin/records",{method:"POST",body:{action:"delCollection",collection:name}}).then(function(){toast("🗑 Libreta borrada");lbLoad();});});return;}
      if(b.dataset.deli){ask("¿Seguro que deseas borrar?","Vas a borrar este registro de <b>"+esc(name)+"</b>.","Sí, borrar").then(function(ok){if(ok)api("/admin/records",{method:"POST",body:{action:"delItem",collection:name,id:b.dataset.deli}}).then(function(){toast("🗑 Registro borrado");lbLoad();});});return;}
    });lbLoad();}

  // ---------- floating button on every tab ----------
  function fab(){css();if(document.querySelector(".ia-fab"))return;var b=document.createElement("button");b.type="button";b.className="ia-fab";b.title="Registrar con IA";b.setAttribute("aria-label","Registrar con IA");b.innerHTML="<span>✨</span>";b.onclick=function(){if(!tok()){toast("Primero entra al admin");return;}open("");};document.body.appendChild(b);}
  if(document.readyState!=="loading")fab();else document.addEventListener("DOMContentLoaded",fab);
  window.CanevaIA={open:open};
  window.CanevaLibretas={mount:lbMount,reload:lbLoad};
})();
