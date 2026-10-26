/* CANEVA admin · Fotos y color (v1) — shared by Pedidos, Ventas and Bajo pedido
   - CanevaFoto.open(fotos, {title, sub, color, size, links:[[label,href]], phone, waText}) : full-screen viewer
     (swipe, arrows, double tap to zoom, thumbnails, send by WhatsApp, share, open in the store)
   - CanevaFoto.items(items, ctx) : garment chips with photo, color swatch, size and qty (tap = viewer)
   - CanevaFoto.look(item, catalog) : photo, color, color photo and store link of an order line (browser side)
   - CanevaFoto.swatch(color) / colorsOf(product) / resize(file)
   Any element with data-cvfoto='{"f":[urls],"t":"title",...}' opens the viewer. */
(function(){
  if(window.CanevaFoto)return;
  var HEX={'negro':'#141414','gris oscuro':'#4a4a4c','gris':'#8f8f91','gris claro':'#c4c4c4','blanco':'#f6f6f3','hueso':'#ece3d2','beige':'#d8c3a0','nude':'#ddb39b','camel':'#b98a55','cafe':'#6b4a32','chocolate':'#3d2a1f',
    'azul jean claro':'#94b2cf','azul jean':'#56739a','azul jean oscuro':'#2f405c','azul marino':'#1d2846','azul rey':'#2a4bb0','azul':'#3a63c4','celeste':'#a8cfe9','verde menta':'#a7dcc3','verde':'#2f8a57','verde oliva':'#6c6b3b','verde militar':'#4a5226',
    'amarillo':'#f1d13b','mostaza':'#c9a12a','naranja':'#ee7d2b','coral':'#f07f6f','terracota':'#b4573b','rojo':'#c3202b','rojo vino':'#7a1b2b','vinotinto':'#6a1727','rosado':'#f2b4c6','rosa':'#f2b4c6','rosa palo':'#e5c4c2','fucsia':'#d4277b','lila':'#c2a6d8','morado':'#5d3a86','dorado':'#d4af37','plateado':'#c0c4c8',
    'estampado':'linear-gradient(135deg,#d8c3a0 0 33%,#141414 33% 66%,#c3202b 66%)'};
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function flat(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();}
  function hex(n){var f=flat(n);if(HEX[f])return HEX[f];var k=Object.keys(HEX).sort(function(a,b){return b.length-a.length;}).find(function(h){return f.indexOf(h)>=0;});return k?HEX[k]:"";}
  function swatch(n,big){if(!n)return "";var h=hex(n);return '<span class="cvf-sw'+(big?' big':'')+'" title="'+esc(n)+'"><i style="background:'+(h||"conic-gradient(#f2b4c6,#c2a6d8,#a8cfe9,#a7dcc3,#f1d13b,#f2b4c6)")+'"></i>'+esc(n)+'</span>';}
  function isUrl(u){return /^https?:\/\//i.test(String(u||""));}
  function photosOf(p){if(!p)return [];return [p.imagen].concat(String(p.imagenesExtra||"").split(/\s*[,\n|]\s*/)).filter(isUrl).filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,8);}
  function colorsOf(p){var imgs=photosOf(p),out=[];
    String((p&&p.colores)||"").split(/\s*(?:,|;|\n)\s*/).forEach(function(part){if(!part)return;var i=part.indexOf("="),n=(i<0?part:part.slice(0,i)).trim(),u=i<0?"":part.slice(i+1).trim();if(!n||n.length>40)return;
      if(u&&!isUrl(u)){var f=flat(u);u=imgs.find(function(x){var y=flat(decodeURIComponent(x.split("?")[0]));return y.slice(-f.length)===f;})||"";}
      if(!out.some(function(o){return flat(o.n)===flat(n);}))out.push({n:n,u:u});});return out;}
  function slug(p){return [p.nombre,p.categoria,String(p.precio||"").replace(/[^\d]/g,"")].map(function(x){return flat(x).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}).join("--");}
  function look(it,catalog){
    if(it&&it.look)return it.look;
    var full=String((it&&it.nombre)||""),m=full.match(/\s·\s*Color:\s*(.+)$/i),base=(m?full.slice(0,m.index):full.split(" · ")[0]).trim(),color=(it&&it.color)||(m?m[1]:"");
    var C=catalog||[],p=(it&&it.pid&&C.find(function(x){return x.id===it.pid;}))||C.find(function(x){return x.nombre===base;})||C.find(function(x){return flat(x.nombre)===flat(base);})||null;
    var opts=p?colorsOf(p):[],o=color?opts.find(function(c){return flat(c.n)===flat(color);}):null,cp=o&&o.u?o.u:"";
    var fotos=[cp,isUrl(it&&it.imagen)?it.imagen:""].concat(photosOf(p)).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,8);
    return {base:base,color:color,colorPhoto:cp,imagen:fotos[0]||"",fotos:fotos,pid:p?p.id:((it&&it.pid)||""),link:p?"https://canevacol.com/?p="+encodeURIComponent(slug(p)):"",colors:opts.map(function(c){return c.n;})};
  }
  function css(){if(document.getElementById("cvf-css"))return;var s=document.createElement("style");s.id="cvf-css";s.textContent=
    ".cvf-sw{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:2px 8px 2px 3px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#f6f7f8;vertical-align:middle;white-space:nowrap}.cvf-sw i{width:13px;height:13px;border-radius:50%;border:1px solid rgba(255,255,255,.35);display:inline-block}.cvf-sw.big{font-size:13px;padding:4px 11px 4px 4px}.cvf-sw.big i{width:18px;height:18px}"+
    ".cvf-its{display:flex;flex-direction:column;gap:7px;margin:6px 0}.cvf-it{display:flex;gap:10px;align-items:center;padding:6px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%}.cvf-it:hover{border-color:rgba(207,230,255,.35)}"+
    ".cvf-th{position:relative;flex:0 0 auto;width:54px;height:68px;border-radius:10px;overflow:hidden;background:#1b1b1f;display:grid;place-items:center;font-size:20px}.cvf-th img{width:100%;height:100%;object-fit:cover}.cvf-th b{position:absolute;right:3px;bottom:3px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;border-radius:999px;padding:1px 5px}"+
    ".cvf-in{min-width:0;flex:1}.cvf-in .n{font-weight:700;font-size:13.5px;line-height:1.25}.cvf-in .d{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;align-items:center;font-size:11.5px;color:rgba(246,247,248,.7)}.cvf-in .d .sz{padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.18)}.cvf-go{font-size:11px;color:#cfe6ff;white-space:nowrap}"+
    ".cvf-ov{position:fixed;inset:0;z-index:100050;background:rgba(3,3,4,.96);display:flex;flex-direction:column;color:#f6f7f8;font-family:Inter,system-ui,sans-serif;animation:cvfIn .18s}@keyframes cvfIn{from{opacity:0}}"+
    ".cvf-top{display:flex;align-items:center;gap:10px;padding:12px 14px}.cvf-top .tt{flex:1;min-width:0}.cvf-top b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cvf-top small{font-size:12px;color:rgba(246,247,248,.65)}.cvf-x{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;font-size:20px;cursor:pointer}"+
    ".cvf-stage{position:relative;flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:pan-y}.cvf-stage img{max-width:100%;max-height:100%;object-fit:contain;transition:transform .25s;user-select:none;-webkit-user-drag:none}.cvf-stage.zoom{overflow:auto;cursor:zoom-out;display:block}.cvf-stage.zoom img{max-width:none;max-height:none;width:200%}"+
    ".cvf-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:22px;cursor:pointer}.cvf-nav.l{left:10px}.cvf-nav.r{right:10px}.cvf-cnt{position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:12px;background:rgba(0,0,0,.55);padding:3px 10px;border-radius:999px}"+
    ".cvf-strip{display:flex;gap:6px;padding:8px 14px;overflow-x:auto;scrollbar-width:none}.cvf-strip img{width:52px;height:64px;object-fit:cover;border-radius:9px;opacity:.5;cursor:pointer;border:2px solid transparent}.cvf-strip img.on{opacity:1;border-color:#cfe6ff}"+
    ".cvf-act{display:flex;flex-wrap:wrap;gap:7px;padding:8px 14px calc(14px + env(safe-area-inset-bottom));justify-content:center}.cvf-act a,.cvf-act button{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;padding:10px 14px;font:700 12.5px Inter,sans-serif;text-decoration:none;cursor:pointer}.cvf-act .wa{background:#25d366;border-color:#25d366;color:#04140a}.cvf-act .pri{background:linear-gradient(120deg,#cfd6db,#fff 45%,#e8eef2);color:#050505;border:0}"+
    ".cvf-its.mini{flex-direction:row;flex-wrap:wrap;gap:6px}.cvf-its.mini .cvf-it{width:auto;max-width:100%;padding:4px 10px 4px 4px;border-radius:999px;gap:7px}.cvf-its.mini .cvf-th{width:30px;height:30px;border-radius:50%;font-size:14px}.cvf-its.mini .cvf-th b{display:none}.cvf-its.mini .cvf-in .n{font-size:12.5px;font-weight:600}.cvf-its.mini .cvf-in .d{margin-top:1px}.cvf-its.mini .cvf-go{display:none}.cvf-its.mini .cvf-in{display:flex;align-items:center;gap:6px;flex-wrap:wrap}"+
    ".cvf-none{padding:40px;text-align:center;color:rgba(246,247,248,.7)}";
    document.head.appendChild(s);}
  var V={f:[],i:0,o:{}};
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d.length>=11?d:"";}
  function show(){var ov=document.getElementById("cvfOv");if(!ov)return;var u=V.f[V.i]||"";
    var st=ov.querySelector(".cvf-stage");st.classList.remove("zoom");
    st.innerHTML=u?'<img src="'+esc(u)+'" alt="">'+(V.f.length>1?'<button type="button" class="cvf-nav l" data-cvf="prev">‹</button><button type="button" class="cvf-nav r" data-cvf="next">›</button><span class="cvf-cnt">'+(V.i+1)+' / '+V.f.length+'</span>':''):'<div class="cvf-none">📷 Esta prenda no tiene foto todavía.<br>Súbela en Productos o agrega una foto de referencia.</div>';
    ov.querySelectorAll(".cvf-strip img").forEach(function(im,k){im.classList.toggle("on",k===V.i);});
    var w=ov.querySelector("[data-cvf-wa]");if(w)w.href="https://wa.me/"+waNum(V.o.phone)+"?text="+encodeURIComponent((V.o.waText||"Hola ✨ te comparto la foto de tu prenda CΛNEVΛ"+(V.o.color?" en color "+V.o.color:"")+":")+"\n"+u);}
  function open(fotos,o){css();o=o||{};V.f=(fotos||[]).filter(isUrl).filter(function(v,i,a){return a.indexOf(v)===i;});V.i=Math.max(0,Math.min(V.f.length-1,o.start|0));V.o=o;close();
    var ov=document.createElement("div");ov.className="cvf-ov";ov.id="cvfOv";
    var links=(o.links||[]).filter(function(l){return l&&l[1];});
    ov.innerHTML='<div class="cvf-top"><div class="tt"><b>'+esc(o.title||"Foto")+'</b><small>'+[o.sub?esc(o.sub):"",o.size?"Talla "+esc(o.size):""].filter(Boolean).join(" · ")+'</small> '+(o.color?swatch(o.color,true):"")+'</div><button type="button" class="cvf-x" data-cvf="x" aria-label="Cerrar">×</button></div>'+
      '<div class="cvf-stage"></div>'+(V.f.length>1?'<div class="cvf-strip">'+V.f.map(function(u,k){return '<img src="'+esc(u)+'" data-cvi="'+k+'" alt="">';}).join("")+'</div>':'')+
      '<div class="cvf-act">'+links.map(function(l){return '<a href="'+esc(l[1])+'" target="_blank" rel="noopener"'+(l[2]?' class="'+l[2]+'"':'')+'>'+esc(l[0])+'</a>';}).join("")+
        (V.f.length&&waNum(o.phone)?'<a class="wa" data-cvf-wa data-direct="1" target="_blank" rel="noopener" href="#">💬 Enviarle la foto</a>':'')+
        (V.f.length?'<button type="button" data-cvf="share">↗ Compartir</button><a href="#" data-cvf="full" target="_blank" rel="noopener">⤢ Original</a>':'')+'</div>';
    document.body.appendChild(ov);document.documentElement.style.overflow="hidden";show();
    var x0=null;
    ov.addEventListener("touchstart",function(e){if(e.target.closest(".cvf-stage")&&!e.target.closest(".zoom"))x0=e.touches[0].clientX;},{passive:true});
    ov.addEventListener("touchend",function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50){V.i=(V.i+(dx<0?1:-1)+V.f.length)%V.f.length;show();}});
    var lastTap=0;
    ov.addEventListener("click",function(e){var b=e.target.closest("[data-cvf],[data-cvi]");
      if(e.target.tagName==="IMG"&&e.target.closest(".cvf-stage")){var n=Date.now();if(n-lastTap<350||!("ontouchstart" in window)){e.target.parentNode.classList.toggle("zoom");}lastTap=n;return;}
      if(!b){if(e.target.classList.contains("cvf-stage"))close();return;}
      if(b.dataset.cvi){V.i=+b.dataset.cvi;show();return;}
      var a=b.dataset.cvf;
      if(a==="x"){close();return;}
      if(a==="prev"||a==="next"){V.i=(V.i+(a==="next"?1:-1)+V.f.length)%V.f.length;show();return;}
      if(a==="full"){b.href=V.f[V.i]||"#";return;}
      if(a==="share"){var u=V.f[V.i];if(navigator.share)navigator.share({title:o.title||"CΛNEVΛ",text:(o.title||"")+(o.color?" · "+o.color:""),url:u}).catch(function(){});else{try{navigator.clipboard.writeText(u);}catch(x){}b.textContent="✓ Enlace copiado";}return;}
    });
    document.addEventListener("keydown",key);}
  function key(e){if(!document.getElementById("cvfOv"))return;if(e.key==="Escape")close();if(e.key==="ArrowRight"||e.key==="ArrowLeft"){V.i=(V.i+(e.key==="ArrowRight"?1:-1)+V.f.length)%Math.max(1,V.f.length);show();}}
  function close(){var o=document.getElementById("cvfOv");if(o){o.remove();document.documentElement.style.overflow="";}document.removeEventListener("keydown",key);}
  // garment chips: photo, name, color, size, qty — tap opens the viewer
  function items(list,ctx){css();ctx=ctx||{};
    return '<div class="cvf-its'+(ctx.mini?' mini':'')+'">'+(list||[]).map(function(it){var L=look(it,ctx.catalog),f=L.fotos.concat(ctx.refs||[]).filter(function(v,i,a){return a.indexOf(v)===i;});
      var data={f:f,t:L.base||it.nombre,c:L.color||"",z:it.size||"",s:ctx.sub||"",p:ctx.phone||"",l:[L.link?["🛍 Ver en la tienda",L.link]:null,ctx.orderUrl?["🧾 Pedido con fotos",ctx.orderUrl]:null].filter(Boolean)};
      return '<button type="button" class="cvf-it" data-cvfoto="'+esc(JSON.stringify(data))+'"><span class="cvf-th">'+(L.imagen?'<img src="'+esc(L.imagen)+'" alt="" loading="lazy">':'👗')+(f.length>1?'<b>'+f.length+'</b>':'')+'</span>'+
        '<span class="cvf-in"><span class="n">'+esc(L.base||it.nombre)+'</span><span class="d">'+(L.color?swatch(L.color):(ctx.noColorHint?'<span style="color:#ffc478">🎨 sin color</span>':''))+(it.size?'<span class="sz">Talla '+esc(it.size)+'</span>':'')+((it.qty||1)>1?'<span class="sz">×'+it.qty+'</span>':'')+(it.precio&&ctx.price?'<span>'+esc(it.precio)+'</span>':'')+'<span class="cvf-go">📷 ver'+(f.length>1?' '+f.length+' fotos':' foto')+'</span></span></span></button>';}).join("")+'</div>';}
  // reference photo from the phone: resized to 1400 px JPEG before upload
  function resize(file,max){max=max||1400;return new Promise(function(ok,ko){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.85));};im.onerror=function(){ko(new Error("No se pudo leer la foto"));};im.src=r.result;};r.onerror=function(){ko(new Error("No se pudo leer la foto"));};r.readAsDataURL(file);});}
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-cvfoto]");if(!b)return;e.preventDefault();var d={};try{d=JSON.parse(b.getAttribute("data-cvfoto"));}catch(x){return;}
    open(d.f,{title:d.t,color:d.c,size:d.z,sub:d.s,phone:d.p,links:d.l,start:d.i||0});});
  window.CanevaFoto={open:open,close:close,items:items,look:look,swatch:swatch,colorsOf:colorsOf,photosOf:photosOf,resize:resize,hex:hex};
})();
