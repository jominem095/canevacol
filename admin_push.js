/* CANEVA admin · Avisos personalizados y "Dónde está cada uno" (v5)
   - Hoy › Avisos a tu celular: write a title + message, choose which Caneva Admin phones get it and which tab opens when
     they tap it, and send it as a real notification (Web Push, POST /admin/push/custom).
   - v7: auto-update, no manual restart. CV_VER is read from this file's own "?v=N"; on a notice, on focus, on start and
     every 15 min it fetches "admin_ver.txt" (no-store) and, if it is newer, reloads admin_movil.html with a cache-busting
     query (once per version, guarded against loops). So a new version comes in by itself with the next order notice.
   - v6: "Dónde está cada uno" (Reportes): when a Caneva Admin notice (a new order, for example) is opened, or arrives
     with the app on screen, or the app is opened within 30 min after it, this phone sends its location using the
     permission it already gave (admin-sw.js v100 leaves the mark of the notice). Each time it shares, a small discreet
     note in abbreviated English ("Loc. shared with team") shows, so the team stays aware. Never asks for the permission
     by itself. At most every 5 min. Web apps cannot read the GPS with the app closed. Worker v99: /admin/team/*.
   - The map sheet (#cvloc) opens any point with Google Maps, Waze and Apple Maps.
   Wraps hoyNotifyCard() from admin_movil.html, so the form shows up every time that card is painted. */
