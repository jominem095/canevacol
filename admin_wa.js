/* CANEVA admin · WhatsApp everywhere (v1)
   - Every phone in the admin gets a small green chat icon and opens a "Escribirle" sheet:
     ready messages (with her name), "Escríbelo con Caneva AI", copy, call, open WhatsApp.
   - Plain-text Colombian mobiles (3xx xxx xxxx) become links automatically.
   Shared by admin_movil.html (phone) and admin.html (computer). */
(function(){
  if(window.CV_WA)return;window.CV_WA=1;
  var API=(typeof API_BASE!=="undefined"?API_BASE:"https://caneva-ai.canevacol.workers.dev");
  function tok(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function num(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;if(d[0]==="3")return "";return d.length>=11&&d.length<=13?d:"";}
  function pretty(n){var d=String(n).replace(/^57/,"");return d.length===10?d.slice(0,3)+" "+d.slice(3,6)+" "+d.slice(6):d;}
  // small generic chat-bubble icon (not a brand logo)
  var ICON='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="#25d366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/><path fill="#fff" d="M9.2 7.3c.3 0 .6 0 .8.5l.9 2c.1.3 0 .5-.1.7l-.6.7c.6 1.2 1.6 2.2 2.9 2.9l.7-.6c.2-.2.5-.2.7-.1l2 .9c.4.2.5.5.4.8-.2 1.2-1.2 1.9-2.3 1.9-3.7-.4-6.6-3.3-7-7 0-1.1.7-2.1 1.9-2.3z"/></svg>';

  var css=document.createElement("style");css.textContent=
  ".cvw-ic{display:inline-flex;vertical-align:-2px;margin-right:4px}"+
  "a.cvw-a{color:#25d366!important;font-weight:700;text-decoration:none!important;white-space:nowrap}"+
  "a.cvw-a.ext,a.cvw-btn{color:#04140a!important;background:#25d366!important;border-color:#25d366!important;text-align:center}"+
  "a.cvw-a.ext .cvw-ic svg path:first-child{fill:#04140a}"+
  ".cvw-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;animation:cvwF .2s}"+
  "@media(min-width:760px){.cvw-ov{align-items:center}}"+
  "@keyframes cvwF{from{opacity:0}}@keyframes cvwU{from{transform:translateY(40px);opacity:0}}"+
  ".cvw-sh{width:min(560px,100%);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#121212,#070707);color:#f7f7f4;border:1px solid rgba(37,211,102,.35);border-radius:22px 22px 0 0;padding:18px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(37,211,102,.15);animation:cvwU .25s;font-family:Inter,system-ui,sans-serif}"+
  "@media(min-width:760px){.cvw-sh{border-radius:22px}}"+
  ".cvw-hd{display:flex;align-items:center;gap:12px;margin-bottom:12px}.cvw-av{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#04140a;background:linear-gradient(135deg,#5ef0a0,#25d366)}"+
  ".cvw-hd b{display:block;font-size:17px}.cvw-hd small{color:rgba(247,247,244,.6);font-size:12px}.cvw-x{margin-left:auto;background:none;border:1px solid rgba(247,247,244,.25);color:#f7f7f4;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer}"+
  ".cvw-ch{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.cvw-ch::-webkit-scrollbar{display:none}"+
  ".cvw-ch button{flex:0 0 auto;border:1px solid rgba(247,247,244,.18);background:#151515;color:#f7f7f4;border-radius:999px;padding:8px 12px;font:600 12px Inter,sans-serif;cursor:pointer;white-space:nowrap}"+
  ".cvw-ch button.on{background:#f7f7f4;color:#050505;border-color:#f7f7f4}"+
  ".cvw-ch button.ai{background:linear-gradient(120deg,#cfd6db,#ffffff 45%,#e8eef2 60%,#c3ccd2);color:#050505;border:0}"+
  ".cvw-tx{width:100%;min-height:120px;box-sizing:border-box;background:#0b0b0a;border:1px solid rgba(37,211,102,.35);border-radius:16px;color:#f7f7f4;padding:12px;font:15px/1.45 Inter,sans-serif;resize:vertical;outline:none}"+
  ".cvw-bt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.cvw-bt a,.cvw-bt button{display:flex;align-items:center;justify-content:center;gap:6px;border-radius:999px;padding:12px;font:700 13px Inter,sans-serif;text-decoration:none;cursor:pointer;border:1px solid rgba(247,247,244,.25);background:none;color:#f7f7f4}"+
  ".cvw-bt .go{grid-column:1/-1;background:#25d366;border-color:#25d366;color:#04140a;font-size:15px;padding:14px;box-shadow:0 10px 30px rgba(37,211,102,.3)}"+
  ".cvw-bt .go svg path:first-child{fill:#04140a}.cvw-bt .go svg path:last-child{fill:#25d366}"+
  ".cvw-note{font-size:11px;color:rgba(247,247,244,.5);text-align:center;margin-top:8px}";
  document.head.appendChild(css);

  // ---------- 1) decorate links and auto-link plain phones ----------
  var PH=/(?:\+?57[\s-]?)?\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g;
  function decorate(root){
    (root||document).querySelectorAll('a[href*="wa.me/"]:not(.cvw-a)').forEach(function(a){
      if(a.closest(".cvw-ov"))return;a.classList.add("cvw-a");
      var t=a.firstChild;if(t&&t.nodeType===3)t.nodeValue=t.nodeValue.replace(/^\s*(💬|📱|📲)\s*/,"");
      a.insertAdjacentHTML("afterbegin",'<span class="cvw-ic">'+ICON+'</span>');
    });
    var w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      if(!n.nodeValue||n.nodeValue.length<10||!/3\d{2}/.test(n.nodeValue))return 2;
      var p=n.parentNode;if(!p||p.closest("a,button,input,textarea,select,script,style,.cvw-ov,[contenteditable]"))return 2;
      PH.lastIndex=0;return PH.test(n.nodeValue)?1:2;}});
    var list=[];while(w.nextNode())list.push(w.currentNode);
    list.forEach(function(n){
      var s=n.nodeValue,out=document.createDocumentFragment(),last=0,m;PH.lastIndex=0;
      while((m=PH.exec(s))){var k=num(m[0]);if(!k)continue;
        out.appendChild(document.createTextNode(s.slice(last,m.index)));
        var a=document.createElement("a");a.href="https://wa.me/"+k;a.target="_blank";a.rel="noopener";a.textContent=m[0];out.appendChild(a);last=m.index+m[0].length;}
      if(!last)return;out.appendChild(document.createTextNode(s.slice(last)));n.parentNode.replaceChild(out,n);
    });
    if(list.length)decorate2(root);
  }
  function decorate2(root){(root||document).querySelectorAll('a[href*="wa.me/"]:not(.cvw-a)').forEach(function(a){a.classList.add("cvw-a");a.insertAdjacentHTML("afterbegin",'<span class="cvw-ic">'+ICON+'</span>');});}
  var tm=null;function soon(){clearTimeout(tm);tm=setTimeout(function(){try{decorate(document.body);}catch(e){}},120);}
  if(window.MutationObserver)new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){if(ms[i].addedNodes.length){soon();return;}}}).observe(document.documentElement,{childList:true,subtree:true});
  soon();

  // ---------- 2) the "Escribirle" sheet ----------
  function guessName(a){
    if(a.dataset.name)return a.dataset.name;
    var el=a;for(var i=0;i<6&&el;i++){el=el.parentElement;if(!el)break;var b=el.querySelector("b,strong,.t");if(b&&b.textContent.trim()&&!/^\$|^\d/.test(b.textContent.trim()))return b.textContent.trim().replace(/^[^\wÁÉÍÓÚáéíóúÑñ]+/,"").slice(0,40);}
    return "";
  }
  function rowText(a){var el=a;for(var i=0;i<5&&el;i++){el=el.parentElement;if(el&&el.innerText&&el.innerText.length>40)break;}return el?el.innerText.replace(/\s+/g," ").slice(0,400):"";}
  function first(n){var f=String(n||"").trim().split(/\s+/)[0]||"";return f?f.charAt(0).toUpperCase()+f.slice(1).toLowerCase():"";}
  function tpls(n){var h="Hola"+(n?" "+n:"");return [
    ["👋 Saludo",h+" ✨ Te escribimos de CΛNEVΛ 🖤 "],
    ["🆕 Colección",h+" ✨ Llegaron prendas nuevas a CΛNEVΛ 💎 Te las mostramos primero a ti: canevacol.com"],
    ["💳 Pago",h+" 🖤 Te recordamos el pago de tu pedido en CΛNEVΛ. Puedes pagar con Bre-B a la llave @caneva119 (sin comisión) o en línea con Bold. ¿Te ayudo con algo?"],
    ["🚚 En camino",h+" 🚚 ¡Tu pedido CΛNEVΛ ya va en camino! Te compartimos la guía apenas la tengamos. Gracias por elegirnos 🖤"],
    ["🛍 Carrito",h+" ✨ Vimos que dejaste prendas en tu carrito de CΛNEVΛ. ¿Te ayudamos a terminar tu pedido? Aún están disponibles 💎"],
    ["👑 Club",h+" 👑 Tienes puntos en el Club Caneva para usar en tu próxima compra. Míralos en canevacol.com 💎"],
    ["🎂 Cumpleaños","¡Feliz cumpleaños"+(n?" "+n:"")+"! 🎂✨ En CΛNEVΛ te queremos consentir: escríbenos y te tenemos un detalle especial 🖤"],
    ["🙏 Gracias",h+" 🖤 Gracias por tu compra en CΛNEVΛ. Nos encantaría ver cómo te queda: etiquétanos en Instagram @caneva.col ✨"]];}
  function close(){var o=document.querySelector(".cvw-ov");if(o)o.remove();}
  function open(a){
    var href=a.getAttribute("href"),u;try{u=new URL(href);}catch(e){return false;}
    var k=num(u.pathname.replace(/\//g,""));if(!k)return false;
    var given=u.searchParams.get("text")||"",name=guessName(a),n=first(name),T=tpls(n),ctx=rowText(a);
    var chips=(given?[["✨ Sugerido",given]]:[]).concat(T);
    var o=document.createElement("div");o.className="cvw-ov";
    o.innerHTML='<div class="cvw-sh" role="dialog" aria-label="Escribir por WhatsApp"><div class="cvw-hd"><div class="cvw-av">'+esc((n||"?").charAt(0))+'</div><div><b>'+esc(name||"Clienta")+'</b><small>'+esc(pretty(k))+' · WhatsApp</small></div><button class="cvw-x" type="button" aria-label="Cerrar">×</button></div>'+
      '<div class="cvw-ch"><button type="button" class="ai" data-ai="1">✨ Escríbelo con Caneva AI</button>'+chips.map(function(c,i){return '<button type="button" data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(c[0])+'</button>';}).join("")+'</div>'+
      '<textarea class="cvw-tx" id="cvwTx"></textarea>'+
      '<div class="cvw-bt"><a class="go" id="cvwGo" target="_blank" rel="noopener">'+ICON.replace('width="14" height="14"','width="20" height="20"')+' Abrir WhatsApp</a><button type="button" id="cvwCp">📋 Copiar</button><a href="tel:+'+k+'">📞 Llamar</a></div>'+
      '<div class="cvw-note">Puedes editar el mensaje antes de enviarlo.</div></div>';
    document.body.appendChild(o);
    var tx=o.querySelector("#cvwTx"),go=o.querySelector("#cvwGo");
    function sync(){go.href="https://wa.me/"+k+(tx.value.trim()?"?text="+encodeURIComponent(tx.value):"");}
    tx.value=chips[0][1];sync();tx.oninput=sync;
    o.addEventListener("click",function(e){
      if(e.target===o||e.target.closest(".cvw-x")){close();return;}
      var c=e.target.closest("[data-i]");if(c){o.querySelectorAll(".cvw-ch button").forEach(function(x){x.classList.toggle("on",x===c);});tx.value=chips[+c.dataset.i][1];sync();return;}
      var ai=e.target.closest("[data-ai]");if(ai){
        if(ai.disabled)return;ai.disabled=true;var old=ai.textContent;ai.textContent="✨ Escribiendo…";tx.style.opacity=".5";
        var q="Escribe UN mensaje corto de WhatsApp (máximo 3 líneas, cálido, cercano, 1 o 2 emojis, estilo lujo de CΛNEVΛ, sin comillas ni explicaciones) para la clienta "+(name||"")+". Datos de ella en el admin: "+ctx+". "+(tx.value?"Inspírate en esta idea: "+tx.value:"")+" Devuelve solo el mensaje.";
        fetch(API+"/admin/ai",{method:"POST",headers:{"Content-Type":"application/json","x-admin-token":tok()},body:JSON.stringify({message:q,history:[]})})
          .then(function(r){return r.json();}).then(function(d){var t=String(d&&d.reply||"").replace(/^["“]|["”]$/g,"").replace(/\n?IDEAS:[\s\S]*$/i,"").trim();if(t){tx.value=t;sync();}else throw new Error(d&&d.error||"sin respuesta");})
          .catch(function(err){ai.textContent="⚠️ "+String(err.message||err).slice(0,40);setTimeout(function(){ai.textContent=old;},2500);})
          .then(function(){ai.disabled=false;tx.style.opacity="";if(ai.textContent==="✨ Escribiendo…")ai.textContent=old;o.querySelectorAll(".cvw-ch button").forEach(function(x){x.classList.toggle("on",x===ai);});});
        return;}
      if(e.target.closest("#cvwCp")){var b=e.target.closest("#cvwCp");try{navigator.clipboard.writeText(tx.value);}catch(x){tx.select();document.execCommand("copy");}b.textContent="✓ Copiado";setTimeout(function(){b.textContent="📋 Copiar";},1500);return;}
      if(e.target.closest("#cvwGo"))setTimeout(close,300);
    });
    return true;
  }
  window.cvWaOpen=function(phone,name,text){var a=document.createElement("a");a.href="https://wa.me/"+num(phone)+(text?"?text="+encodeURIComponent(text):"");if(name)a.dataset.name=name;return open(a);};
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest('a[href*="wa.me/"]');
    if(!a||a.closest(".cvw-ov")||a.dataset.direct==="1"||e.metaKey||e.ctrlKey)return;
    if(open(a)){e.preventDefault();e.stopPropagation();}
  },true);
  document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});
})();
