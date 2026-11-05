/* CANEVA admin · Aviso personalizado (v1)
   Inside the "Avisos a tu celular" card (Hoy): write a title + message, choose which Caneva Admin phones get it and
   which tab opens when they tap it, and send it as a real notification (Web Push, POST /admin/push/custom).
   Wraps hoyNotifyCard() from admin_movil.html, so it shows up every time that card is painted. */
(function(){
  var TPL=[
    ["🛍 Revisen pedidos","Hay pedidos esperando: revisen la pestaña Pedidos y escríbanles 💎","pedidos"],
    ["📦 Despachar hoy","Hoy hay que despachar los pedidos pagados. ¡Que salgan antes de las 4 pm! 🚚","pedidos"],
    ["📸 Historias de hoy","Suban las historias del día: en 🎬 Historias están listas en un toque ✨","historias"],
    ["⏰ Reunión","Reunión de equipo hoy. Traigan el inventario al día 📋","hoy"]
  ];
  var S={dev:null,open:false,sending:false,t:"",b:"",tab:"",off:{},gem:true};
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function api(path,opt){opt=opt||{};var tk="";try{tk=typeof token==="function"?token():"";}catch(e){}
    return fetch(API_BASE+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":tk},body:opt.body?JSON.stringify(opt.body):undefined})
      .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function tabs(){var out=[];document.querySelectorAll("#tabs button[data-tab]").forEach(function(b){out.push([b.dataset.tab,b.textContent.replace(/\d+$/,"").trim()]);});return out.length?out:[["hoy","✨ Hoy"],["pedidos","📦 Pedidos"]];}
  function css(){if(document.getElementById("cpu-css"))return;var s=document.createElement("style");s.id="cpu-css";s.textContent=
    ".cpu-open{margin-top:10px;width:100%;border:1px solid rgba(246,247,248,.25);border-radius:999px;padding:11px;background:rgba(255,255,255,.05);color:#f6f7f8;font:700 13px Inter,sans-serif;cursor:pointer}"+
    ".cpu{margin-top:12px;padding:12px;border-radius:14px;background:rgba(0,0,0,.35);border:1px solid rgba(246,247,248,.14)}"+
    ".cpu label{display:block;font-size:11px;opacity:.7;margin:10px 0 4px}.cpu input[type=text],.cpu textarea,.cpu select{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.22);border-radius:12px;color:#f6f7f8;padding:10px 12px;font:14px Inter,sans-serif}"+
    ".cpu textarea{min-height:64px;resize:vertical}.cpu .tp{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.cpu .tp button{flex:0 0 auto;border:1px solid rgba(246,247,248,.2);background:transparent;color:#f6f7f8;border-radius:999px;padding:6px 10px;font:600 12px Inter,sans-serif;cursor:pointer}"+
    ".cpu .dv{display:flex;flex-wrap:wrap;gap:6px}.cpu .dv label{display:flex;align-items:center;gap:6px;margin:0;opacity:1;font-size:12px;border:1px solid rgba(246,247,248,.2);border-radius:999px;padding:6px 10px;cursor:pointer}"+
    ".cpu .st{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;opacity:.85}"+
    ".cpu .go{width:100%;margin-top:12px;border:0;border-radius:999px;padding:12px;background:linear-gradient(120deg,#cfd6db,#ffffff 45%,#e8eef2 60%,#c3ccd2);color:#050505;font:800 14px Inter,sans-serif;cursor:pointer}.cpu .go[disabled]{opacity:.5}"+
    ".cpu .rs{font-size:12px;margin-top:8px;line-height:1.6}";
    document.head.appendChild(s);}
  function form(){
    var devs=S.dev||[];
    return '<div class="cpu" id="cpuBox"><b style="font-size:14px">✍️ Aviso personalizado</b><div style="font-size:12px;opacity:.7;margin-top:2px">Le llega como notificación a los celulares que tienen Caneva Admin.</div>'+
      '<label>Ideas rápidas</label><div class="tp">'+TPL.map(function(t,i){return '<button type="button" data-tpl="'+i+'">'+esc(t[0])+'</button>';}).join("")+'</div>'+
      '<label>Título</label><input type="text" id="cpuT" maxlength="80" placeholder="Ej: Hay pedidos por despachar" value="'+esc(S.t)+'">'+
      '<label>Mensaje</label><textarea id="cpuB" maxlength="400" placeholder="Escribe lo que quieres que les llegue">'+esc(S.b)+'</textarea>'+
      '<label>Al tocarla abre</label><select id="cpuTab">'+tabs().map(function(t){return '<option value="'+esc(t[0])+'"'+(t[0]===S.tab?' selected':'')+'>'+esc(t[1])+'</option>';}).join("")+'</select>'+
      '<label>¿A quién le llega?</label><div class="dv">'+(devs.length?devs.map(function(d){return '<label><input type="checkbox" data-dev="'+d.i+'"'+(S.off[d.i]?'':' checked')+'> '+esc(d.device)+(d.at?' <small style="opacity:.6">· desde '+esc(new Date(d.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"}))+'</small>':'')+'</label>';}).join(""):'<span style="font-size:12px;opacity:.75">Ningún celular tiene activadas las notificaciones todavía. Abre Caneva Admin desde el ícono y toca “Activar notificaciones”.</span>')+'</div>'+
      '<label class="st"><input type="checkbox" id="cpuGem"'+(S.gem?' checked':'')+'> 💎 Que llegue con diamante</label>'+
      '<label class="st"><input type="checkbox" id="cpuStay"> Que se quede en la pantalla hasta que la toquen</label>'+
      '<button type="button" class="go" id="cpuGo"'+(devs.length?'':' disabled')+'>📲 Enviar aviso</button><div class="rs" id="cpuRes"></div></div>';
  }
  async function paint(card){
    if(!card||card.querySelector("#cpuWrap"))return;
    var w=document.createElement("div");w.id="cpuWrap";card.appendChild(w);
    if(!S.open){w.innerHTML='<button type="button" class="cpu-open" id="cpuOpen">✍️ Enviar un aviso personalizado</button>';return;}
    w.innerHTML='<div class="rs" style="opacity:.7">Cargando celulares…</div>';
    try{S.dev=(await api("/admin/push/devices")).devices||[];}catch(e){S.dev=[];w.innerHTML='<div class="rs">⚠️ '+esc(/Ruta|404/.test(e.message)?"Falta pegar el Worker v97 en Cloudflare para enviar avisos personalizados.":e.message)+'</div>';return;}
    w.innerHTML=form();
  }
  document.addEventListener("click",async function(e){
    var op=e.target.closest&&e.target.closest("#cpuOpen");if(op){S.open=true;var card=document.getElementById("hyNotify");var w=document.getElementById("cpuWrap");if(w)w.remove();paint(card);return;}
    var tp=e.target.closest&&e.target.closest("#cpuBox [data-tpl]");if(tp){var t=TPL[+tp.dataset.tpl];S.t=t[0].replace(/^\S+\s/,"");S.b=t[1];document.getElementById("cpuT").value=S.t;document.getElementById("cpuB").value=S.b;var sel=document.getElementById("cpuTab");if([].some.call(sel.options,function(o){return o.value===t[2];})){sel.value=t[2];S.tab=t[2];}return;}
    var go=e.target.closest&&e.target.closest("#cpuGo");if(!go||S.sending)return;
    var title=document.getElementById("cpuT").value.trim(),body=document.getElementById("cpuB").value.trim(),res=document.getElementById("cpuRes");
    var devs=[].map.call(document.querySelectorAll("#cpuBox [data-dev]:checked"),function(x){return +x.dataset.dev;});
    if(!title&&!body){res.textContent="Escribe el título o el mensaje ✍️";return;}
    if(!devs.length){res.textContent="Elige al menos un celular 📱";return;}
    // the diamond goes at the start of the title (it shows on every phone, iPhone included)
    if(document.getElementById("cpuGem").checked){var t0=title||"CΛNEVΛ";if(t0.indexOf("💎")!==0)title="💎 "+t0;}
    S.sending=true;go.disabled=true;go.textContent="Enviando…";
    try{var d=await api("/admin/push/custom",{method:"POST",body:{title:title,body:body,tab:document.getElementById("cpuTab").value,devices:devs,sticky:document.getElementById("cpuStay").checked}});
      res.innerHTML=(d.sent||[]).filter(function(x){return x.result!=="no se envió";}).map(function(x){return (x.result==="ok"?"✅ ":x.result==="vencida"?"⚠️ ":"❌ ")+esc(x.device)+": "+esc(x.result==="ok"?"enviado":x.result==="vencida"?"ese celular ya no recibe avisos (vuelve a activarlos en él)":x.result);}).join("<br>")||"Enviado";
      S.t="";S.b="";
    }catch(err){res.textContent="⚠️ "+err.message;}
    S.sending=false;go.disabled=false;go.textContent="📲 Enviar aviso";
  });
  document.addEventListener("input",function(e){var id=e.target&&e.target.id;if(id==="cpuT")S.t=e.target.value;if(id==="cpuB")S.b=e.target.value;});
  document.addEventListener("change",function(e){var t=e.target;if(!t||!t.closest||!t.closest("#cpuBox"))return;if(t.id==="cpuTab")S.tab=t.value;if(t.id==="cpuGem")S.gem=t.checked;if(t.dataset&&t.dataset.dev!==undefined)S.off[t.dataset.dev]=!t.checked;});
  // hook: every time the "Avisos a tu celular" card is painted, add the form under it
  var tries=0;
  function hook(){
    if(typeof window.hoyNotifyCard!=="function"){if(++tries<40)setTimeout(hook,400);return;}
    if(window.hoyNotifyCard.__cpu)return;
    var o=window.hoyNotifyCard;
    var w=async function(v){var r=await o.apply(this,arguments);try{css();paint(document.getElementById("hyNotify"));}catch(e){}return r;};
    w.__cpu=true;window.hoyNotifyCard=w;try{hoyNotifyCard=w;}catch(e){}
    var c=document.getElementById("hyNotify");if(c){css();paint(c);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hook);else hook();
})();