(function(){
  var TPL=[
    ["🛍 Revisen pedidos","Hay pedidos esperando: revisen la pestaña Pedidos y escríbanles 💎","pedidos"],
    ["📦 Despachar hoy","Hoy hay que despachar los pedidos pagados. ¡Que salgan antes de las 4 pm! 🚚","pedidos"],
    ["📸 Historias de hoy","Suban las historias del día: en 🎬 Historias están listas en un toque ✨","historias"],
    ["⏰ Reunión","Reunión de equipo hoy. Traigan el inventario al día 📋","hoy"]
  ];
  function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  var S={dev:null,open:false,sending:false,t:"",b:"",tab:"",off:{},gem:true,mine:""};
  // version this phone is running (the "?v=N" that loaded this file); compared with admin_ver.txt to auto-update
  var CV_VER=(function(){try{return (document.currentScript&&document.currentScript.src.match(/[?&]v=(\d+)/)||[])[1]||"0";}catch(e){return "0";}})();
  var IOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  var LCSS="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",LJS="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function api(path,opt){opt=opt||{};var tk="";try{tk=typeof token==="function"?token():"";}catch(e){}
    return fetch(API_BASE+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":tk},body:opt.body?JSON.stringify(opt.body):undefined})
      .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function needWorker(m){return /Ruta|404|Not found/i.test(m)?"Falta pegar el Worker v99 en Cloudflare.":m;}
  function tabs(){var out=[];document.querySelectorAll("#tabs button[data-tab]").forEach(function(b){out.push([b.dataset.tab,b.textContent.replace(/\d+$/,"").trim()]);});return out.length?out:[["hoy","✨ Hoy"],["pedidos","📦 Pedidos"]];}
  function hhmm(ms){return new Date(ms).toLocaleTimeString("es-CO",{hour:"numeric",minute:"2-digit"});}
  function ago(ms){var m=Math.round((Date.now()-ms)/60000);if(m<1)return "hace un momento";if(m<60)return "hace "+m+" min";var h=Math.round(m/60);if(h<24)return "hace "+h+" h";return new Date(ms).toLocaleDateString("es-CO",{day:"numeric",month:"short"})+", "+hhmm(ms);}
  function devName(){var u=navigator.userAgent;return /iphone/i.test(u)?"iPhone":/ipad/i.test(u)?"iPad":/android/i.test(u)?"Android":"Computador";}
  // id of this phone (kept on it) + hash of its push endpoint, to know which row is "este celular"
  var DID=null;function did(){if(DID)return DID;var d=lsGet("cv_dev_id");if(!d||!/^[A-Za-z0-9_-]{6,48}$/.test(d)){d="d"+Date.now().toString(36)+Math.random().toString(36).slice(2,10);lsSet("cv_dev_id",d);}return DID=d;}
  var EPP=null;function myEndpoint(){if(!EPP)EPP=("serviceWorker" in navigator?navigator.serviceWorker.getRegistration("admin_movil.html").then(function(r){return r&&r.pushManager?r.pushManager.getSubscription():null;}).then(function(s){return s?s.endpoint:"";}):Promise.resolve("")).catch(function(){return "";});return EPP;}
  function sha16(t){if(!t||!window.crypto||!crypto.subtle)return Promise.resolve("");return crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)).then(function(b){return [].slice.call(new Uint8Array(b),0,8).map(function(x){return ("0"+x.toString(16)).slice(-2);}).join("");}).catch(function(){return "";});}
  var MEP=null;function myEp(){if(!MEP)MEP=myEndpoint().then(sha16);return MEP;}
  function css(){if(document.getElementById("cpu-css"))return;var s=document.createElement("style");s.id="cpu-css";s.textContent=
    ".cpu-open{margin-top:10px;width:100%;border:1px solid rgba(246,247,248,.25);border-radius:999px;padding:11px;background:rgba(255,255,255,.05);color:#f6f7f8;font:700 13px Inter,sans-serif;cursor:pointer}"+
    ".cpu{margin-top:12px;padding:12px;border-radius:14px;background:rgba(0,0,0,.35);border:1px solid rgba(246,247,248,.14)}"+
    ".cpu label{display:block;font-size:11px;opacity:.7;margin:10px 0 4px}.cpu input[type=text],.cpu textarea,.cpu select{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.22);border-radius:12px;color:#f6f7f8;padding:10px 12px;font:14px Inter,sans-serif}"+
    ".cpu textarea{min-height:64px;resize:vertical}.cpu .tp{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.cpu .tp button{flex:0 0 auto;border:1px solid rgba(246,247,248,.2);background:transparent;color:#f6f7f8;border-radius:999px;padding:6px 10px;font:600 12px Inter,sans-serif;cursor:pointer}"+
    ".cpu .dv{display:flex;flex-wrap:wrap;gap:6px}.cpu .dv label{display:flex;align-items:center;gap:6px;margin:0;opacity:1;font-size:12px;border:1px solid rgba(246,247,248,.2);border-radius:999px;padding:6px 10px;cursor:pointer}"+
    ".cpu .st{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;opacity:.85}"+
    ".cpu .go{width:100%;margin-top:12px;border:0;border-radius:999px;padding:12px;background:linear-gradient(120deg,#cfd6db,#ffffff 45%,#e8eef2 60%,#c3ccd2);color:#050505;font:800 14px Inter,sans-serif;cursor:pointer}.cpu .go[disabled]{opacity:.5}"+
    ".cpu .rs{font-size:12px;margin-top:8px;line-height:1.6}.cpu .rs a{color:#f6f7f8}"+
    /* sheets: map of a point and "share my location" */
    ".cvm{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center}"+
    ".cvm-bg{position:absolute;inset:0;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}"+
    ".cvm-card{position:relative;box-sizing:border-box;width:100%;max-width:560px;max-height:94vh;overflow:auto;background:linear-gradient(180deg,#0d0e10,#050505);border:1px solid rgba(246,247,248,.18);border-bottom:0;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));color:#f6f7f8;font:14px Inter,sans-serif;box-shadow:0 -20px 60px rgba(0,0,0,.6);animation:cvmUp .28s ease-out}"+
    "@keyframes cvmUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}"+
    "@media(min-width:700px){.cvm{align-items:center}.cvm-card{border-radius:22px;border-bottom:1px solid rgba(246,247,248,.18)}}"+
    ".cvm-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.cvm-top b{display:block;font-size:16px;line-height:1.35}.cvm-top small{display:block;font-size:12px;opacity:.65;margin-top:3px}"+
    ".cvm-x{flex:0 0 auto;width:36px;height:36px;border-radius:50%;border:1px solid rgba(246,247,248,.25);background:transparent;color:#f6f7f8;font-size:15px;cursor:pointer}"+
    ".cvm-msg{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(246,247,248,.1);font-size:13px;line-height:1.5;white-space:pre-line}"+
    ".cvm-map{margin-top:12px;border-radius:16px;overflow:hidden;border:1px solid rgba(246,247,248,.18);height:min(40vh,320px);background:#111}.cvm-map.sm{height:200px}.cvm-map iframe{width:100%;height:100%;border:0;filter:grayscale(.3) contrast(1.05)}"+
    ".cvm-bt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.cvm-bt>*{box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;min-height:44px;padding:0 10px;border-radius:999px;border:1px solid rgba(246,247,248,.25);background:rgba(255,255,255,.05);color:#f6f7f8;font:700 13px Inter,sans-serif;text-decoration:none;cursor:pointer}"+
    ".cvm-bt .pri{grid-column:1/-1;border:0;background:linear-gradient(120deg,#cfd6db,#ffffff 45%,#e8eef2 60%,#c3ccd2);color:#050505;font-weight:800}.cvm-bt>:last-child:nth-child(even){grid-column:1/-1}.cvm-bt>[disabled]{opacity:.6}"+
    ".cvm-ft{font-size:10px;opacity:.45;text-align:right;margin-top:8px}"+
    /* small notice: "you shared your location" */
    ".cvtst{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100001;display:flex;align-items:flex-start;gap:10px;width:max-content;max-width:calc(100% - 32px);box-sizing:border-box;padding:12px 12px 12px 14px;border-radius:16px;background:#0c0c0d;border:1px solid rgba(246,247,248,.22);color:#f6f7f8;font:13px/1.45 Inter,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.6);animation:cvtIn .25s ease-out}"+
    "@keyframes cvtIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}.cvtst span{flex:1;min-width:0}.cvtst small{display:block;opacity:.7;font-size:11.5px;margin-top:3px}"+
    ".cvtst button{flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:1px solid rgba(246,247,248,.3);background:transparent;color:#f6f7f8;font-size:11px;cursor:pointer}"+
    ".cvtst.sm{padding:7px 10px 7px 12px;font:600 11px/1.3 Inter,sans-serif;opacity:.92;background:rgba(12,12,13,.92);gap:7px;box-shadow:0 8px 22px rgba(0,0,0,.5)}.cvtst.sm button{width:18px;height:18px;font-size:8px}"+
    /* Reportes › Dónde está cada uno */
    "#cvTeam{margin:0 0 14px}.cvt{border-radius:18px;padding:14px;background:linear-gradient(160deg,#141414,#070707);border:1px solid rgba(246,247,248,.16);color:#f6f7f8}"+
    ".cvt-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cvt-h .ic{font-size:22px}.cvt-h>div{flex:1;min-width:150px}.cvt-h b{font-size:15px}.cvt-h small{display:block;font-size:12px;opacity:.7;margin-top:2px;line-height:1.4}"+
    ".cvt-h .go{border:0;border-radius:999px;padding:10px 14px;font:800 12.5px Inter,sans-serif;background:linear-gradient(120deg,#cfd6db,#ffffff 45%,#e8eef2 60%,#c3ccd2);color:#050505;cursor:pointer}.cvt-h .go[disabled]{opacity:.55}"+
    ".cvt-map{height:300px;margin-top:12px;border-radius:14px;overflow:hidden;border:1px solid rgba(246,247,248,.16);background:#0d0d0d}.cvt-map.leaflet-container{background:#0d0d0d}"+
    ".cvt-map .cvt-dark{filter:invert(1) hue-rotate(180deg) brightness(.82) contrast(1.1) saturate(.25)}"+
    ".cvt-map .leaflet-control-attribution{background:rgba(5,5,5,.7)!important;color:#888!important;font-size:10px}.cvt-map .leaflet-control-attribution a{color:#bbb!important}.cvt-map .leaflet-bar a{background:#111!important;color:#f7f7f4!important;border-color:#222!important}"+
    ".cvt-pw{background:none;border:0}.cvt-pin{position:relative;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff,#d7dde1 55%,#9aa3a9);color:#050505;font:800 14px Inter,sans-serif;border:2px solid #050505;box-shadow:0 0 0 3px rgba(255,255,255,.3),0 0 18px rgba(255,255,255,.5);cursor:pointer}"+
    ".cvt-pin.live::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid #5ef0a0;animation:cvtp 1.8s ease-out infinite}.cvt-pin.old{opacity:.55;filter:grayscale(1)}@keyframes cvtp{0%{transform:scale(1);opacity:1}100%{transform:scale(2);opacity:0}}"+
    ".cvt-tip{background:#0b0b0b!important;color:#f7f7f4!important;border:1px solid rgba(247,247,244,.25)!important;border-radius:8px!important;font:600 11px Inter,sans-serif!important;box-shadow:0 6px 16px rgba(0,0,0,.6)!important;padding:3px 7px!important}.cvt-tip.leaflet-tooltip-top:before{border-top-color:#0b0b0b!important}"+
    ".cvt-l{display:flex;flex-direction:column;gap:8px;margin-top:12px}.cvt-r{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(246,247,248,.08)}"+
    ".cvt-r .av{flex:0 0 auto;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 14px Inter,sans-serif;font-style:normal;background:linear-gradient(140deg,#e8eef2,#9aa3a9);color:#050505}.cvt-r.off .av{background:#222;color:#bbb}"+
    ".cvt-r .tx{flex:1;min-width:0}.cvt-r .tx b{font-size:14px}.cvt-r .tx small{display:block;font-size:11px;opacity:.6;margin-top:1px}.cvt-r .ln{font-size:12px;margin-top:3px;line-height:1.45;overflow-wrap:anywhere}.cvt-r .ln .live{color:#5ef0a0}.cvt-r.off .ln{opacity:.75}"+
    ".cvt-r .ed{border:0;background:none;color:#f6f7f8;cursor:pointer;font-size:12px;padding:0 4px;opacity:.75}.cvt-r .see{flex:0 0 auto;border:1px solid rgba(246,247,248,.25);background:transparent;color:#f6f7f8;border-radius:999px;padding:8px 12px;font:700 12px Inter,sans-serif;cursor:pointer}"+
    ".cvt-ed{display:flex;gap:6px}.cvt-ed input{flex:1;min-width:0;background:#050505;border:1px solid rgba(246,247,248,.3);border-radius:10px;color:#f6f7f8;padding:6px 9px;font:14px Inter,sans-serif}.cvt-ed button{border:0;border-radius:10px;padding:6px 10px;background:#f6f7f8;color:#050505;font:700 12px Inter,sans-serif;cursor:pointer}"+
    ".cvt-msg{font-size:12px;margin-top:10px;line-height:1.5}.cvt-msg:empty{display:none}.cvt-e{font-size:12px;opacity:.75;padding:10px}"+
    ".cvt-ft{font-size:11px;opacity:.6;margin-top:10px;line-height:1.5}.cvt-ft button{border:0;background:none;color:#f6f7f8;text-decoration:underline;font:inherit;cursor:pointer;padding:0}";
    document.head.appendChild(s);}

  /* ---------- location helpers ---------- */
  function ll(l){return l.lat+","+l.lng;}
  function gUrl(l){return "https://www.google.com/maps/search/?api=1&query="+ll(l);}
  function rUrl(l){return "https://www.google.com/maps/dir/?api=1&destination="+ll(l);}
  function wUrl(l){return "https://waze.com/ul?ll="+ll(l)+"&navigate=yes";}
  function aUrl(l){return "https://maps.apple.com/?ll="+ll(l)+"&q="+encodeURIComponent(l.label||"CΛNEVΛ");}
  // OpenStreetMap embed (free, no key): the less precise the GPS, the wider the view
  function osm(l){var d=Math.min(0.03,Math.max(0.0018,(+l.acc||0)/111000*2.2)),e=d*1.6;
    return "https://www.openstreetmap.org/export/embed.html?bbox="+[l.lng-e,l.lat-d,l.lng+e,l.lat+d].map(function(x){return x.toFixed(6);}).join("%2C")+"&layer=mapnik&marker="+l.lat+"%2C"+l.lng;}
  function getPos(maxAge){return new Promise(function(ok,ko){
    if(!navigator.geolocation)return ko(new Error("Este celular no deja leer la ubicación"));
    navigator.geolocation.getCurrentPosition(function(p){var c=p.coords;ok({lat:Math.round(c.latitude*1e6)/1e6,lng:Math.round(c.longitude*1e6)/1e6,acc:Math.round(c.accuracy||0)});},
      function(er){ko(new Error(er&&er.code===1?"Caneva Admin no tiene permiso de ubicación":er&&er.code===3?"El GPS tardó demasiado":"No se pudo leer la ubicación"));},
      {enableHighAccuracy:true,timeout:15000,maximumAge:maxAge});});}
  function geoHint(){return IOS?"En el iPhone: Ajustes › Privacidad y seguridad › Localización › Sitios web de Safari › “Al usar la app”, y Ajustes › Safari (o Apps › Safari) › Ubicación › “Permitir”.":"En Android: Chrome › Configuración › Configuración de sitios › Ubicación › permite canevacol.com.";}
  // street + neighbourhood + city from OpenStreetMap (Nominatim); "" if it does not answer in time
  function place(l){
    var ac=typeof AbortController==="function"?new AbortController():null,tm=ac?setTimeout(function(){ac.abort();},6000):0;
    return fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat="+l.lat+"&lon="+l.lng,ac?{signal:ac.signal}:undefined)
      .then(function(r){return r.ok?r.json():{};}).then(function(d){
        var a=(d&&d.address)||{},seen={},st=a.road?a.road+(a.house_number?" #"+String(a.house_number).replace(/^#\s*/,""):""):"";
        return [d&&d.name&&d.name!==a.road?d.name:"",st,a.neighbourhood||a.suburb||a.quarter||"",(a.city||a.town||a.village||a.municipality||a.county||"").replace(/^Perímetro Urbano\s+/i,"")]
          .map(function(x){return String(x||"").trim();}).filter(function(x){if(!x||seen[x])return false;seen[x]=1;return true;}).join(", ").slice(0,80);
      }).catch(function(){return "";}).then(function(s){clearTimeout(tm);return s;});
  }
  function closeSheet(){var m=document.getElementById("cvMapSheet");if(m)m.remove();}
  // map sheet of one point (a person in Reportes, or a notice that carries a location)
  function showMap(l){
    if(!l||!isFinite(l.lat)||!isFinite(l.lng))return;
    l={lat:+l.lat,lng:+l.lng,acc:Math.round(+l.acc||0),label:String(l.label||"").slice(0,80),at:+l.at||0,title:String(l.title||"").slice(0,120),body:String(l.body||"").slice(0,600)};
    css();closeSheet();
    var when=l.at?(Date.now()-l.at<3600000?ago(l.at):"a las "+hhmm(l.at)+(Date.now()-l.at>86400000?" · "+new Date(l.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"}):"")):"";
    var body=l.body.split("\n").filter(function(x){return x.trim()&&x.trim().indexOf("📍")!==0;}).join("\n");
    var share=!!navigator.share;
    var el=document.createElement("div");el.id="cvMapSheet";el.className="cvm";
    el.innerHTML='<div class="cvm-bg" data-cvm="x"></div><div class="cvm-card" role="dialog" aria-modal="true" aria-label="Ubicación">'+
      '<div class="cvm-top"><div><b>📍 '+esc(l.label||"Ubicación compartida")+'</b><small>'+[l.acc?"±"+l.acc+" m":"",when].filter(Boolean).join(" · ")+'</small></div><button type="button" class="cvm-x" data-cvm="x" aria-label="Cerrar">✕</button></div>'+
      (l.title||body?'<div class="cvm-msg">'+(l.title?'<b>'+esc(l.title)+'</b>':'')+(body?(l.title?'\n':'')+esc(body):'')+'</div>':'')+
      '<div class="cvm-map"><iframe src="'+esc(osm(l))+'" title="Mapa"></iframe></div>'+
      '<div class="cvm-bt"><a class="pri" href="'+esc(gUrl(l))+'" target="_blank" rel="noopener">🗺️ Abrir en Google Maps</a>'+
        '<a href="'+esc(rUrl(l))+'" target="_blank" rel="noopener">🧭 Cómo llegar</a><a href="'+esc(wUrl(l))+'" target="_blank" rel="noopener">🚗 Waze</a>'+
        (IOS?'<a href="'+esc(aUrl(l))+'" target="_blank" rel="noopener">🍎 Apple Maps</a>':'')+
        '<button type="button" data-cvm="'+(share?'send':'copy')+'" data-u="'+esc(gUrl(l))+'" data-l="'+esc(l.label)+'">'+(share?'📤 Compartir':'📋 Copiar ubicación')+'</button></div>'+
      '<div class="cvm-ft">Mapa © OpenStreetMap</div></div>';
    document.body.appendChild(el);
  }
  // small notice at the bottom (the person always sees when the location was shared)
  function cvToast(msg,ms,hint,small){css();var t=document.getElementById("cvToast");if(!t){t=document.createElement("div");t.id="cvToast";t.setAttribute("role","status");document.body.appendChild(t);}
    t.className="cvtst"+(small?" sm":"");
    t.innerHTML="<span>"+esc(msg)+(hint?"<small>"+esc(hint)+"</small>":"")+'</span><button type="button" data-cvt="x" aria-label="Cerrar">✕</button>';
    clearTimeout(t._h);if(ms)t._h=setTimeout(function(){if(t.isConnected)t.remove();},ms);}
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("#cvToast [data-cvt]");if(b){var t=document.getElementById("cvToast");if(t)t.remove();}});
  // auto-update: no need to close and reopen the app; a new version comes in by itself and refreshes
  var verAt=0;
  async function checkVersion(){
    if(document.hidden||(navigator.onLine===false)||Date.now()-verAt<15000)return;verAt=Date.now();
    var latest="";try{latest=(await fetch("admin_ver.txt?ts="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.text():"";})).trim();}catch(e){return;}
    if(!/^\d{1,6}$/.test(latest)||latest===CV_VER)return;       // no version file, or already up to date
    var tried="";try{tried=sessionStorage.getItem("cv_relv")||"";}catch(e){}
    if(tried===latest)return;                                    // already reloaded for this version (avoid a loop)
    try{sessionStorage.setItem("cv_relv",latest);}catch(e){}
    cvToast("🔄 Updating Caneva Admin…",5000,"",true);
    setTimeout(function(){try{location.replace(location.pathname+"?app=1&v="+latest);}catch(e){location.reload();}},1200);
  }
  // "Dónde está cada uno": the location goes out by itself around a notice, with the permission this phone already gave
  function lastNotice(){if(!window.caches)return Promise.resolve(0);return caches.open("cv-meta").then(function(c){return c.match("/cv-last-notice");}).then(function(r){return r?r.text():"0";}).then(function(t){return +t||0;}).catch(function(){return 0;});}
  function geoState(){if(!navigator.geolocation)return Promise.resolve("denied");if(!navigator.permissions||!navigator.permissions.query)return Promise.resolve("unknown");
    return navigator.permissions.query({name:"geolocation"}).then(function(p){return p.state;},function(){return "unknown";});}
  var capBusy=false;
  async function maybeCapture(){
    if(document.hidden||capBusy)return;
    var tk="";try{tk=typeof token==="function"?token():"";}catch(e){}if(!tk)return;
    var t=await lastNotice(),done=+lsGet("cv_loc_at")||0;
    if(!t||Date.now()-t>30*60000||done>=t||Date.now()-done<5*60000)return; // only around a notice, once per notice, max every 5 min
    if((await geoState())==="denied")return; // never insists if the phone said no
    capBusy=true;
    try{
      var l=await getPos(60000);
      var label=await Promise.race([place(l),new Promise(function(r){setTimeout(function(){r("");},4000);})]);
      var ep=await myEndpoint();
      await api("/admin/team/loc",{method:"POST",body:{did:did(),endpoint:ep||undefined,device:devName(),name:lsGet("cv_team_name")||"",lat:l.lat,lng:l.lng,acc:l.acc,label:label}});
      lsSet("cv_loc_at",String(Date.now()));
      // small discreet note, abbreviated English, each time it shares: the team stays aware (transparencia)
      cvToast("📍 Loc. shared with team",3500,"",true);
      T.prev="";if(teamVisible())teamLoad();
    }catch(e){}
    capBusy=false;
  }
  document.addEventListener("visibilitychange",function(){if(!document.hidden){maybeCapture();checkVersion();}});
  function copyTxt(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);
    return new Promise(function(ok,ko){var a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();var r=false;try{r=document.execCommand("copy");}catch(e){}a.remove();r?ok():ko();});}
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeSheet();});
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("#cvMapSheet [data-cvm]");if(!b)return;var k=b.getAttribute("data-cvm");
    if(k==="x"){closeSheet();return;}
    var u=b.getAttribute("data-u"),lb=b.getAttribute("data-l")||"";
    if(k==="send"){navigator.share({title:"📍 "+(lb||"Ubicación CΛNEVΛ"),text:"📍 "+(lb||"Aquí estamos")+" · CΛNEVΛ",url:u}).catch(function(){});return;}
    if(k==="copy")copyTxt(u).then(function(){b.textContent="✅ Ubicación copiada";},function(){b.textContent=u;});
  });
  // admin-sw.js: "seen" = a notice arrived with the app open (or was tapped); "map" / #cvloc=… = open a point on the map
  if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",function(e){var d=e.data||{};if(d.cv==="map")showMap(d.loc);else if(d.cv==="seen"){maybeCapture();checkVersion();}});
  function fromHash(){var m=/[#&]cvloc=([^&]+)/.exec(location.hash||"");if(!m)return;var l=null;
    try{l=JSON.parse(decodeURIComponent(m[1]));}catch(x){}
    try{history.replaceState(history.state,"",location.pathname+location.search);}catch(x){}
    if(l)showMap(l);}
  window.addEventListener("hashchange",fromHash);

  /* ---------- Reportes › Dónde está cada uno ---------- */
  var T={data:null,map:null,marks:{},pinSig:"",edit:"",msg:"",prev:"",loading:false,lp:null,mine:"",geo:""};
  function rowsOf(d){
    // one row per phone: phones with notices (devices) + phones that shared (people), joined by the push endpoint hash
    var rows=[],used={},people=d.people||[];
    (d.devices||[]).forEach(function(v){var p=people.filter(function(x){return x.ep&&x.ep===v.ep;})[0]||null;if(p)used[p.did]=1;rows.push({dev:v,p:p});});
    people.forEach(function(p){if(!used[p.did])rows.push({dev:null,p:p});});
    rows.forEach(function(r){var ep=r.dev?r.dev.ep:(r.p&&r.p.ep)||"";r.me=!!(T.mine&&ep===T.mine);
      r.name=(r.p&&r.p.name)||(r.dev?r.dev.device:(r.p&&r.p.device))||"Celular";r.has=!!(r.p&&r.p.lat!=null&&r.p.lng!=null&&r.p.at);});
    rows.sort(function(x,y){return (y.has?y.p.at:0)-(x.has?x.p.at:0);});
    return {rows:rows};
  }
  function rowHtml(r){
    var p=r.p,k=p?p.did:"",ini=String(r.name||"?").trim().charAt(0).toUpperCase()||"?";
    var line=r.has?"📍 "+esc(p.label||(p.lat.toFixed(5)+", "+p.lng.toFixed(5)))+' · <span class="'+(Date.now()-p.at<15*60000?"live":"")+'">'+esc(ago(p.at))+"</span>"+(p.acc?" · ±"+p.acc+"\u00a0m":""):"Todavía sin ubicación: aparece cuando abra un aviso de Caneva Admin";
    var sub=(r.dev?esc(r.dev.device)+(r.dev.at?" · avisos desde "+esc(new Date(r.dev.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"})):""):"Sin avisos activos")+(r.me?" · <b>este celular</b>":"");
    var nm=T.edit&&T.edit===k?'<span class="cvt-ed"><input type="text" id="cvtName" maxlength="30" value="'+esc(p.name||"")+'" placeholder="Nombre"><button type="button" data-tm="save" data-did="'+esc(k)+'">Guardar</button></span>'
      :"<b>"+esc(r.name)+"</b>"+(k?' <button type="button" class="ed" data-tm="edit" data-did="'+esc(k)+'" aria-label="Cambiar nombre">✏️</button>':"");
    return '<div class="cvt-r'+(r.has?"":" off")+'"><i class="av">'+esc(ini)+'</i><div class="tx">'+nm+"<small>"+sub+'</small><div class="ln">'+line+"</div></div>"+
      (r.has?'<button type="button" class="see" data-tm="see" data-did="'+esc(k)+'">🗺️ Ver</button>':"")+"</div>";
  }
  function teamCard(){
    var box=document.getElementById("cvTeam");if(!box)return;css();
    var d=T.data,head='<div class="cvt-h"><span class="ic">📍</span><div><b>Dónde está cada uno</b><small>';
    if(!d){box.innerHTML='<div class="cvt">'+head+"Cargando…</small></div></div></div>";return;}
    if(d.error){box.innerHTML='<div class="cvt">'+head+esc(/Worker/.test(needWorker(d.error))?"Falta pegar el Worker v99 en Cloudflare para ver la ubicación del equipo.":"⚠️ "+d.error)+"</small></div></div></div>";return;}
    var rows=rowsOf(d).rows,pins=rows.filter(function(r){return r.has;});
    var sub=rows.length?pins.length+" de "+rows.length+" celular"+(rows.length===1?"":"es")+" con ubicación · se actualiza cuando abren un aviso, como el de un pedido nuevo":"Ningún celular tiene Caneva Admin con avisos activos";
    // the map stays (same zoom) while the points do not change; only the labels are refreshed
    var sig=JSON.stringify(pins.map(function(r){return [r.p.did,r.p.lat,r.p.lng,r.p.acc,r.name];})),keep=null;
    if(T.map&&T.pinSig===sig&&pins.length){keep=document.getElementById("cvtMap");if(keep)keep.remove();}
    else if(T.map){try{T.map.remove();}catch(e){}T.map=null;T.marks={};T.pinSig="";}
    box.innerHTML='<div class="cvt">'+head+esc(sub)+"</small></div></div>"+
      (pins.length?'<div class="cvt-map" id="cvtMap"></div>':"")+
      '<div class="cvt-l">'+(rows.length?rows.map(rowHtml).join(""):'<div class="cvt-e">Activa las notificaciones de Caneva Admin en cada celular (✨ Hoy › Avisos a tu celular).</div>')+"</div>"+
      '<div class="cvt-msg">'+esc(T.msg)+"</div>"+
      '<div class="cvt-ft">🔒 Cada celular manda su ubicación solo cuando abre un aviso de Caneva Admin, con el permiso de ubicación que ya dio (máximo cada 5 minutos). Se borra sola a los 7 días.'+(pins.length?' <button type="button" data-tm="clear">Borrar ubicaciones</button>':"")+
        (T.geo==="denied"?'<br>⚠️ Este celular no deja leer la ubicación. '+esc(geoHint()):"")+"</div></div>";
    if(!pins.length)return;
    if(keep){var slot=document.getElementById("cvtMap");if(slot)slot.replaceWith(keep);pinIcons(pins);try{T.map.invalidateSize();}catch(e){}}
    else drawMap(pins,sig);
  }
  function pinIcon(r){var age=Date.now()-r.p.at;return L.divIcon({className:"cvt-pw",html:'<div class="cvt-pin'+(age<15*60000?" live":"")+(age>6*3600000?" old":"")+'">'+esc(String(r.name||"?").trim().charAt(0).toUpperCase())+"</div>",iconSize:[34,34],iconAnchor:[17,17]});}
  function pinIcons(pins){pins.forEach(function(r){var m=(T.marks||{})[r.p.did];if(!m)return;try{m.setIcon(pinIcon(r));m.setTooltipContent(esc(r.name)+" · "+esc(ago(r.p.at)));}catch(e){}});}
  function loadLeaflet(){
    if(window.L&&window.L.map)return Promise.resolve();if(T.lp)return T.lp;
    T.lp=new Promise(function(ok,ko){
      if(!document.querySelector('link[href*="leaflet"]')){var c=document.createElement("link");c.rel="stylesheet";c.href=LCSS;document.head.appendChild(c);}
      if(!document.querySelector('script[src*="leaflet"]')){var s=document.createElement("script");s.src=LJS;document.head.appendChild(s);}
      var n=0;(function wait(){if(window.L&&window.L.map)return ok();if(++n>100){T.lp=null;return ko(new Error("No se pudo cargar el mapa"));}setTimeout(wait,100);})();
    });
    return T.lp;
  }
  function drawMap(pins,sig){
    loadLeaflet().then(function(){
      var box=document.getElementById("cvtMap");if(!box||box._leaflet_id)return;
      var map=L.map(box,{scrollWheelZoom:false,zoomControl:true,attributionControl:true});T.map=map;T.marks={};T.pinSig=sig;
      // free OpenStreetMap tiles (no key), darkened with CSS to match the black admin
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,className:"cvt-dark",attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
      var b=[];
      pins.forEach(function(r){var p=r.p,pt=[p.lat,p.lng];b.push(pt);
        if(p.acc>30)L.circle(pt,{radius:p.acc,color:"#e8eef2",weight:1,opacity:.45,fillOpacity:.06,interactive:false}).addTo(map);
        var m=L.marker(pt,{icon:pinIcon(r),title:r.name}).addTo(map);T.marks[p.did]=m;
        m.bindTooltip(esc(r.name)+" · "+esc(ago(p.at)),{permanent:true,direction:"top",offset:[0,-18],className:"cvt-tip"});
        m.on("click",function(){openPerson(r);});
      });
      if(b.length===1)map.setView(b[0],16);else map.fitBounds(b,{padding:[46,46],maxZoom:16});
      setTimeout(function(){try{map.invalidateSize();}catch(e){}},250);
    }).catch(function(e){var box=document.getElementById("cvtMap");if(box)box.innerHTML='<div class="cvt-e">'+esc(e.message)+". Usa “🗺️ Ver” en cada persona.</div>";});
  }
  function openPerson(r){var p=r.p;if(!p)return;showMap({lat:p.lat,lng:p.lng,acc:p.acc,label:p.label,at:p.at,title:"👤 "+r.name+(r.dev?" · "+r.dev.device:"")});}
  function findRow(k){if(!T.data||T.data.error)return null;return rowsOf(T.data).rows.filter(function(r){return r.p&&r.p.did===k;})[0]||null;}
  function teamVisible(){var v=document.getElementById("repView");return !!(v&&!v.classList.contains("hidden"));}
  async function teamLoad(){
    if(T.loading)return;T.loading=true;
    try{T.mine=await myEp();T.geo=await geoState();T.data=await api("/admin/team/where");}catch(e){T.data={error:needWorker(e.message)};}
    T.loading=false;
    var sig=JSON.stringify(T.data)+"|"+T.mine+"|"+T.msg+"|"+T.geo+"|"+Math.floor(Date.now()/60000);
    if(T.edit||sig===T.prev)return; // do not repaint while a name is being typed or when nothing changed
    T.prev=sig;teamCard();
  }
  function teamMount(){
    var v=document.getElementById("repView");if(!v)return false;
    if(!document.getElementById("cvTeam")){var box=document.createElement("div");box.id="cvTeam";v.insertBefore(box,v.firstChild);T.prev="";teamCard();}
    return true;
  }
  function teamTick(){if(teamVisible()&&!document.hidden&&teamMount()){if(T.map)try{T.map.invalidateSize();}catch(e){}teamLoad();}}
  async function saveName(k){
    var i=document.getElementById("cvtName");if(!i||!k)return;var name=i.value.trim().slice(0,30);
    try{await api("/admin/team/name",{method:"POST",body:{did:k,name:name}});if(k===did()&&name)lsSet("cv_team_name",name);T.msg="";}catch(e){T.msg="⚠️ "+needWorker(e.message);}
    T.edit="";T.prev="";teamLoad();
  }
  async function clearAll(b){
    if(b.getAttribute("data-sure")!=="1"){b.setAttribute("data-sure","1");b.textContent="¿Seguro? Toca otra vez para borrarlas";setTimeout(function(){if(b.isConnected){b.removeAttribute("data-sure");b.textContent="Borrar ubicaciones";}},4000);return;}
    try{await api("/admin/team/clear",{method:"POST",body:{}});T.msg="🗑️ Ubicaciones borradas.";}catch(e){T.msg="⚠️ "+needWorker(e.message);}
    T.prev="";teamLoad();
  }
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("#cvTeam [data-tm]");if(!b)return;var k=b.getAttribute("data-tm"),id=b.getAttribute("data-did")||"";
    if(k==="clear")clearAll(b);
    else if(k==="edit"){T.edit=id;teamCard();var i=document.getElementById("cvtName");if(i){i.focus();i.select();}}
    else if(k==="save")saveName(id);
    else if(k==="see"){var r=findRow(id);if(r)openPerson(r);}
  });
  document.addEventListener("keydown",function(e){if(!e.target||e.target.id!=="cvtName")return;if(e.key==="Enter")saveName(T.edit);else if(e.key==="Escape"){T.edit="";T.prev="";teamCard();}});
  function teamWatch(){var v=document.getElementById("repView");if(!v)return;
    new MutationObserver(function(){if(teamVisible())teamTick();}).observe(v,{attributes:true,attributeFilter:["class"]});
    setInterval(teamTick,20000);document.addEventListener("visibilitychange",teamTick);teamTick();}

  /* ---------- Hoy › Aviso personalizado ---------- */
  function form(){
    var devs=S.dev||[];
    return '<div class="cpu" id="cpuBox"><b style="font-size:14px">✍️ Aviso personalizado</b><div style="font-size:12px;opacity:.7;margin-top:2px">Le llega como notificación a los celulares que tienen Caneva Admin.</div>'+
      '<label>Ideas rápidas</label><div class="tp">'+TPL.map(function(t,i){return '<button type="button" data-tpl="'+i+'">'+esc(t[0])+'</button>';}).join("")+'</div>'+
      '<label>Título</label><input type="text" id="cpuT" maxlength="80" placeholder="Ej: Hay pedidos por despachar" value="'+esc(S.t)+'">'+
      '<label>Mensaje</label><textarea id="cpuB" maxlength="400" placeholder="Escribe lo que quieres que les llegue">'+esc(S.b)+'</textarea>'+
      '<label>Al tocarla abre</label><select id="cpuTab">'+tabs().map(function(t){return '<option value="'+esc(t[0])+'"'+(t[0]===S.tab?' selected':'')+'>'+esc(t[1])+'</option>';}).join("")+'</select>'+
      '<label>¿A quién le llega?</label><div class="dv">'+(devs.length?devs.map(function(d){return '<label><input type="checkbox" data-dev="'+d.i+'"'+(S.off[d.i]?'':' checked')+'> '+esc(d.name||d.device)+(d.name?' <small style="opacity:.6">· '+esc(d.device)+'</small>':(d.at?' <small style="opacity:.6">· desde '+esc(new Date(d.at).toLocaleDateString("es-CO",{day:"numeric",month:"short"}))+'</small>':''))+(S.mine&&d.ep===S.mine?' <small style="opacity:.6">· este</small>':'')+'</label>';}).join(""):'<span style="font-size:12px;opacity:.75">Ningún celular tiene activadas las notificaciones todavía. Abre Caneva Admin desde el ícono y toca “Activar notificaciones”.</span>')+'</div>'+
      '<label class="st"><input type="checkbox" id="cpuGem"'+(S.gem?' checked':'')+'> 💎 Que llegue con diamante</label>'+
      '<label class="st"><input type="checkbox" id="cpuStay"> Que se quede en la pantalla hasta que la toquen</label>'+
      '<button type="button" class="go" id="cpuGo"'+(devs.length?'':' disabled')+'>📲 Enviar aviso</button><div class="rs" id="cpuRes"></div></div>';
  }
  async function paint(card){
    if(!card||card.querySelector("#cpuWrap"))return;
    var w=document.createElement("div");w.id="cpuWrap";card.appendChild(w);
    if(!S.open){w.innerHTML='<button type="button" class="cpu-open" id="cpuOpen">✍️ Enviar un aviso personalizado</button>';return;}
    w.innerHTML='<div class="rs" style="opacity:.7">Cargando celulares…</div>';
    try{S.dev=(await api("/admin/push/devices")).devices||[];S.mine=await myEp();}catch(e){S.dev=[];w.innerHTML='<div class="rs">⚠️ '+esc(/Ruta|404/.test(e.message)?"Falta pegar el Worker v97 en Cloudflare para enviar avisos personalizados.":e.message)+'</div>';return;}
    w.innerHTML=form();
  }
  document.addEventListener("click",async function(e){
    var gt=e.target.closest&&e.target.closest("#cpuBox [data-goto]");if(gt){e.preventDefault();try{showTab(gt.getAttribute("data-goto"));window.scrollTo(0,0);}catch(x){}return;}
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
      res.innerHTML=((d.sent||[]).filter(function(x){return x.result!=="no se envió";}).map(function(x){return (x.result==="ok"?"✅ ":x.result==="vencida"?"⚠️ ":"❌ ")+esc(x.device)+": "+esc(x.result==="ok"?"enviado":x.result==="vencida"?"ese celular ya no recibe avisos (vuelve a activarlos en él)":x.result);}).join("<br>")||"Enviado");
      S.t="";S.b="";document.getElementById("cpuT").value="";document.getElementById("cpuB").value="";
    }catch(err){res.textContent="⚠️ "+err.message;}
    S.sending=false;go.disabled=false;go.textContent="📲 Enviar aviso";
  });
  document.addEventListener("input",function(e){var id=e.target&&e.target.id;if(id==="cpuT")S.t=e.target.value;if(id==="cpuB")S.b=e.target.value;});
  document.addEventListener("change",function(e){var t=e.target;if(!t||!t.closest||!t.closest("#cpuBox"))return;if(t.id==="cpuTab")S.tab=t.value;if(t.id==="cpuGem")S.gem=t.checked;
    if(t.dataset&&t.dataset.dev!==undefined)S.off[t.dataset.dev]=!t.checked;});
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
  function start(){fromHash();hook();teamWatch();setTimeout(maybeCapture,2500);setTimeout(checkVersion,3500);setInterval(checkVersion,900000);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
