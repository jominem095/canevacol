/* CANEVA admin · Clientas (v1)
   Real customer photos / WhatsApp screenshots that the owner publishes in the store ("Clientas CΛNEVΛ" wall and
   "Así le quedó a…" inside each garment). Upload (compressed in the phone), link to a garment, highlight, hide, delete,
   and a list of recent buyers with a ready WhatsApp message asking for a photo (with permission to publish it).
   Mounted by admin_movil.html: CanevaClientas.mount(el, {api, token, products}) */
(function(){
  var S={el:null,o:null,list:[],orders:null,file:null,busy:false};
  var ASK_KEY="cv_rev_asked";
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function api(path,opt){opt=opt||{};var h={"x-admin-token":S.o.token()};if(opt.body&&!(opt.body instanceof FormData))h["Content-Type"]="application/json";
    return fetch(S.o.api+path,{method:opt.method||"GET",headers:h,body:opt.body?(opt.body instanceof FormData?opt.body:JSON.stringify(opt.body)):undefined})
      .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function toast(t){var d=document.createElement("div");d.className="cl-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2600);}
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d;}
  function first(n){return String(n||"").trim().split(/\s+/)[0]||"";}
  function asked(){try{return JSON.parse(localStorage.getItem(ASK_KEY)||"{}")||{};}catch(e){return {};}}
  function markAsked(id){var a=asked();a[id]=Date.now();try{localStorage.setItem(ASK_KEY,JSON.stringify(a));}catch(e){}}
  function prods(){var l=[];try{l=(S.o.products&&S.o.products())||[];}catch(e){}return l.filter(function(p){return p&&p.nombre;}).sort(function(a,b){return String(a.nombre).localeCompare(String(b.nombre));});}
  function wsrv(u,w){return /^https?:/.test(u||"")?"https://wsrv.nl/?url="+encodeURIComponent(u)+"&w="+w+"&output=webp":u;}

  function css(){if(document.getElementById("cl-css"))return;var s=document.createElement("style");s.id="cl-css";s.textContent=
    ".cl{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".cl-hero{border-radius:24px;padding:18px;margin:4px 0 12px;background:radial-gradient(520px 240px at 100% 0%,rgba(207,227,245,.16),transparent 60%),linear-gradient(180deg,#121215,#0a0a0c);border:1px solid rgba(246,247,248,.12)}"+
    ".cl-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px}.cl-hero p{margin:6px 0 0;font-size:13px;color:rgba(246,247,248,.72);line-height:1.5}"+
    ".cl-k{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.cl-k span{border-radius:999px;padding:6px 11px;font-size:12px;background:rgba(255,255,255,.06);border:1px solid rgba(246,247,248,.14)}.cl-k a{color:#cfe3f5;font-size:12px;margin-left:auto;align-self:center}"+
    ".cl-box{border-radius:20px;padding:14px;margin:12px 0;background:#0e0e10;border:1px solid rgba(246,247,248,.12)}.cl-box h3{margin:0 0 4px;font-size:15px}.cl-box>p{margin:0 0 10px;font-size:12px;color:rgba(246,247,248,.62)}"+
    ".cl-drop{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;min-height:150px;border-radius:16px;border:1.5px dashed rgba(207,227,245,.45);cursor:pointer;text-align:center;padding:12px;font-size:13px;color:rgba(246,247,248,.75);overflow:hidden;position:relative}"+
    ".cl-drop img{max-height:260px;max-width:100%;border-radius:12px}.cl-drop b{font-size:15px;color:#fff}"+
    ".cl-f{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:10px}.cl-f>div{min-width:0}.cl-f .w{grid-column:1/-1}"+
    ".cl-f input,.cl-f select,.cl-f textarea{width:100%;min-width:0;max-width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#f6f7f8;padding:11px 12px;font:14px Inter,sans-serif}"+
    ".cl-f textarea{min-height:70px;resize:vertical}.cl-f label{font-size:11px;color:rgba(246,247,248,.6);display:block;margin-bottom:4px}"+
    ".cl-perm{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12px;color:rgba(246,247,248,.75)}.cl-perm input{margin-top:2px}"+
    ".cl-go{width:100%;margin-top:12px;padding:13px;border:0;border-radius:999px;background:linear-gradient(135deg,#fff,#cfd6db);color:#050505;font:800 14px Inter,sans-serif;cursor:pointer}.cl-go[disabled]{opacity:.5}"+
    ".cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}"+
    ".cl-c{border-radius:16px;overflow:hidden;background:#111;border:1px solid rgba(246,247,248,.12);position:relative}.cl-c.off{opacity:.45}.cl-c.top{border-color:#f3e6c4;box-shadow:0 0 0 1px rgba(243,230,196,.4)}"+
    ".cl-c img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}.cl-c .t{padding:8px 10px;font-size:12px}.cl-c .t b{display:block}.cl-c .t small{color:rgba(246,247,248,.6)}"+
    ".cl-c .a{display:flex;gap:4px;padding:0 8px 8px;flex-wrap:wrap}.cl-c .a button{flex:1;border:1px solid rgba(246,247,248,.18);background:rgba(255,255,255,.05);color:#f6f7f8;border-radius:999px;padding:6px 4px;font:600 11px Inter,sans-serif;cursor:pointer}"+
    ".cl-c .badge{position:absolute;top:8px;left:8px;font:700 10px Inter,sans-serif;background:#f3e6c4;color:#050505;border-radius:999px;padding:3px 8px}"+
    ".cl-o{display:flex;align-items:center;gap:8px;padding:10px 0;border-top:1px solid rgba(255,255,255,.06);font-size:13px}.cl-o .who{flex:1;min-width:0}.cl-o .who small{display:block;color:rgba(246,247,248,.55);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
    ".cl-o a{border-radius:999px;padding:8px 12px;font:700 12px Inter,sans-serif;text-decoration:none;background:#25d366;color:#04140a;white-space:nowrap}.cl-o a.done{background:rgba(37,211,102,.14);color:#9ff0bf;border:1px solid rgba(37,211,102,.4)}"+
    ".cl-empty{padding:18px;text-align:center;color:rgba(246,247,248,.6);font-size:13px}"+
    ".cl-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:99;background:#f6f7f8;color:#050505;padding:10px 16px;border-radius:999px;font:600 13px Inter,sans-serif}";
    document.head.appendChild(s);}

  // phone photos and screenshots can weigh 5-10 MB: shrink to 1400 px JPEG before uploading
  function compress(file){return new Promise(function(ok){
    if(!/^image\//.test(file.type)||/gif/.test(file.type)){ok(file);return;}
    var u=URL.createObjectURL(file),im=new Image();
    im.onload=function(){var max=1400,w=im.naturalWidth,h=im.naturalHeight,k=Math.min(1,max/Math.max(w,h));var c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
      c.toBlob(function(b){ok(b&&b.size<file.size?new File([b],"clienta.jpg",{type:"image/jpeg"}):file);},"image/jpeg",.86);};
    im.onerror=function(){URL.revokeObjectURL(u);ok(file);};im.src=u;});}

  function render(){
    var vis=S.list.filter(function(r){return !r.hidden;}).length,ps=prods();
    S.el.innerHTML='<div class="cl"><div class="cl-hero"><h2>⭐ Clientas CΛNEVΛ</h2><p>Sube fotos o pantallazos que te mandan tus clientas felices. Salen en tu tienda en “Ellas ya brillan con CΛNEVΛ” y dentro de la prenda que compraron (“Así le quedó a Laura”). Es lo que más convence a una clienta nueva.</p>'+
      '<div class="cl-k"><span>✅ '+vis+' publicada'+(vis===1?'':'s')+'</span><span>🙈 '+(S.list.length-vis)+' oculta'+(S.list.length-vis===1?'':'s')+'</span><a href="https://canevacol.com/#cvRevs" target="_blank" rel="noopener">Ver en mi tienda ↗</a></div></div>'+
      '<div class="cl-box"><h3>📤 Publicar una clienta</h3><p>Foto con la prenda, pantallazo de su mensaje o audio transcrito. Recorta su número de teléfono si sale en el pantallazo.</p>'+
      '<input type="file" accept="image/*" id="clFile" hidden><div class="cl-drop" id="clDrop">'+(S.file?'<img src="'+S.file.prev+'" alt="">':'<b>📸 Toca para elegir la foto</b><span>o el pantallazo de WhatsApp</span>')+'</div>'+
      '<div class="cl-f"><div><label>Nombre (solo el primero)</label><input id="clName" maxlength="40" placeholder="Laura"></div><div><label>Ciudad</label><input id="clCity" maxlength="40" placeholder="Bogotá"></div>'+
      '<div class="w"><label>Qué dijo (opcional)</label><textarea id="clText" maxlength="400" placeholder="Me encantó, la tela es divina y llegó en 2 días 💖"></textarea></div>'+
      '<div class="w"><label>Prenda que compró (opcional, así sale dentro de esa prenda)</label><select id="clProd"><option value="">— Sin prenda —</option>'+ps.map(function(p){return '<option value="'+esc(/^pr[a-z0-9]{6,16}$/.test(p.id||"")?p.id:"")+'" data-n="'+esc(p.nombre)+'">'+esc(p.nombre)+(p.precio?' · '+esc(p.precio):'')+'</option>';}).join("")+'</select></div></div>'+
      '<label class="cl-perm"><input type="checkbox" id="clPerm"> <span>Ella me dio permiso de publicar su foto o mensaje en la tienda.</span></label>'+
      '<button type="button" class="cl-go" id="clGo"'+(S.file?'':' disabled')+'>Publicar en mi tienda ✨</button></div>'+
      '<div class="cl-box"><h3>🖼️ Tus clientas publicadas</h3>'+(S.list.length?'<div class="cl-grid">'+S.list.map(function(r){return '<div class="cl-c'+(r.hidden?' off':'')+(r.top?' top':'')+'" data-id="'+r.id+'">'+(r.top?'<span class="badge">⭐ Destacada</span>':'')+'<img src="'+esc(wsrv(r.img,360))+'" alt="" loading="lazy"><div class="t"><b>'+esc(r.name||"Clienta")+(r.city?' · '+esc(r.city):'')+'</b><small>'+esc(r.product||"Sin prenda")+'</small></div>'+
        '<div class="a"><button type="button" data-act="top">'+(r.top?'Quitar ⭐':'⭐ Destacar')+'</button><button type="button" data-act="hide">'+(r.hidden?'👁 Mostrar':'🙈 Ocultar')+'</button><button type="button" data-act="del">🗑</button></div></div>';}).join("")+'</div>':'<div class="cl-empty">Aún no has publicado clientas. La primera foto ya hace que tu tienda se vea más confiable.</div>')+'</div>'+
      '<div class="cl-box"><h3>📲 Pídeles una foto</h3><p>Clientas que compraron hace 2 a 45 días. Un toque abre WhatsApp con el mensaje listo; cuando te respondan con la foto, la subes arriba.</p><div id="clAsk">'+askHtml()+'</div></div></div>';
  }
  function askHtml(){
    if(S.orders===null)return '<div class="cl-empty">Cargando compras…</div>';
    var a=asked(),now=Date.now(),seen={};
    var l=S.orders.filter(function(o){var dv=o.delivery||{},ph=String(dv.phone||"").replace(/[^\d]/g,""),age=now-(Date.parse(o.createdAt)||now);
      if(o.status!=="pagado"||ph.length<10||age<2*864e5||age>45*864e5||seen[ph])return false;seen[ph]=1;return true;}).slice(0,40);
    if(!l.length)return '<div class="cl-empty">No hay compras con WhatsApp de los últimos 45 días.</div>';
    return l.map(function(o){var dv=o.delivery||{},item=((o.items||[])[0]||{}).nombre||"tu prenda",nm=first(dv.name),done=a[o.id];
      var msg="Hola"+(nm?" "+nm:"")+" 💎 Te escribe Mayra de CΛNEVΛ. ¿Cómo te quedó "+String(item).split(" · ")[0]+"? Nos haría muy feliz ver una foto tuya con ella 📸 o que nos cuentes qué te pareció. Si nos das permiso, la compartimos en nuestra tienda ✨";
      return '<div class="cl-o"><div class="who"><b>'+esc(dv.name||"Clienta")+'</b><small>'+esc(String(item).split(" · ")[0])+' · '+new Date(o.createdAt).toLocaleDateString("es-CO",{day:"numeric",month:"short"})+(done?' · ya le pediste':'')+'</small></div>'+
        '<a class="'+(done?'done':'')+'" data-ask="'+esc(o.id)+'" target="_blank" rel="noopener" href="https://wa.me/'+waNum(dv.phone)+'?text='+encodeURIComponent(msg)+'">'+(done?'Otra vez':'💬 Pedir foto')+'</a></div>';}).join("");
  }
  function load(){
    api("/admin/reviews").then(function(d){S.list=d.list||[];render();}).catch(function(e){S.el.innerHTML='<div class="cl-empty">'+esc(/Ruta|404/.test(e.message)?"Falta pegar el Worker v94 en Cloudflare para usar Clientas.":e.message)+'</div>';});
    api("/admin/orders?status=todos").then(function(d){S.orders=d.orders||[];var b=document.getElementById("clAsk");if(b)b.innerHTML=askHtml();}).catch(function(){S.orders=[];var b=document.getElementById("clAsk");if(b)b.innerHTML=askHtml();});
  }
  function publish(){
    if(S.busy||!S.file)return;
    if(!document.getElementById("clPerm").checked){toast("Marca que tu clienta te dio permiso 💛");return;}
    var sel=document.getElementById("clProd"),opt=sel.options[sel.selectedIndex];
    var fd=new FormData();fd.append("file",S.file.f);fd.append("name",document.getElementById("clName").value.trim());fd.append("city",document.getElementById("clCity").value.trim());
    fd.append("text",document.getElementById("clText").value.trim());var hasP=!!(opt&&opt.dataset.n);fd.append("pid",hasP?(sel.value||""):"");fd.append("product",hasP?opt.dataset.n:"");
    S.busy=true;var b=document.getElementById("clGo");b.disabled=true;b.textContent="Subiendo…";
    api("/admin/reviews",{method:"POST",body:fd}).then(function(){S.file=null;S.busy=false;toast("✨ Publicada en tu tienda");return api("/admin/reviews");}).then(function(d){S.list=d.list||[];render();})
      .catch(function(e){S.busy=false;b.disabled=false;b.textContent="Publicar en mi tienda ✨";toast(e.message);});
  }
  function mount(el,o){
    S.el=el;S.o=o;css();
    if(!el.dataset.cl){el.dataset.cl="1";
      el.addEventListener("click",function(e){
        if(e.target.closest("#clDrop")){document.getElementById("clFile").click();return;}
        if(e.target.closest("#clGo")){publish();return;}
        var ak=e.target.closest("[data-ask]");if(ak){markAsked(ak.dataset.ask);setTimeout(function(){var b=document.getElementById("clAsk");if(b)b.innerHTML=askHtml();},600);return;}
        var ab=e.target.closest("[data-act]");if(ab){var id=ab.closest("[data-id]").dataset.id,r=S.list.find(function(x){return String(x.id)===id;});if(!r)return;
          var body=ab.dataset.act==="top"?{top:!r.top}:ab.dataset.act==="hide"?{hidden:!r.hidden}:{delete:true};
          if(body.delete&&!confirm("¿Borrar esta clienta de tu tienda?"))return;
          api("/admin/reviews/"+id,{method:"POST",body:body}).then(function(){return api("/admin/reviews");}).then(function(d){S.list=d.list||[];render();toast("Listo ✓");}).catch(function(e2){toast(e2.message);});}
      });
      el.addEventListener("change",function(e){if(e.target.id!=="clFile"||!e.target.files||!e.target.files[0])return;var f0=e.target.files[0];
        compress(f0).then(function(f){var keep={name:(document.getElementById("clName")||{}).value,city:(document.getElementById("clCity")||{}).value,text:(document.getElementById("clText")||{}).value};
          S.file={f:f,prev:URL.createObjectURL(f)};render();["clName","clCity","clText"].forEach(function(id,k){var v=[keep.name,keep.city,keep.text][k];if(v)document.getElementById(id).value=v;});});});
    }
    render();load();
  }
  window.CanevaClientas={mount:mount,reload:load};
})();
