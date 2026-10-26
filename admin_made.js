/* CANEVA admin · Bajo pedido (v2)
   Workshop board for made-to-order garments (Deportivo, Atelier, categories with more than 1 day of delivery):
   - list or Kanban view (tap the arrows to move between Pedido / En confección / Lista / Entregada)
   - 7-day delivery strip, progress ring per order (time used vs. promised date), celebration when it is ready
   - measures as quick fields, workshop ticket ("Orden de taller") as an image to send to the seamstress
   - abonos written into the original sale (Ventas / Apartados), so the general report never goes off
   - delete with a confirmation: sale-based orders leave the board (the sale stays in Ventas) and can be restored;
     orders written here are deleted for good
   Mounted by admin_movil.html: CanevaMade.mount(el, {api, token, goPedidos}) */
(function(){
  var S={el:null,o:null,list:[],hidden:[],f:"activos",kind:"Todas",q:"",view:"lista",day:""};
  try{S.view=localStorage.getItem("cv_mk_view")||"lista";}catch(e){}
  var STEPS=["pedido","confeccion","listo","entregado"];
  var ST={pedido:["📝","Pedido","#cfe6ff"],confeccion:["🧵","En confección","#ffe7a8"],listo:["✨","Lista","#8ef0c8"],entregado:["✅","Entregada","#b9b9c4"]};
  var SRC={web:["🌐","Página web"],manual:["💵","Venta manual"],apartado:["⏳","Apartado"],nota:["📝","Anotado aquí"]};
  var MEAS=["Busto","Cintura","Cadera","Largo","Hombro","Manga","Tiro","Estatura"];
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function api(path,opt){opt=opt||{};return fetch(S.o.api+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":S.o.token()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function first(n){var f=String(n||"").trim().split(/\s+/)[0]||"";return f?f.charAt(0).toUpperCase()+f.slice(1).toLowerCase():"";}
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d.length>=11?d:"";}
  function daysTo(iso){return Math.ceil((Date.parse(iso)-Date.now())/864e5);}
  function fdate(iso,long){try{return new Date(iso).toLocaleDateString("es-CO",long?{weekday:"long",day:"numeric",month:"long"}:{day:"numeric",month:"short"});}catch(e){return "";}}
  function dkey(d){var x=new Date(d);return x.getFullYear()+"-"+(x.getMonth()+1)+"-"+x.getDate();}
  function kindIcon(k){return k==="Deportivo"?"🏃‍♀️":k==="Atelier"?"🪡":"🧵";}
  function toast(t){var d=document.createElement("div");d.className="mk-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2600);}
  function find(key){for(var i=0;i<S.list.length;i++)if(S.list[i].key===key)return S.list[i];return null;}

  // ---------- styles ----------
  function css(){if(document.getElementById("mk-css"))return;var s=document.createElement("style");s.id="mk-css";s.textContent=
    ".mk{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".mk-hero{position:relative;overflow:hidden;border-radius:24px;padding:18px;margin:4px 0 12px;background:radial-gradient(500px 240px at 0% 0%,rgba(255,214,102,.18),transparent 60%),radial-gradient(420px 220px at 100% 100%,rgba(201,167,255,.16),transparent 60%),#0c0c0e;border:1px solid rgba(255,214,102,.3)}"+
    ".mk-hero::after{content:'';position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;border:2px dashed rgba(255,214,102,.18);animation:mkSpin 40s linear infinite}@keyframes mkSpin{to{transform:rotate(360deg)}}"+
    ".mk-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px}.mk-hero p{margin:4px 0 12px;font-size:13px;color:rgba(246,247,248,.7);max-width:520px}"+
    ".mk-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;position:relative;z-index:1}@media(max-width:560px){.mk-kpis{grid-template-columns:repeat(2,1fr)}}"+
    ".mk-k{border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.045);border:1px solid rgba(246,247,248,.12);cursor:pointer;transition:transform .15s}.mk-k:active{transform:scale(.97)}.mk-k b{display:block;font-size:22px}.mk-k span{font-size:11px;color:rgba(246,247,248,.6)}.mk-k.warn{border-color:rgba(255,120,100,.55)}.mk-k.warn b{color:#ffb4a8}.mk-k.ok b{color:#8ef0c8}"+
    ".mk-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:12px 0 4px}.mk-dy{border-radius:14px;padding:8px 4px;text-align:center;background:#0e0e10;border:1px solid rgba(246,247,248,.1);cursor:pointer;position:relative}"+
    ".mk-dy small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(246,247,248,.5)}.mk-dy b{display:block;font-size:17px;margin:2px 0}.mk-dy .dots{display:flex;justify-content:center;gap:3px;min-height:7px}.mk-dy .dots i{width:6px;height:6px;border-radius:50%;background:#ffe7a8}"+
    ".mk-dy.today{border-color:#ffe7a8}.mk-dy.on{background:#f6f7f8;color:#050505}.mk-dy.on small{color:#555}.mk-dy.late .dots i{background:#ff8f80}"+
    ".mk-tools{display:flex;gap:8px;align-items:center;margin:10px 0 6px}.mk-tools input{flex:1;min-width:0;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:10px 12px;font:14px Inter,sans-serif}"+
    ".mk-vw{display:flex;border:1px solid rgba(246,247,248,.2);border-radius:12px;overflow:hidden}.mk-vw button{border:0;background:none;color:#f6f7f8;padding:9px 11px;font:600 12px Inter,sans-serif;cursor:pointer}.mk-vw button.on{background:#f6f7f8;color:#050505}"+
    ".mk-bar{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}.mk-bar::-webkit-scrollbar{display:none}.mk-bar button{flex:0 0 auto;border:1px solid rgba(246,247,248,.18);background:#121214;color:#f6f7f8;border-radius:999px;padding:8px 12px;font:600 12px Inter,sans-serif;cursor:pointer}.mk-bar button.on{background:#f6f7f8;color:#050505}"+
    ".mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}"+
    ".mk-kan{display:grid;grid-template-columns:repeat(4,minmax(270px,1fr));gap:10px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory}.mk-col{scroll-snap-align:start;border-radius:18px;background:rgba(255,255,255,.025);border:1px solid rgba(246,247,248,.08);padding:8px;min-height:120px}"+
    ".mk-colh{display:flex;align-items:center;gap:6px;padding:6px 6px 10px;font-weight:700;font-size:13px}.mk-colh span{margin-left:auto;font-size:11px;border-radius:999px;padding:2px 8px;background:rgba(255,255,255,.08)}.mk-col .mk-c{margin-bottom:8px}"+
    ".mk-c{position:relative;border-radius:20px;padding:14px;background:linear-gradient(180deg,#111114,#0b0b0d);border:1px solid rgba(246,247,248,.12);box-shadow:0 10px 30px rgba(0,0,0,.25);animation:mkIn .3s ease both}@keyframes mkIn{from{opacity:0;transform:translateY(8px)}}"+
    ".mk-c::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--st,#cfe6ff)}"+
    ".mk-c.late{border-color:rgba(255,120,100,.55)}.mk-c.done{opacity:.72}.mk-c.compact .mk-meas{grid-template-columns:repeat(2,1fr)}"+
    ".mk-h{display:flex;align-items:center;gap:10px}.mk-ring{flex:0 0 46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:18px;background:conic-gradient(var(--rc,#ffe7a8) calc(var(--p,0)*1%),rgba(255,255,255,.08) 0)}.mk-ring i{width:36px;height:36px;border-radius:50%;background:#0e0e10;display:grid;place-items:center;font-style:normal}"+
    ".mk-who{flex:1;min-width:0}.mk-who b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mk-who a{font-size:12px}.mk-h .r{text-align:right;font-size:11px;color:rgba(246,247,248,.55)}"+
    ".mk-x{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;border:1px solid rgba(246,247,248,.15);background:rgba(0,0,0,.4);color:rgba(246,247,248,.65);font-size:13px;cursor:pointer;display:grid;place-items:center}.mk-x:hover{color:#ffb4a8;border-color:rgba(255,120,100,.6)}"+
    ".mk-h .r{margin-right:30px}"+
    ".mk-tags{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 6px}.mk-t{font-size:10.5px;border-radius:999px;padding:3px 8px;background:rgba(255,255,255,.07);border:1px solid rgba(246,247,248,.14)}.mk-t.k{background:rgba(255,214,102,.12);border-color:rgba(255,214,102,.4);color:#ffe7a8}.mk-t.bad{background:rgba(255,120,100,.12);border-color:rgba(255,120,100,.5);color:#ffb4a8}"+
    ".mk-it{font-size:13.5px;line-height:1.5;margin:4px 0}.mk-it small{color:rgba(246,247,248,.55)}"+
    ".mk-prog{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:8px}.mk-prog i{display:block;height:100%;background:linear-gradient(90deg,#8ef0c8,#cfe6ff,#d9c9ff);transition:width .5s}"+
    ".mk-mrow{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:5px;color:rgba(246,247,248,.7)}.mk-mrow b{color:#fff}.mk-mrow .owe{color:#ffb4a8}"+
    ".mk-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0 6px}.mk-steps button{border:1px solid rgba(246,247,248,.15);background:#121214;color:rgba(246,247,248,.7);border-radius:10px;padding:7px 2px;font:600 10.5px Inter,sans-serif;cursor:pointer}"+
    ".mk-steps button.on{background:var(--st,#f6f7f8);color:#050505;border-color:transparent}.mk-steps button.past{color:#8ef0c8;border-color:rgba(142,240,200,.35)}"+
    ".mk-move{display:flex;gap:6px;margin-top:8px}.mk-move button{flex:1;border:1px solid rgba(246,247,248,.18);background:#121214;color:#f6f7f8;border-radius:10px;padding:8px;font:700 11.5px Inter,sans-serif;cursor:pointer}.mk-move button:disabled{opacity:.3}"+
    ".mk-due{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;margin:6px 0}.mk-due input{background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:8px;color:#fff;padding:5px 7px;font:12px Inter,sans-serif}"+
    ".mk-meas{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.mk-meas label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:rgba(246,247,248,.5)}.mk-meas input{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.16);border-radius:8px;color:#fff;padding:6px;font:13px Inter,sans-serif;margin-top:2px}"+
    ".mk-c textarea{width:100%;box-sizing:border-box;min-height:46px;background:#050505;border:1px solid rgba(246,247,248,.16);border-radius:10px;color:#fff;padding:8px 10px;font:13px/1.4 Inter,sans-serif;resize:vertical;margin-top:8px}"+
    ".mk-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.mk-act button,.mk-act a{border:0;border-radius:999px;padding:8px 12px;font:700 11.5px Inter,sans-serif;cursor:pointer;background:#f6f7f8;color:#050505;text-decoration:none}"+
    ".mk-act .wa,.mk-act a.wa.cvw-a{background:#25d366!important;color:#04140a!important}.mk-act a.wa .cvw-ic svg path:first-child{fill:#04140a}.mk-act .gh{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.25)}.mk-act .gold{background:linear-gradient(120deg,#ffe7a8,#fff 45%,#f3dca0)}"+
    ".mk-pay{display:none;gap:6px;margin-top:8px}.mk-pay.on{display:flex}.mk-pay input,.mk-pay select{flex:1;min-width:0;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:8px;font:13px Inter,sans-serif}"+
    ".mk-more summary{cursor:pointer;font-size:12px;color:rgba(246,247,248,.65);margin-top:8px;list-style:none}.mk-more summary::-webkit-details-marker{display:none}"+
    ".mk-new{border-radius:20px;padding:14px;margin:14px 0;background:#0e0e10;border:1px dashed rgba(255,214,102,.45)}.mk-new h3,.mk-hid h3{margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,247,248,.6)}"+
    ".mk-f{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mk-f input,.mk-f select,.mk-f textarea{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:10px;color:#fff;padding:9px 10px;font:13.5px Inter,sans-serif}.mk-f .w{grid-column:1/-1}"+
    ".mk-hid{border-radius:18px;padding:12px 14px;margin:12px 0;background:#0b0b0d;border:1px solid rgba(246,247,248,.1)}.mk-hid div{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:6px 0;border-top:1px solid rgba(255,255,255,.05)}.mk-hid button{margin-left:auto;border:1px solid rgba(246,247,248,.25);background:none;color:#f6f7f8;border-radius:999px;padding:5px 10px;font-size:11px;cursor:pointer}"+
    ".mk-note{font-size:11.5px;color:rgba(246,247,248,.55);line-height:1.5;margin-top:6px}.mk-empty{padding:30px 10px;text-align:center;color:rgba(246,247,248,.6)}"+
    ".mk-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#f6f7f8;color:#050505;border-radius:999px;padding:10px 16px;font:600 13px Inter,sans-serif;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.5)}"+
    ".mk-ov{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:mkFade .2s}@keyframes mkFade{from{opacity:0}}"+
    ".mk-dlg{width:min(400px,100%);border-radius:22px;padding:20px;background:linear-gradient(180deg,#141416,#0a0a0b);border:1px solid rgba(255,120,100,.45);box-shadow:0 30px 80px rgba(0,0,0,.6);text-align:center;color:#f6f7f8;font-family:Inter,sans-serif;animation:mkPop .25s cubic-bezier(.2,.9,.3,1.3)}@keyframes mkPop{from{transform:scale(.9);opacity:0}}"+
    ".mk-dlg .ic{font-size:40px}.mk-dlg h3{margin:6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:26px}.mk-dlg p{font-size:13px;line-height:1.5;color:rgba(246,247,248,.75);margin:0 0 14px}"+
    ".mk-dlg .row{display:flex;gap:8px}.mk-dlg button{flex:1;border:0;border-radius:999px;padding:12px;font:800 13px Inter,sans-serif;cursor:pointer}.mk-dlg .no{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.3)}.mk-dlg .yes{background:#ff6b5e;color:#fff}"+
    ".mk-conf{position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden}.mk-conf i{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;animation:mkFall 1.8s ease-in forwards}@keyframes mkFall{to{transform:translateY(110vh) rotate(720deg);opacity:.2}}";
    document.head.appendChild(s);}

  // ---------- helpers ----------
  function visible(){
    var q=S.q.toLowerCase();
    return S.list.filter(function(x){
      if(S.day){if(x.status==="entregado"||dkey(x.dueAt)!==S.day)return false;}
      else{
        if(S.f==="activos"&&x.status==="entregado"&&S.view!=="tablero")return false;
        if(S.f==="entregados"&&x.status!=="entregado")return false;
        if(ST[S.f]&&x.status!==S.f)return false;
        if(S.f==="saldo"&&!(x.balance>0))return false;
        if(S.f==="tarde"&&!(x.status!=="entregado"&&daysTo(x.dueAt)<0))return false;
      }
      if(S.kind!=="Todas"&&!x.items.some(function(i){return i.kind===S.kind;}))return false;
      if(q&&(x.name+" "+x.phone+" "+x.ticket+" "+x.items.map(function(i){return i.nombre;}).join(" ")).toLowerCase().indexOf(q)<0)return false;
      return true;});
  }
  function kinds(){var k={};S.list.forEach(function(x){x.items.forEach(function(i){k[i.kind]=1;});});return ["Todas"].concat(Object.keys(k));}
  // measures text "Busto: 88 · Cintura: 66" <-> fields
  function parseMeas(t){var o={},rest=[];String(t||"").split(/\s*[·\n;]\s*/).forEach(function(p){var m=p.match(/^([^:]+):\s*(.+)$/);if(m&&MEAS.indexOf(m[1].trim())>=0)o[m[1].trim()]=m[2].trim();else if(p.trim())rest.push(p.trim());});o._rest=rest.join(" · ");return o;}
  function joinMeas(c){var parts=[];MEAS.forEach(function(k){var i=c.querySelector('[data-m="'+k+'"]');if(i&&i.value.trim())parts.push(k+": "+i.value.trim());});var r=c.querySelector("[data-mrest]");if(r&&r.value.trim())parts.push(r.value.trim());return parts.join(" · ");}
  function timePct(x){var a=Date.parse(x.createdAt)||Date.now(),b=Date.parse(x.dueAt)||a+1;if(x.status==="entregado")return 100;return Math.max(3,Math.min(100,Math.round((Date.now()-a)/(b-a)*100)));}

  // ---------- render ----------
  function paint(){
    var act=S.list.filter(function(x){return x.status!=="entregado";});
    var conf=act.filter(function(x){return x.status==="confeccion"||x.status==="pedido";}).length,ready=act.filter(function(x){return x.status==="listo";}).length;
    var owe=S.list.reduce(function(a,x){return a+(x.balance||0);},0),late=act.filter(function(x){return daysTo(x.dueAt)<0;}).length;
    var F=[["activos","Activos"],["pedido","📝 Pedido"],["confeccion","🧵 En confección"],["listo","✨ Listas"],["saldo","💰 Con saldo"],["tarde","⚠ Atrasados"],["entregados","✅ Entregados"]];
    var wk="",t0=new Date();t0.setHours(0,0,0,0);
    for(var i=0;i<7;i++){var d=new Date(t0.getTime()+i*864e5),k=dkey(d),n=act.filter(function(x){return dkey(x.dueAt)===k;}).length,lt=i===0&&late>0;
      wk+='<div class="mk-dy'+(i===0?' today':'')+(S.day===k?' on':'')+(lt?' late':'')+'" data-day="'+k+'"><small>'+(i===0?'Hoy':d.toLocaleDateString("es-CO",{weekday:"short"}).replace(".",""))+'</small><b>'+d.getDate()+'</b><div class="dots">'+new Array(Math.min(n,4)+1).join('<i></i>')+'</div></div>';}
    S.el.innerHTML='<div class="mk"><div class="mk-hero"><h2>🧵 Taller CΛNEVΛ</h2><p>Deportivo, Atelier y todo lo que se confecciona: abonos, saldo, medidas, estado y fecha de entrega en un solo lugar.</p>'+
      '<div class="mk-kpis"><div class="mk-k" data-kf="pedido"><b>'+conf+'</b><span>🧵 Por confeccionar</span></div><div class="mk-k ok" data-kf="listo"><b>'+ready+'</b><span>✨ Listas para entregar</span></div><div class="mk-k" data-kf="saldo"><b>'+money(owe)+'</b><span>💰 Saldo por cobrar</span></div><div class="mk-k'+(late?' warn':'')+'" data-kf="tarde"><b>'+late+'</b><span>⚠ Atrasados</span></div></div>'+
      '<div class="mk-week">'+wk+'</div></div>'+
      '<div class="mk-tools"><input id="mkQ" placeholder="🔎 Clienta, prenda o recibo" value="'+esc(S.q)+'"><div class="mk-vw"><button type="button" data-vw="lista"'+(S.view==="lista"?' class="on"':'')+'>☰ Lista</button><button type="button" data-vw="tablero"'+(S.view==="tablero"?' class="on"':'')+'>▦ Tablero</button></div></div>'+
      (S.view==="lista"?'<div class="mk-bar">'+F.map(function(f){return '<button type="button" data-f="'+f[0]+'"'+(S.f===f[0]&&!S.day?' class="on"':'')+'>'+f[1]+'</button>';}).join("")+'</div>':'')+
      '<div class="mk-bar">'+kinds().map(function(k){return '<button type="button" data-k="'+esc(k)+'"'+(S.kind===k?' class="on"':'')+'>'+(k==="Todas"?"":kindIcon(k)+" ")+esc(k)+'</button>';}).join("")+'</div>'+
      (S.day?'<div class="mk-note" style="margin:0 0 8px">📅 Entregas del '+esc(fdate((function(k){var p=k.split("-");return new Date(+p[0],+p[1]-1,+p[2]).toISOString();})(S.day),true))+' · <a href="#" data-clearday style="color:#ffe7a8">ver todo</a></div>':'')+
      '<div id="mkG"></div>'+
      '<div class="mk-new"><h3>➕ Anotar un pedido</h3><div class="mk-f">'+
        '<input id="nkN" placeholder="Clienta *"><input id="nkP" type="tel" inputmode="tel" placeholder="Celular">'+
        '<input id="nkR" class="w" placeholder="Prenda * (ej: Vestido atelier satín negro)">'+
        '<select id="nkK"><option>Atelier</option><option>Deportivo</option><option>Bajo pedido</option></select><input id="nkS" placeholder="Talla">'+
        '<input id="nkT" type="number" inputmode="numeric" placeholder="Valor total"><input id="nkD" type="number" inputmode="numeric" placeholder="Abono inicial">'+
        '<input id="nkE" type="date" class="w" title="Fecha de entrega">'+
        '<textarea id="nkM" class="w" placeholder="Medidas (busto, cintura, cadera, largo…)"></textarea>'+
        '<button type="button" id="nkGo" class="w" style="border:0;border-radius:999px;padding:12px;font:800 13px Inter,sans-serif;background:linear-gradient(120deg,#ffe7a8,#fff 45%,#f3dca0);color:#050505;cursor:pointer">Guardar pedido</button></div>'+
        '<div class="mk-note">Para lo que tomaste por WhatsApp y no registraste. Para que cuente en tus ventas y ganancias, regístralo también en 💵 Ventas (venta manual con abono): ahí aparece aquí solo.</div></div>'+
      (S.hidden.length?'<div class="mk-hid"><h3>🗂 Quitados del tablero ('+S.hidden.length+')</h3>'+S.hidden.slice(0,20).map(function(h){return '<div>'+(SRC[h.src]||[""])[0]+' <b>'+esc(h.name||"Sin nombre")+'</b> · '+esc((h.items[0]||{}).nombre||"")+'<button type="button" data-restore="'+esc(h.key)+'">↩ Restaurar</button></div>';}).join("")+'</div>':'')+
      '</div>';
    grid();bind();
  }
  function card(x,compact){
    var tot=x.total||0,pct=tot?Math.min(100,Math.round(x.paid/tot*100)):0,d=daysTo(x.dueAt),late=x.status!=="entregado"&&d<0;
    var idx=STEPS.indexOf(x.status),st=ST[x.status]||ST.pedido,src=SRC[x.src]||["",""],k=waNum(x.phone),tp=timePct(x);
    var it0=x.items[0]?x.items[0].nombre:"prenda",m=parseMeas(x.measures);
    var readyTxt="Hola "+first(x.name)+" ✨ ¡Tu "+it0+" CΛNEVΛ ya está lista! 💎"+(x.balance>0?" Te queda un saldo de "+money(x.balance)+".":"")+" ¿Coordinamos la entrega? 🖤";
    var progTxt="Hola "+first(x.name)+" 💎 Te cuento que tu "+it0+" ya está en confección 🧵 La tendrás lista para el "+fdate(x.dueAt)+". ¡Va a quedar divina! ✨";
    var thanksTxt="¡Gracias "+first(x.name)+"! 🖤 Esperamos que disfrutes muchísimo tu "+it0+" CΛNEVΛ. Nos encantaría verte con ella: etiquétanos en @caneva.col ✨💎";
    var msg=x.status==="listo"?["💬 Avisar que está lista",readyTxt]:x.status==="entregado"?["💬 Dar las gracias",thanksTxt]:["💬 Contarle cómo va",progTxt];
    return '<div class="mk-c'+(late?' late':'')+(x.status==="entregado"?' done':'')+(compact?' compact':'')+'" data-key="'+esc(x.key)+'" style="--st:'+st[2]+'">'+
      '<button type="button" class="mk-x" data-del title="Eliminar">✕</button>'+
      '<div class="mk-h"><div class="mk-ring" style="--p:'+tp+';--rc:'+(late?'#ff8f80':st[2])+'" title="Tiempo usado hasta la entrega"><i>'+kindIcon((x.items[0]||{}).kind)+'</i></div>'+
        '<div class="mk-who"><b>'+esc(x.name||"Sin nombre")+'</b>'+(x.phone?'<a href="https://wa.me/'+k+'" target="_blank" rel="noopener" data-name="'+esc(x.name)+'">'+esc(x.phone)+'</a>':'')+'</div>'+
        '<div class="r">'+(x.ticket?esc(x.ticket)+'<br>':'')+esc(fdate(x.createdAt))+'</div></div>'+
      '<div class="mk-tags">'+x.items.map(function(i){return '<span class="mk-t k">'+kindIcon(i.kind)+' '+esc(i.kind)+'</span>';}).filter(function(v,i,a){return a.indexOf(v)===i;}).join("")+
        '<span class="mk-t">'+src[0]+' '+src[1]+'</span>'+(x.unpaidOrder?'<span class="mk-t bad">Pedido sin pagar</span>':'')+(x.src==="nota"?'<span class="mk-t bad">No está en Ventas</span>':'')+(x.more>0?'<span class="mk-t">+'+x.more+' de stock</span>':'')+'</div>'+
      '<div class="mk-it">'+x.items.map(function(i){return '• '+esc(i.nombre)+' <small>'+(i.size?'Talla '+esc(i.size)+' · ':'')+'x'+(i.qty||1)+'</small>';}).join('<br>')+'</div>'+
      '<div class="mk-prog"><i style="width:'+pct+'%"></i></div><div class="mk-mrow"><span>Abonado <b>'+money(x.paid)+'</b> de '+money(tot)+'</span>'+(x.balance>0?'<span class="owe">Saldo <b>'+money(x.balance)+'</b></span>':'<span style="color:#8ef0c8">✓ Pagado</span>')+'</div>'+
      (compact?'<div class="mk-move"><button type="button" data-mv="-1"'+(idx<=0?' disabled':'')+'>← '+(idx>0?ST[STEPS[idx-1]][1]:'')+'</button><button type="button" data-mv="1"'+(idx>=3?' disabled':'')+'>'+(idx<3?ST[STEPS[idx+1]][1]:'')+' →</button></div>'
        :'<div class="mk-steps">'+STEPS.map(function(s,i){return '<button type="button" data-st="'+s+'"'+(i===idx?' class="on"':i<idx?' class="past"':'')+'>'+ST[s][0]+' '+ST[s][1]+'</button>';}).join("")+'</div>')+
      '<div class="mk-due">📅 <input type="date" data-due value="'+esc(String(x.dueAt||"").slice(0,10))+'"> <span style="color:'+(late?'#ffb4a8':d<=2?'#ffe7a8':'rgba(246,247,248,.6)')+'">'+(x.status==="entregado"?"entregada":late?"⚠ atrasado "+Math.abs(d)+" día"+(Math.abs(d)===1?"":"s"):d===0?"🔔 es hoy":d===1?"mañana":"en "+d+" días")+'</span></div>'+
      '<details class="mk-more"'+(compact?'':' open')+'><summary>📏 Medidas y notas</summary>'+
        '<div class="mk-meas">'+MEAS.map(function(k2){return '<div><label>'+k2+'</label><input data-m="'+k2+'" inputmode="decimal" value="'+esc(m[k2]||"")+'"></div>';}).join("")+'</div>'+
        '<textarea data-mrest placeholder="Otras medidas o indicaciones">'+esc(m._rest||"")+'</textarea>'+
        '<textarea data-nt placeholder="Notas de confección (tela, color, detalles)">'+esc(x.notes||"")+'</textarea></details>'+
      '<div class="mk-act">'+(k?'<a class="wa" target="_blank" rel="noopener" data-direct="1" href="https://wa.me/'+k+'?text='+encodeURIComponent(msg[1])+'">'+msg[0]+'</a>':'')+
        '<button type="button" class="gold" data-ticket>🧾 Orden de taller</button>'+
        (x.balance>0&&x.src!=="web"?'<button type="button" class="gh" data-paybtn>💰 Abono</button>':'')+
        (x.unpaidOrder?'<button type="button" class="gh" data-goped>Ver en Pedidos</button>':'')+'</div>'+
      '<div class="mk-pay"><input type="number" inputmode="numeric" placeholder="Abono $" data-amt><select data-pm><option value="efectivo">Efectivo</option><option value="breb">Bre-B</option><option value="transferencia">Transferencia</option><option value="nequi">Nequi</option><option value="datafono">Datáfono</option></select><button type="button" data-paygo style="border:0;border-radius:10px;padding:0 12px;font-weight:800;background:#8ef0c8;color:#04140a">OK</button></div>'+
    '</div>';
  }
  function grid(){
    var L=visible(),g=S.el.querySelector("#mkG");
    if(!L.length){g.innerHTML='<div class="mk-empty">'+(S.list.length?"No hay pedidos con este filtro.":"🪡 Aún no hay prendas bajo pedido.<br>Aparecen solas cuando vendes algo Deportivo o Atelier (en la página, en 💵 Ventas o en ⏳ Apartados), o anótala abajo.")+'</div>';return;}
    if(S.view==="tablero"){
      g.innerHTML='<div class="mk-kan">'+STEPS.map(function(s){var col=L.filter(function(x){return x.status===s;});
        return '<div class="mk-col"><div class="mk-colh" style="color:'+ST[s][2]+'">'+ST[s][0]+' '+ST[s][1]+'<span>'+col.length+'</span></div>'+col.map(function(x){return card(x,true);}).join("")+'</div>';}).join("")+'</div>';
    }else g.innerHTML='<div class="mk-grid">'+L.map(function(x){return card(x,false);}).join("")+'</div>';
  }

  // ---------- actions ----------
  function confetti(){var c=document.createElement("div");c.className="mk-conf";var col=["#ffe7a8","#cfe6ff","#d9c9ff","#8ef0c8","#ffffff"];
    for(var i=0;i<70;i++){var p=document.createElement("i");p.style.left=Math.random()*100+"%";p.style.background=col[i%col.length];p.style.animationDelay=(Math.random()*.5)+"s";p.style.transform="rotate("+Math.random()*360+"deg)";c.appendChild(p);}
    document.body.appendChild(c);setTimeout(function(){c.remove();},2600);try{if(navigator.vibrate)navigator.vibrate([30,40,30]);}catch(e){}}
  function upd(key,patch,msg){return api("/admin/made/update",{method:"POST",body:Object.assign({key:key},patch)}).then(function(d){var x=find(key);if(x&&d.state){if(d.state.status)x.status=d.state.status;if(d.state.dueAt)x.dueAt=d.state.dueAt;if(d.state.notes!==undefined)x.notes=d.state.notes;if(d.state.measures!==undefined)x.measures=d.state.measures;}if(msg)toast(msg);return d;}).catch(function(e){toast("⚠️ "+e.message);throw e;});}
  function setStatus(key,s){upd(key,{status:s},ST[s][0]+" "+ST[s][1]).then(function(){if(s==="listo"||s==="entregado")confetti();paint();}).catch(function(){});}
  function ask(o){ // styled "¿Seguro?" dialog
    return new Promise(function(res){var ov=document.createElement("div");ov.className="mk-ov";
      ov.innerHTML='<div class="mk-dlg" role="alertdialog"><div class="ic">'+(o.icon||"🗑")+'</div><h3>'+esc(o.title)+'</h3><p>'+o.text+'</p><div class="row"><button type="button" class="no">Cancelar</button><button type="button" class="yes">'+esc(o.ok||"Sí, borrar")+'</button></div></div>';
      document.body.appendChild(ov);var done=function(v){ov.remove();res(v);};
      ov.querySelector(".no").onclick=function(){done(false);};ov.querySelector(".yes").onclick=function(){done(true);};ov.onclick=function(e){if(e.target===ov)done(false);};});
  }
  function del(x){
    var nota=x.src==="nota",what=(x.items[0]||{}).nombre||"este pedido";
    ask({title:"¿Seguro que deseas borrar?",text:nota?"Vas a borrar <b>"+esc(what)+"</b> de <b>"+esc(x.name||"la clienta")+"</b> y sus abonos anotados aquí. <b>No se puede deshacer.</b>":"Vas a quitar <b>"+esc(what)+"</b> de <b>"+esc(x.name||"la clienta")+"</b> del tablero. La venta <b>sigue en 💵 Ventas</b> y sus pagos no cambian. Puedes restaurarlo abajo cuando quieras.",ok:nota?"Sí, borrar":"Sí, quitar del tablero"})
    .then(function(ok){if(!ok)return;
      (nota?api("/admin/made/note",{method:"POST",body:{delete:true,id:x.id}}):upd(x.key,{hidden:true})).then(function(){toast(nota?"🗑 Pedido borrado":"🗂 Quitado del tablero");load();}).catch(function(e){toast("⚠️ "+e.message);});});
  }
  // workshop ticket as an image (to send to the seamstress)
  function ticket(x){
    var W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;var g=c.getContext("2d");
    var bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#0d0d10");bg.addColorStop(1,"#030304");g.fillStyle=bg;g.fillRect(0,0,W,H);
    g.strokeStyle="rgba(255,231,168,.55)";g.lineWidth=3;g.strokeRect(36,36,W-72,H-72);
    g.fillStyle="#f6f7f8";g.textAlign="left";g.font="300 64px 'Cormorant Garamond',Georgia,serif";g.fillText("C Λ N E V Λ",80,140);
    g.fillStyle="#ffe7a8";g.font="600 26px Montserrat,Inter,sans-serif";g.fillText("ORDEN DE TALLER"+(x.ticket?" · "+x.ticket:""),80,190);
    var y=270,line=function(lb,val,big){g.fillStyle="rgba(246,247,248,.55)";g.font="600 22px Inter,sans-serif";g.fillText(lb.toUpperCase(),80,y);y+=big?58:46;g.fillStyle="#fff";g.font=(big?"500 46px":"400 34px")+" Inter,sans-serif";wrap(String(val||"—"),80,y-(big?10:6),W-160,big?52:42);y+=24;};
    function wrap(t,x0,y0,mw,lh){var w=t.split(" "),l="";for(var i=0;i<w.length;i++){var tt=l+w[i]+" ";if(g.measureText(tt).width>mw&&l){g.fillText(l,x0,y0);l=w[i]+" ";y0+=lh;y+=lh;}else l=tt;}g.fillText(l,x0,y0);}
    line("Clienta",x.name||"",true);
    line("Prenda",x.items.map(function(i){return i.nombre+(i.size?" · Talla "+i.size:"")+((i.qty||1)>1?" · x"+i.qty:"");}).join("  |  "),true);
    line("Tipo",x.items.map(function(i){return i.kind;}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(", "));
    line("Entrega",fdate(x.dueAt,true));
    line("Medidas",x.measures||"Sin medidas");
    line("Notas",x.notes||"—");
    g.fillStyle="rgba(246,247,248,.4)";g.font="400 22px Inter,sans-serif";g.fillText("Generado en Caneva Admin · "+new Date().toLocaleDateString("es-CO"),80,H-80);
    c.toBlob(function(b){var f=new File([b],"orden-taller-"+String(x.name||"clienta").split(" ")[0].toLowerCase()+".png",{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:"Orden de taller CΛNEVΛ"}).catch(function(){});return;}
      var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();toast("🧾 Orden de taller descargada");},"image/png");
  }

  // ---------- events ----------
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
      var a=e.target.closest("[data-clearday]");if(a){e.preventDefault();S.day="";paint();return;}
      var dy=e.target.closest("[data-day]");if(dy&&el.contains(dy)){S.day=S.day===dy.dataset.day?"":dy.dataset.day;paint();return;}
      var kf=e.target.closest("[data-kf]");if(kf){S.f=kf.dataset.kf;S.day="";S.view="lista";paint();return;}
      var b=e.target.closest("button");if(!b||!el.contains(b))return;
      if(b.dataset.f){S.f=b.dataset.f;S.day="";paint();return;}
      if(b.dataset.k){S.kind=b.dataset.k;paint();return;}
      if(b.dataset.vw){S.view=b.dataset.vw;try{localStorage.setItem("cv_mk_view",S.view);}catch(x){}paint();return;}
      if(b.dataset.restore){upd(b.dataset.restore,{hidden:false},"↩ Restaurado").then(load).catch(function(){});return;}
      var c=b.closest(".mk-c");if(!c)return;var key=c.dataset.key,x=find(key);if(!x)return;
      if(b.hasAttribute("data-del")){del(x);return;}
      if(b.dataset.st){setStatus(key,b.dataset.st);return;}
      if(b.dataset.mv){var i=STEPS.indexOf(x.status)+Number(b.dataset.mv);if(i>=0&&i<4)setStatus(key,STEPS[i]);return;}
      if(b.hasAttribute("data-ticket")){ticket(x);return;}
      if(b.hasAttribute("data-paybtn")){c.querySelector(".mk-pay").classList.toggle("on");var inp=c.querySelector("[data-amt]");inp.value=x.balance||"";inp.focus();return;}
      if(b.hasAttribute("data-paygo")){
        var amt=parseInt(c.querySelector("[data-amt]").value,10)||0,pm=c.querySelector("[data-pm]").value;if(amt<=0){toast("Escribe el valor del abono");return;}
        var path=x.src==="manual"?"/admin/sales/manual/"+x.id+"/pay":x.src==="apartado"?"/admin/layaways/"+x.id+"/pay":"/admin/made/note",body=x.src==="nota"?{pay:true,id:x.id,amount:amt,payMethod:pm}:{amount:amt,pay:pm};
        b.disabled=true;api(path,{method:"POST",body:body}).then(function(){toast("💰 Abono de "+money(amt)+" registrado");if(amt>=x.balance)confetti();load();}).catch(function(err){b.disabled=false;toast("⚠️ "+err.message);});return;}
      if(b.hasAttribute("data-goped")&&S.o.goPedidos){S.o.goPedidos();return;}
    });
    el.addEventListener("change",function(e){var t=e.target,c=t.closest&&t.closest(".mk-c");if(!c)return;
      if(t.hasAttribute("data-due")&&t.value){upd(c.dataset.key,{dueAt:t.value+"T12:00:00Z"},"📅 Fecha de entrega guardada").then(function(){paint();}).catch(function(){});return;}
      if(t.hasAttribute("data-m")||t.hasAttribute("data-mrest")){upd(c.dataset.key,{measures:joinMeas(c)},"📏 Medidas guardadas").catch(function(){});return;}
      if(t.hasAttribute("data-nt"))upd(c.dataset.key,{notes:t.value},"📝 Notas guardadas").catch(function(){});});
  }
  function load(){if(!S.el)return;if(!S.list.length)S.el.innerHTML='<div class="mk-empty">🧵 Cargando el taller…</div>';
    api("/admin/made").then(function(d){S.list=d.list||[];S.hidden=d.hidden||[];paint();}).catch(function(e){S.el.innerHTML='<div class="mk-empty">⚠️ '+esc(e.message)+'<br><br>Si dice que falta actualizar, pega el Worker v83 en Cloudflare.</div>';});}
  window.CanevaMade={mount:function(el,o){S.el=el;S.o=o;css();bindOnce();load();},reload:load};
})();
