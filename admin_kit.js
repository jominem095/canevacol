/* CANEVA admin · Kit de historias (v1)
   One tap = today's ready-made stories (1080x1920) for WhatsApp Estados / Instagram, built only from real data:
   newest garment, most viewed in the last 24 h (/pulse), last units (real inventory), a real customer (/admin/reviews)
   and the real shipping promo. Each one carries its available sizes and price. Share several at once (phone share
   sheet → WhatsApp Estado) and copy a message with tracked links (utm_source=whatsapp&utm_medium=estado).
   Mounted by admin_movil.html: CanevaKit.mount(el, {api, token}) */
(function(){
  var S={el:null,o:null,items:[],sel:{},busy:false};
  var SITE="https://canevacol.com";
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function f(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
  function slug(p){return [f(p.nombre),f(p.categoria),String(p.precio||"").replace(/[^\d]/g,"")].filter(Boolean).join("--");}
  function link(p,tag){return SITE+"/?p="+encodeURIComponent(slug(p))+"&utm_source=whatsapp&utm_medium=estado&utm_content="+encodeURIComponent(tag||"kit");}
  function hidden(p){var s=String(p.stock||"").trim().toLowerCase();return /^0+$/.test(s)||s.indexOf("agotad")===0||s.indexOf("ocult")===0||/domicil|domicl|mayorista|others|tarjeta/i.test(p.categoria||"");}
  function photo(p){return /^https?:/.test(p.imagen||"")?p.imagen:"";}
  function sizes(p){
    if(p.inv&&typeof p.inv==="object"){return Object.keys(p.inv).filter(function(z){return (p.inv[z]|0)>0;});}
    var t=String(p.tallas||""),out=[];(t.match(/\b(XXS|XS|S|M|L|XL|XXL|[0-9]{1,2})\b/gi)||[]).forEach(function(x){x=x.toUpperCase();if(out.indexOf(x)<0)out.push(x);});return out;}
  function total(p){return p.inv?Object.keys(p.inv).reduce(function(s,z){return s+Math.max(0,p.inv[z]|0);},0):null;}
  function pub(path){return fetch(S.o.api+path).then(function(r){return r.json();});}
  function adm(path){return fetch(S.o.api+path,{headers:{"x-admin-token":S.o.token()}}).then(function(r){return r.json();});}
  function toast(t){var d=document.createElement("div");d.className="kt-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2600);}
  function loadImg(u){return new Promise(function(ok,ko){var i=new Image();i.crossOrigin="anonymous";i.onload=function(){ok(i);};i.onerror=ko;i.src="https://wsrv.nl/?url="+encodeURIComponent(u)+"&w=1080&h=1350&fit=cover&a=attention&output=jpg";});}

  function css(){if(document.getElementById("kt-css"))return;var s=document.createElement("style");s.id="kt-css";s.textContent=
    ".kt{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".kt-hero{border-radius:24px;padding:18px;margin:4px 0 12px;background:radial-gradient(520px 240px at 0% 0%,rgba(207,227,245,.16),transparent 60%),linear-gradient(180deg,#121215,#0a0a0c);border:1px solid rgba(246,247,248,.12)}"+
    ".kt-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px}.kt-hero p{margin:6px 0 0;font-size:13px;color:rgba(246,247,248,.72);line-height:1.5}"+
    ".kt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}"+
    ".kt-c{position:relative;border-radius:16px;overflow:hidden;border:2px solid rgba(246,247,248,.12);background:#0e0e10;cursor:pointer;padding:0;color:#f6f7f8;text-align:left}"+
    ".kt-c.on{border-color:#cfe3f5;box-shadow:0 0 0 2px rgba(207,227,245,.25)}.kt-c img{width:100%;aspect-ratio:9/16;object-fit:cover;display:block;background:#151517}"+
    ".kt-c .ck{position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:14px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.4)}"+
    ".kt-c.on .ck{background:#cfe3f5;color:#050505}.kt-c .lb{padding:7px 9px;font-size:11px}.kt-c .lb b{display:block;font-size:12px}"+
    ".kt-bar{position:sticky;bottom:72px;z-index:5;display:flex;gap:8px;margin-top:14px}"+
    ".kt-bar button{flex:1;border:0;border-radius:999px;padding:13px 10px;font:800 13px Inter,sans-serif;cursor:pointer}"+
    ".kt-bar .p{background:linear-gradient(135deg,#fff,#cfd6db);color:#050505}.kt-bar .s{background:#25d366;color:#04140a}.kt-bar button[disabled]{opacity:.5}"+
    ".kt-msg{margin-top:12px;border-radius:16px;border:1px solid rgba(246,247,248,.12);background:#0e0e10;padding:12px;font-size:12px;white-space:pre-wrap;color:rgba(246,247,248,.85)}"+
    ".kt-empty{padding:30px 12px;text-align:center;color:rgba(246,247,248,.6);font-size:13px}"+
    ".kt-toast{position:fixed;left:50%;bottom:140px;transform:translateX(-50%);z-index:99;background:#f6f7f8;color:#050505;padding:10px 16px;border-radius:999px;font:600 13px Inter,sans-serif}";
    document.head.appendChild(s);}

  // ---------- the story template (black, silver and diamond light) ----------
  async function draw(it){
    var W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;var x=c.getContext("2d");
    var g=x.createRadialGradient(W/2,560,60,W/2,900,1300);g.addColorStop(0,"#1b2028");g.addColorStop(.5,"#0a0b0e");g.addColorStop(1,"#030304");x.fillStyle=g;x.fillRect(0,0,W,H);
    x.fillStyle="rgba(255,255,255,.75)";[[120,250,4],[960,330,6],[70,1180,3],[1010,1050,4],[150,1700,3],[930,1760,4]].forEach(function(p){x.beginPath();x.arc(p[0],p[1],p[2],0,7);x.fill();});
    x.textAlign="center";x.fillStyle="#f4f8ff";x.font="300 46px Montserrat, Inter, sans-serif";try{x.letterSpacing="22px";}catch(e){}x.fillText("CΛNEVΛ",W/2+11,120);try{x.letterSpacing="0px";}catch(e){}
    // photo card
    var px=90,py=230,pw=900,ph=1125,r=44;
    x.save();x.beginPath();if(x.roundRect)x.roundRect(px,py,pw,ph,r);else x.rect(px,py,pw,ph);x.clip();
    if(it.img){try{x.drawImage(it.img,px,py,pw,ph);}catch(e){}}else{x.fillStyle="#151517";x.fillRect(px,py,pw,ph);}
    var sh=x.createLinearGradient(0,py+ph-420,0,py+ph);sh.addColorStop(0,"rgba(0,0,0,0)");sh.addColorStop(1,"rgba(0,0,0,.82)");x.fillStyle=sh;x.fillRect(px,py+ph-420,pw,420);x.restore();
    x.strokeStyle="rgba(230,240,255,.55)";x.lineWidth=2;x.beginPath();if(x.roundRect)x.roundRect(px,py,pw,ph,r);else x.rect(px,py,pw,ph);x.stroke();
    // label chip
    x.font="800 30px Inter, sans-serif";var lw=x.measureText(it.tag).width+70;var lx=W/2-lw/2,ly=py-34;
    var lg=x.createLinearGradient(lx,0,lx+lw,0);lg.addColorStop(0,"#dfe6ea");lg.addColorStop(.5,"#ffffff");lg.addColorStop(1,"#c9d1d6");x.fillStyle=lg;x.beginPath();if(x.roundRect)x.roundRect(lx,ly,lw,68,34);else x.rect(lx,ly,lw,68);x.fill();
    x.fillStyle="#050505";x.fillText(it.tag,W/2,ly+46);
    // text over the photo bottom
    if(it.quote){x.fillStyle="#f4f8ff";x.font='italic 300 54px "Cormorant Garamond", Georgia, serif';var lines=wrap(x,"“"+it.quote+"”",780);lines.slice(0,3).forEach(function(l,i){x.fillText(l,W/2,py+ph-200+i*62-(Math.min(3,lines.length)-1)*31);});
      x.font="600 34px Inter, sans-serif";x.fillStyle="rgba(244,248,255,.85)";x.fillText(it.who||"",W/2,py+ph-48);}
    // name, price, sizes
    x.fillStyle="#f4f8ff";x.font='italic 300 96px "Cormorant Garamond", Georgia, serif';var nl=wrap(x,it.title,900);x.fillText(nl[0]||"",W/2,1480);
    if(it.price){x.font="700 62px Inter, sans-serif";x.fillText(it.price,W/2,1572);}
    if(it.sub){x.font="500 34px Inter, sans-serif";x.fillStyle="rgba(244,248,255,.75)";x.fillText(it.sub,W/2,1636);}
    // CTA
    var bw=700,bx=(W-bw)/2,by=1690;var bg=x.createLinearGradient(bx,0,bx+bw,0);bg.addColorStop(0,"#cfd6db");bg.addColorStop(.5,"#ffffff");bg.addColorStop(1,"#c3ccd2");x.fillStyle=bg;x.beginPath();if(x.roundRect)x.roundRect(bx,by,bw,100,50);else x.rect(bx,by,bw,100);x.fill();
    x.fillStyle="#050505";x.font="800 36px Inter, sans-serif";x.fillText(it.cta||"Pídela en canevacol.com",W/2,by+63);
    x.fillStyle="rgba(244,248,255,.6)";x.font="500 30px Inter, sans-serif";x.fillText("@caneva.col · Envíos a toda Colombia",W/2,1862);
    return c;
  }
  function wrap(x,t,max){var w=String(t||"").split(/\s+/),out=[],cur="";w.forEach(function(s){var tt=cur?cur+" "+s:s;if(x.measureText(tt).width>max&&cur){out.push(cur);cur=s;}else cur=tt;});if(cur)out.push(cur);return out;}

  // ---------- today's picks (real data only) ----------
  async function build(){
    var res=await Promise.all([pub("/catalog").catch(function(){return {};}),pub("/pulse").catch(function(){return {};}),adm("/admin/reviews").catch(function(){return {};}),pub("/config").catch(function(){return {};})]);
    var cat=((res[0]&&res[0].products)||[]).filter(function(p){return !hidden(p)&&photo(p)&&p.nombre;}),used={},out=[];
    function add(p,tag,why,extra){if(!p||used[p.nombre])return;used[p.nombre]=1;var zs=sizes(p);out.push(Object.assign({kind:"p",p:p,tag:tag,why:why,title:p.nombre,price:p.precio||"",sub:zs.length?"Tallas disponibles: "+zs.join(" · "):"",cta:"Pídela en canevacol.com",url:link(p,f(tag))},extra||{}));}
    var newest=cat.filter(function(p){return Date.parse(p.addedAt||"");}).sort(function(a,b){return Date.parse(b.addedAt)-Date.parse(a.addedAt);});
    add(newest[0],"✨ NUEVO","La prenda más nueva de la tienda");
    var hot=((res[1]&&res[1].hot)||[]).map(function(n){return cat.find(function(p){return p.nombre===n;});}).filter(Boolean);
    add(hot.find(function(p){return !used[p.nombre];}),"🔥 LA MÁS VISTA","La más vista en las últimas 24 horas en tu tienda");
    var low=cat.filter(function(p){var t=total(p);return t!==null&&t>0&&t<=2;}).sort(function(a,b){return total(a)-total(b);});
    var l0=low.find(function(p){return !used[p.nombre];});if(l0){var t0=total(l0);add(l0,t0===1?"💎 ÚLTIMA UNIDAD":"💎 ÚLTIMAS "+t0+" UNIDADES","Inventario real: quedan "+t0);}
    var rv=((res[2]&&res[2].list)||[]).filter(function(r){return !r.hidden&&r.img;});
    if(rv.length){var r=rv[0],rp=cat.find(function(p){return (r.pid&&p.id===r.pid)||(r.product&&p.nombre===r.product);});
      out.push({kind:"r",tag:"⭐ CLIENTA REAL",why:"La última clienta que publicaste en ⭐ Clientas",imgUrl:r.img,quote:r.text||"",who:[r.name,r.city].filter(Boolean).join(" · "),title:rp?rp.nombre:"Clientas CΛNEVΛ",price:rp?rp.precio:"",sub:"",cta:rp?"Pídela en canevacol.com":"Mira más en canevacol.com",url:rp?link(rp,"clienta-real"):SITE+"/?utm_source=whatsapp&utm_medium=estado#cvRevs",p:rp||null});}
    var cfg=res[3]&&(res[3].config||res[3]),pr=cfg&&cfg.promo;
    var extra=hot.concat(newest).find(function(p){return !used[p.nombre];})||cat.find(function(p){return !used[p.nombre];});
    if(pr&&pr.enabled&&pr.kind==="envio"&&pr.min>1&&extra){add(extra,"🚚 ENVÍO GRATIS","Promo real de tu tienda: envío gratis llevando "+pr.min,{sub:"Envío gratis llevando "+pr.min+" prendas",cta:"Arma tu pedido en canevacol.com"});}
    else add(extra,"🖤 PARA TI","Otra prenda que se está moviendo");
    return out;
  }
  async function render(){
    S.el.innerHTML='<div class="kt"><div class="kt-hero"><h2>🎬 Kit de historias de hoy</h2><p>Tus estados de WhatsApp e historias de Instagram listos en un toque, con datos reales de tu tienda: lo más nuevo, lo más visto, últimas unidades, una clienta real y tu promo. Cada enlace queda medido en Reportes (WhatsApp · estado).</p></div><div class="kt-empty">✨ Creando tus historias…</div></div>';
    try{S.items=await build();}catch(e){S.items=[];}
    if(!S.items.length){S.el.querySelector(".kt-empty").textContent="No pude armar el kit. Revisa tu conexión e intenta otra vez.";return;}
    for(var i=0;i<S.items.length;i++){var it=S.items[i];try{it.img=await loadImg(it.kind==="r"?it.imgUrl:photo(it.p));}catch(e){it.img=null;}it.canvas=await draw(it);it.preview=it.canvas.toDataURL("image/jpeg",.6);S.sel[i]=true;}
    paint();
  }
  function paint(){
    var n=Object.keys(S.sel).filter(function(k){return S.sel[k];}).length;
    S.el.innerHTML='<div class="kt"><div class="kt-hero"><h2>🎬 Kit de historias de hoy</h2><p>'+S.items.length+' historias listas con datos reales. Toca para quitar o poner, y compártelas de una a tu Estado de WhatsApp o a Instagram.</p></div>'+
      '<div class="kt-grid">'+S.items.map(function(it,i){return '<button type="button" class="kt-c'+(S.sel[i]?' on':'')+'" data-i="'+i+'"><img src="'+it.preview+'" alt=""><span class="ck">'+(S.sel[i]?'✓':'')+'</span><div class="lb"><b>'+esc(it.tag)+'</b>'+esc(it.why)+'</div></button>';}).join("")+'</div>'+
      '<div class="kt-bar"><button type="button" class="p" data-a="share"'+(n?'':' disabled')+'>📲 Compartir '+n+'</button><button type="button" class="s" data-a="text">💬 Copiar mensaje</button></div>'+
      '<div class="kt-msg" id="ktMsg">'+esc(msg())+'</div><p style="font-size:11px;color:rgba(246,247,248,.5);margin:10px 4px">En el celular, “Compartir” abre la lista de apps: elige WhatsApp → Mi estado, o Instagram → Historia. En computador se descargan las imágenes.</p></div>';
  }
  function msg(){var it=S.items.filter(function(x,i){return S.sel[i]&&x.p;});if(!it.length)return "";
    return "✨ Hoy en CΛNEVΛ 💎\n\n"+it.map(function(x){return "• "+x.p.nombre+(x.p.precio?" · "+x.p.precio:"")+"\n  "+x.url;}).join("\n")+"\n\nEnvíos a toda Colombia 🚚 · Pide aquí 👆";}
  async function share(){
    if(S.busy)return;S.busy=true;
    var files=[];for(var i=0;i<S.items.length;i++){if(!S.sel[i])continue;var it=S.items[i];var b=await new Promise(function(r){it.canvas.toBlob(r,"image/jpeg",.92);});files.push(new File([b],"caneva-historia-"+(i+1)+".jpg",{type:"image/jpeg"}));}
    try{
      if(navigator.canShare&&navigator.canShare({files:files})){await navigator.share({files:files});}
      else{files.forEach(function(fl,k){setTimeout(function(){var a=document.createElement("a");a.href=URL.createObjectURL(fl);a.download=fl.name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);},k*350);});toast("📥 Descargando "+files.length+" historias");}
    }catch(e){}
    S.busy=false;
  }
  function mount(el,o){S.el=el;S.o=o;css();
    if(!el.dataset.kt){el.dataset.kt="1";el.addEventListener("click",function(e){
      var c=e.target.closest("[data-i]");if(c){var i=+c.dataset.i;S.sel[i]=!S.sel[i];paint();return;}
      var a=e.target.closest("[data-a]");if(!a)return;
      if(a.dataset.a==="share")share();
      if(a.dataset.a==="text"){var t=msg();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast("✓ Mensaje copiado con los enlaces");}).catch(function(){toast("Mantén presionado el mensaje para copiarlo");});}
    });}
    render();
  }
  window.CanevaKit={mount:mount,reload:render};
})();
