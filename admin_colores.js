/* CANEVA Admin — Colores (color range of every garment).
   Scans every catalog photo in the browser, detects the garment color, builds the store's color range
   and saves "colores" per product. Shared by admin.html and admin_movil.html.
   Usage: CanevaColores.mount(element, { api, token: () => "..." })
   Needs Worker v44 (/admin/colors and /admin/imgx). */
(function(){
  "use strict";
  var OPT={api:"https://caneva-ai.canevacol.workers.dev",token:function(){try{return localStorage.getItem("caneva_admin_token_v1")||"";}catch(e){return "";}}};
  var SCAN_KEY="caneva_color_scan_v2";

  // Fashion color names (Spanish) with reference sRGB values. Shared naming with the store.
  var PALETTE=[
    ["Negro","#141414"],["Gris oscuro","#4a4a4c"],["Gris","#8f8f91"],["Gris claro","#c4c4c4"],["Blanco","#f6f6f3"],["Hueso","#ece3d2"],
    ["Beige","#d8c3a0"],["Nude","#ddb39b"],["Camel","#b98a55"],["Café","#6b4a32"],["Chocolate","#3d2a1f"],
    ["Azul jean claro","#94b2cf"],["Azul jean","#56739a"],["Azul jean oscuro","#2f405c"],["Azul marino","#1d2846"],["Azul rey","#2a4bb0"],["Celeste","#a8cfe9"],
    ["Verde menta","#a7dcc3"],["Verde","#2f8a57"],["Verde oliva","#6c6b3b"],["Verde militar","#4a5226"],
    ["Amarillo","#f1d13b"],["Mostaza","#c9a12a"],["Naranja","#ee7d2b"],["Coral","#f07f6f"],["Terracota","#b4573b"],
    ["Rojo","#c3202b"],["Vinotinto","#6a1727"],["Rosado","#f2b4c6"],["Rosa palo","#e5c4c2"],["Fucsia","#d4277b"],["Lila","#c2a6d8"],["Morado","#5d3a86"],
    ["Estampado","linear-gradient(135deg,#d8c3a0 0 33%,#141414 33% 66%,#c3202b 66%)"]
  ];
  var HEX={};PALETTE.forEach(function(c){HEX[c[0].toLowerCase()]=c[1];});
  var LAB=PALETTE.filter(function(c){return c[1].charAt(0)==="#";}).map(function(c){var h=c[1];return {n:c[0],lab:rgb2lab(parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16))};});

  var S={el:null,list:[],scan:{},edit:{},q:"",flt:"todas",col:"",busy:false,done:0,total:0};

  // ---------- helpers ----------
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m];});}
  function flat(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
  function swatch(name){var h=HEX[String(name||"").toLowerCase()];return h?(h.charAt(0)==="#"?"background:"+h:"background:"+h):"background:linear-gradient(135deg,#777,#333)";}
  function images(p){return [p.imagen].concat(String(p.imagenesExtra||"").split(/\s*(?:\||\n|;|,)\s*/)).map(function(u){return String(u||"").trim();}).filter(function(u,k,a){return u.indexOf("http")===0&&a.indexOf(u)===k;});}
  function isService(p){var c=flat(p.categoria);return c.indexOf("domicilio")>=0||c.indexOf("domicl")>=0||c.indexOf("mayorista")>=0||c.indexOf("others")>=0;}
  function toast(msg,err){var t=document.getElementById("ccToast");if(!t){t=document.createElement("div");t.id="ccToast";document.body.appendChild(t);}t.textContent=msg;t.className="cc-toast"+(err?" err":"");clearTimeout(toast.t);toast.t=setTimeout(function(){t.className="cc-toast cc-hide";},err?8000:4000);}
  function api(path,opts){
    opts=opts||{};
    return fetch(OPT.api+path,{method:opts.method||"GET",headers:{"x-admin-token":OPT.token(),"Content-Type":"application/json"},body:opts.body?JSON.stringify(opts.body):undefined})
      .then(function(res){return res.json().catch(function(){return {};}).then(function(d){
        if(res.status===401||res.status===403)throw new Error("Token inválido.");
        if(res.status===404)throw new Error("Falta pegar el Worker v44 en Cloudflare.");
        if(!res.ok||!d.ok)throw new Error(d.error||("Error "+res.status));return d;});});
  }
  function loadScan(){try{S.scan=JSON.parse(localStorage.getItem(SCAN_KEY)||"{}")||{};}catch(e){S.scan={};}}
  function saveScan(){try{localStorage.setItem(SCAN_KEY,JSON.stringify(S.scan));}catch(e){}}

  // "Negro=url, Beige" -> [{n:"Negro",u:"url"},{n:"Beige",u:""}]; file names are resolved against the product photos
  function parseColors(v,imgs){
    var out=[];String(v||"").split(/\s*(?:,|;|\n)\s*/).forEach(function(part){
      if(!part)return;var i=part.indexOf("="),n=(i<0?part:part.slice(0,i)).trim(),u=i<0?"":part.slice(i+1).trim();
      if(!n||n.length>40)return;
      if(u&&u.indexOf("http")!==0){var f=flat(u);u=(imgs||[]).find(function(x){return flat(decodeURIComponent(x.split("?")[0])).slice(-f.length)===f;})||"";}
      if(!out.some(function(o){return flat(o.n)===flat(n);}))out.push({n:n,u:u});
    });return out;
  }
  // Product model in this tab: color per photo + extra colors without photo
  function modelFromSaved(p){
    var imgs=images(p),cs=parseColors(p.colores,imgs),photo=imgs.map(function(u){var c=cs.find(function(x){return x.u===u;});return c?c.n:"";});
    return {photo:photo,extra:cs.filter(function(c){return !c.u||imgs.indexOf(c.u)<0;}).map(function(c){return c.n;})};
  }
  function modelFromScan(p){var imgs=images(p);return {photo:imgs.map(function(u){var r=S.scan[u];return r&&r.n?r.n:"";}),extra:[]};}
  function model(i){return S.edit[i]||modelFromSaved(S.list[i]);}
  function serialize(p,m){
    var imgs=images(p),seen={},parts=[];
    m.photo.forEach(function(n,k){if(!n||seen[flat(n)])return;seen[flat(n)]=1;parts.push(n+"="+imgs[k]);});
    m.extra.forEach(function(n){if(!n||seen[flat(n)])return;seen[flat(n)]=1;parts.push(n);});
    return parts.join(", ");
  }
  function names(i){var p=S.list[i],m=model(i),seen={},out=[];m.photo.concat(m.extra).forEach(function(n){if(n&&!seen[flat(n)]){seen[flat(n)]=1;out.push(n);}});return out;}
  function dirty(i){return !!S.edit[i]&&serialize(S.list[i],S.edit[i])!==String(S.list[i].colores||"");}
  function dirtyList(){return Object.keys(S.edit).filter(dirty);}

  // ---------- color science ----------
  function rgb2lab(r,g,b){
    function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
    var R=lin(r),G=lin(g),B=lin(b);
    var x=(R*0.4124+G*0.3576+B*0.1805)/0.95047,y=R*0.2126+G*0.7152+B*0.0722,z=(R*0.0193+G*0.1192+B*0.9505)/1.08883;
    function f(t){return t>0.008856?Math.cbrt(t):7.787*t+16/116;}
    var fx=f(x),fy=f(y),fz=f(z);return [116*fy-16,500*(fx-fy),200*(fy-fz)];
  }
  function dE(a,b){var dl=a[0]-b[0],da=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dl*dl*0.7+da*da+db*db);}
  function nameOf(lab){var best=null,bd=1e9;LAB.forEach(function(c){var d=dE(lab,c.lab);if(d<bd){bd=d;best=c.n;}});return best;}
  function lab2hex(l){
    var fy=(l[0]+16)/116,fx=fy+l[1]/500,fz=fy-l[2]/200;
    function fi(t){return t*t*t>0.008856?t*t*t:(t-16/116)/7.787;}
    var x=fi(fx)*0.95047,y=fi(fy),z=fi(fz)*1.08883;
    var r=x*3.2406-y*1.5372-z*0.4986,g=-x*0.9689+y*1.8758+z*0.0415,b=x*0.0557-y*0.2040+z*1.0570;
    function gm(c){c=c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;return Math.max(0,Math.min(255,Math.round(c*255)));}
    return "#"+[r,g,b].map(function(c){return ("0"+gm(c).toString(16)).slice(-2);}).join("");
  }
  function isSkin(r,g,b){return r>95&&g>40&&b>20&&(Math.max(r,g,b)-Math.min(r,g,b))>15&&Math.abs(r-g)>15&&r>g&&r>b&&r-b<150;}

  // Dominant garment color of one photo: ignore the background (sampled on the border) and skin, weight the center
  function analyze(data,w,h){
    var px=function(x,y){var o=(y*w+x)*4;return [data[o],data[o+1],data[o+2]];};
    var bins={},bn=0;
    for(var x=0;x<w;x++){[0,1,h-2,h-1].forEach(function(y){var c=px(x,y);var k=(c[0]>>4)+","+(c[1]>>4)+","+(c[2]>>4);bins[k]=(bins[k]||0)+1;bn++;});}
    for(var y=0;y<h;y++){[0,1,w-2,w-1].forEach(function(x){var c=px(x,y);var k=(c[0]>>4)+","+(c[1]>>4)+","+(c[2]>>4);bins[k]=(bins[k]||0)+1;bn++;});}
    var bg=Object.keys(bins).sort(function(a,b){return bins[b]-bins[a];}).slice(0,3).filter(function(k){return bins[k]>=bn*0.12;}).map(function(k){var v=k.split(",").map(function(n){return (+n<<4)+8;});return rgb2lab(v[0],v[1],v[2]);});
    var L=new Array(w*h);for(var q=0;q<w*h;q++)L[q]=rgb2lab(data[q*4],data[q*4+1],data[q*4+2]);
    var pts=[],busy=0,busyW=0;
    for(y=Math.floor(h*0.1);y<Math.floor(h*0.95);y+=1){
      for(x=Math.floor(w*0.12);x<Math.floor(w*0.88);x+=1){
        var c=px(x,y),lab=L[y*w+x];
        if(bg.some(function(b){return dE(lab,b)<13;}))continue;
        var dx=(x/w-0.5)/0.36,dy=(y/h-0.55)/0.45,wt=Math.max(0.15,1-(dx*dx+dy*dy)*0.6);
        if(y<h*0.22)wt*=0.35; // hair/face area
        var sk=isSkin(c[0],c[1],c[2]);
        if(!sk){var nb=Math.max(dE(lab,L[y*w+Math.min(w-1,x+1)]),dE(lab,L[Math.min(h-1,y+1)*w+x]));busyW+=wt;if(nb>14)busy+=wt;}
        pts.push({l:lab,w:wt,s:sk});
      }
    }
    var busyness=busyW?busy/busyW:0;
    if(pts.length<30)return null;
    // k-means (k=5) in Lab, deterministic seeds spread by lightness
    var K=Math.min(5,pts.length),sorted=pts.slice().sort(function(a,b){return a.l[0]-b.l[0];});
    var cent=[];for(var k=0;k<K;k++)cent.push(sorted[Math.floor((k+0.5)*sorted.length/K)].l.slice());
    var asg=new Array(pts.length);
    for(var it=0;it<10;it++){
      var sum=cent.map(function(){return [0,0,0,0];});
      pts.forEach(function(p,i){var bi=0,bd=1e9;cent.forEach(function(c,j){var d=dE(p.l,c);if(d<bd){bd=d;bi=j;}});asg[i]=bi;var s=sum[bi];s[0]+=p.l[0]*p.w;s[1]+=p.l[1]*p.w;s[2]+=p.l[2]*p.w;s[3]+=p.w;});
      cent=cent.map(function(c,j){var s=sum[j];return s[3]?[s[0]/s[3],s[1]/s[3],s[2]/s[3]]:c;});
    }
    var cl=cent.map(function(c,j){return {lab:c,w:0,skin:0};}),tot=0;
    pts.forEach(function(p,i){var c=cl[asg[i]];c.w+=p.w;if(p.s)c.skin+=p.w;tot+=p.w;});
    cl.forEach(function(c){c.share=c.w/tot;c.isSkin=c.w&&c.skin/c.w>0.6;c.n=nameOf(c.lab);});
    // merge clusters that got the same name
    var byName={};cl.forEach(function(c){if(!c.w)return;var b=byName[c.n];if(!b)byName[c.n]=c;else{b.lab=b.w>=c.w?b.lab:c.lab;b.w+=c.w;b.share+=c.share;b.isSkin=b.isSkin&&c.isSkin;}});
    var list=Object.keys(byName).map(function(n){return byName[n];}).sort(function(a,b){return b.share-a.share;});
    var garment=list.filter(function(c){return !c.isSkin&&c.share>=0.1;});
    var main=garment[0]||list[0];
    var second=garment[1];
    // Prints: many sharp color changes inside the garment (solid fabrics only change at edges and folds)
    var printed=busyness>0.3&&busyW>tot*0.25&&garment.length>=2&&second.share>=0.12;
    return {n:printed?"Estampado":main.n,hex:lab2hex(main.lab),pct:Math.round(main.share*100),alt:second?second.n:"",mix:list.slice(0,4).map(function(c){return c.n+(c.isSkin?"(piel)":"")+" "+Math.round(c.share*100)+"%";}).join(", ")+" · textura "+Math.round(busyness*100)+"%"};
  }
  function loadBitmap(url){
    var own=url.indexOf(OPT.api+"/img/")===0;
    var req=own?fetch(url):fetch(OPT.api+"/admin/imgx?u="+encodeURIComponent(url),{headers:{"x-admin-token":OPT.token()}});
    return req.then(function(r){if(!r.ok)throw new Error(r.status===401?"token":"foto "+r.status);return r.blob();}).then(function(b){
      if(window.createImageBitmap)return createImageBitmap(b);
      return new Promise(function(ok,ko){var im=new Image();im.onload=function(){ok(im);};im.onerror=ko;im.src=URL.createObjectURL(b);});
    });
  }
  function scanOne(url){
    return loadBitmap(url).then(function(bm){
      var w=110,h=Math.max(60,Math.min(220,Math.round(w*(bm.height/bm.width||1.3))));
      var cv=document.createElement("canvas");cv.width=w;cv.height=h;var cx=cv.getContext("2d",{willReadFrequently:true});
      cx.drawImage(bm,0,0,w,h);var r=analyze(cx.getImageData(0,0,w,h).data,w,h);
      S.scan[url]=r||{n:"",err:"sin color"};
    }).catch(function(e){S.scan[url]={n:"",err:String(e&&e.message||"error")};});
  }
  function runScan(all){
    if(S.busy)return;
    var urls=[];S.list.forEach(function(p){images(p).forEach(function(u){if(all||!S.scan[u]||S.scan[u].err)urls.push(u);});});
    if(!urls.length){applySuggestions();render();return toast("Todas las fotos ya están analizadas ✓");}
    S.busy=true;S.done=0;S.total=urls.length;render();
    var i=0;
    function next(){if(i>=urls.length)return Promise.resolve();var u=urls[i++];return scanOne(u).then(function(){S.done++;progress();return next();});}
    Promise.all([next(),next(),next(),next()]).then(function(){
      S.busy=false;saveScan();var n=applySuggestions();render();
      var bad=urls.filter(function(u){return S.scan[u]&&S.scan[u].err;}).length;
      if(bad&&urls.every(function(u){return S.scan[u]&&S.scan[u].err==="token";}))return toast("Token inválido o falta pegar el Worker v44.",true);
      toast("Listo: "+(urls.length-bad)+" fotos analizadas"+(bad?" · "+bad+" no se pudieron leer":"")+(n?" · "+n+" prendas con colores sugeridos (revisa y guarda)":""));
    });
  }
  // Products without saved colors take the scan result as an unsaved suggestion
  function applySuggestions(){var n=0;S.list.forEach(function(p,i){if(String(p.colores||"").trim()||S.edit[i])return;var m=modelFromScan(p);if(m.photo.some(Boolean)){S.edit[i]=m;n++;}});return n;}
  function progress(){var b=document.getElementById("ccProg");if(b){b.querySelector("i").style.width=Math.round(S.done/Math.max(1,S.total)*100)+"%";b.querySelector("span").textContent="Analizando fotos "+S.done+" / "+S.total+"…";}}

  // ---------- data ----------
  function load(){
    S.el.innerHTML='<div class="cc-empty"><div class="cc-spin"></div>Cargando catálogo…</div>';
    return fetch(OPT.api+"/catalog?ts="+Date.now(),{cache:"no-store"}).then(function(r){return r.json();}).then(function(d){
      if(!d.ok)throw new Error(d.error||"No se pudo leer el catálogo");
      S.list=(d.products||[]).filter(function(p){return !isService(p);});S.edit={};
      loadScan();applySuggestions();render();
      var pending=0;S.list.forEach(function(p){images(p).forEach(function(u){if(!S.scan[u])pending++;});});
      if(pending)runScan(false);
    }).catch(function(e){S.el.innerHTML='<div class="cc-empty">⚠️ '+esc(e.message)+'<br><button type="button" class="cc-btn" data-c="reload">Reintentar</button></div>';});
  }
  function save(){
    var ids=dirtyList();if(!ids.length)return toast("No hay cambios por guardar.");
    var items=ids.map(function(i){var p=S.list[i];return {id:p.id||"",imagen:p.imagen||"",nombre:p.nombre,categoria:p.categoria,precio:p.precio,colores:serialize(p,S.edit[i])};});
    var b=S.el.querySelector('[data-c="save"]');if(b){b.disabled=true;b.textContent="Guardando…";}
    api("/admin/colors",{method:"POST",body:{items:items}}).then(function(d){
      ids.forEach(function(i){S.list[i].colores=serialize(S.list[i],S.edit[i]);delete S.edit[i];});
      render();toast("Guardado ✓ · "+d.updated+" prenda"+(d.updated===1?"":"s")+" con colores en la tienda"+(d.missing&&d.missing.length?" · no encontré: "+d.missing.slice(0,3).join(", "):""));
    }).catch(function(e){render();toast("Error: "+e.message,true);});
  }

  // ---------- view ----------
  function gamut(){
    var cnt={};S.list.forEach(function(p,i){names(i).forEach(function(n){cnt[n]=(cnt[n]||0)+1;});});
    return Object.keys(cnt).map(function(n){return [n,cnt[n]];}).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0]);});
  }
  function opts(sel){return '<option value="">— sin color —</option>'+PALETTE.map(function(c){return '<option'+(flat(c[0])===flat(sel)?" selected":"")+'>'+esc(c[0])+'</option>';}).join("")+(sel&&!HEX[sel.toLowerCase()]?'<option selected>'+esc(sel)+'</option>':"")+'<option value="__otro">Otro…</option>';}
  function card(i){
    var p=S.list[i],m=model(i),imgs=images(p),ns=names(i),d=dirty(i);
    var photos=imgs.length?imgs.map(function(u,k){var r=S.scan[u]||{},cur=m.photo[k]||"";
      var hint=r.n&&flat(r.n)!==flat(cur)?'<em class="cc-hint" data-c="use" data-i="'+i+'" data-k="'+k+'" data-n="'+esc(r.n)+'">detecté: <i style="'+swatch(r.n)+'"></i>'+esc(r.n)+' · usar</em>':(r.err?'<em class="cc-hint bad">no se pudo leer</em>':(r.alt?'<em class="cc-hint dim">también tiene: '+esc(r.alt)+'</em>':""));
      return '<div class="cc-ph"><div class="cc-img"><img src="'+esc(u)+'" loading="lazy" alt=""><b style="'+swatch(cur)+'"></b></div>'+
        '<select data-ph="'+i+'" data-k="'+k+'">'+opts(cur)+'</select>'+hint+'</div>';}).join(""):'<div class="cc-dim">Sin fotos</div>';
    var extra=m.extra.map(function(n,k){return '<span class="cc-chip"><i style="'+swatch(n)+'"></i>'+esc(n)+'<button type="button" data-c="rmx" data-i="'+i+'" data-k="'+k+'" aria-label="Quitar">×</button></span>';}).join("");
    return '<div class="cc-card'+(d?" dirty":"")+'" data-card="'+i+'">'+
      '<div class="cc-ch"><div><b>'+esc(p.nombre)+'</b><span>'+esc(p.categoria)+' · '+esc(p.precio)+'</span></div>'+
        '<div class="cc-names">'+(ns.length?ns.map(function(n){return '<i title="'+esc(n)+'" style="'+swatch(n)+'"></i>';}).join(""):'<span class="cc-dim">sin colores</span>')+(d?'<em class="cc-new">sin guardar</em>':"")+'</div></div>'+
      '<div class="cc-phs">'+photos+'</div>'+
      '<div class="cc-x"><span class="cc-dim">Otros colores disponibles (sin foto):</span>'+extra+
        '<select data-addx="'+i+'"><option value="">+ Agregar color</option>'+PALETTE.map(function(c){return '<option>'+esc(c[0])+'</option>';}).join("")+'<option value="__otro">Otro…</option></select></div>'+
    '</div>';
  }
  function visible(){
    var q=flat(S.q);
    return S.list.map(function(p,i){return i;}).filter(function(i){
      var p=S.list[i],ns=names(i);
      if(q&&flat(p.nombre+" "+p.categoria+" "+ns.join(" ")).indexOf(q)<0)return false;
      if(S.col&&!ns.some(function(n){return flat(n)===flat(S.col);}))return false;
      if(S.flt==="varios")return ns.length>=2;
      if(S.flt==="sin")return !ns.length;
      if(S.flt==="cambios")return dirty(i);
      if(S.flt==="revisar")return images(p).some(function(u,k){var r=S.scan[u];return r&&r.n&&flat(r.n)!==flat(model(i).photo[k]||"");});
      return true;
    });
  }
  function render(){
    if(!S.el)return;
    var g=gamut(),dl=dirtyList().length,vis=visible();
    var withC=S.list.filter(function(p,i){return names(i).length;}).length;
    S.el.innerHTML=
      '<div class="cc-head"><div><div class="cc-eyeb">Catálogo · '+S.list.length+' prendas</div><h2 class="cc-h">🎨 Colores de las prendas</h2>'+
        '<p class="cc-lead">Analicé cada foto para detectar el color de la prenda. Revisa, corrige si algo está mal y toca <b>Guardar colores</b>. En la tienda, cuando una prenda tenga 2 colores o más, la clienta elige el tono y la foto cambia a la de ese color.</p></div>'+
        '<div class="cc-acts"><button type="button" class="cc-btn ghost" data-c="rescan"'+(S.busy?" disabled":"")+'>↻ Volver a analizar todo</button><button type="button" class="cc-btn" data-c="save"'+(dl?"":" disabled")+'>Guardar colores'+(dl?" ("+dl+")":"")+'</button></div></div>'+
      (S.busy?'<div class="cc-prog" id="ccProg"><i style="width:'+Math.round(S.done/Math.max(1,S.total)*100)+'%"></i><span>Analizando fotos '+S.done+' / '+S.total+'…</span></div>':"")+
      '<div class="cc-gama"><div class="cc-eyeb">Gama de colores de la tienda · '+g.length+' tonos · '+withC+' de '+S.list.length+' prendas con color</div><div class="cc-sw">'+
        (g.length?g.map(function(c){return '<button type="button" class="cc-tone'+(flat(S.col)===flat(c[0])?" on":"")+'" data-col="'+esc(c[0])+'"><i style="'+swatch(c[0])+'"></i><span>'+esc(c[0])+'</span><b>'+c[1]+'</b></button>';}).join(""):'<span class="cc-dim">Todavía no hay colores. Toca “Volver a analizar todo”.</span>')+
      '</div></div>'+
      '<div class="cc-tools"><input type="search" placeholder="Buscar prenda o color…" value="'+esc(S.q)+'" data-q>'+
        '<div class="cc-seg">'+[["todas","Todas"],["varios","2+ colores"],["sin","Sin color"],["revisar","Para revisar"],["cambios","Sin guardar"]].map(function(f){return '<button type="button" data-flt="'+f[0]+'" class="'+(S.flt===f[0]?"on":"")+'">'+f[1]+'</button>';}).join("")+'</div>'+
        (S.col?'<button type="button" class="cc-btn ghost sm" data-col="">Quitar filtro: '+esc(S.col)+' ×</button>':"")+'</div>'+
      '<div class="cc-grid">'+(vis.length?vis.map(card).join(""):'<div class="cc-empty">Nada por aquí.</div>')+'</div>';
  }
  function setPhoto(i,k,n){var m=model(i);m={photo:m.photo.slice(),extra:m.extra.slice()};m.photo[k]=n;S.edit[i]=m;}
  function askOther(){var n=(prompt("Nombre del color (ej: Verde esmeralda):")||"").trim().replace(/[=,;]/g," ").slice(0,30);return n;}
  function bind(el){
    el.addEventListener("click",function(e){
      var t=e.target.closest("[data-c],[data-col],[data-flt]");if(!t)return;
      if(t.hasAttribute("data-flt")){S.flt=t.dataset.flt;return render();}
      if(t.hasAttribute("data-col")&&!t.dataset.c){S.col=flat(S.col)===flat(t.dataset.col)?"":t.dataset.col;return render();}
      var c=t.dataset.c,i=+t.dataset.i;
      if(c==="reload")return load();
      if(c==="save")return save();
      if(c==="rescan")return runScan(true);
      if(c==="use"){setPhoto(i,+t.dataset.k,t.dataset.n);return render();}
      if(c==="rmx"){var m=model(i);m={photo:m.photo.slice(),extra:m.extra.slice()};m.extra.splice(+t.dataset.k,1);S.edit[i]=m;return render();}
    });
    el.addEventListener("change",function(e){
      var s=e.target;
      if(s.hasAttribute("data-ph")){var n=s.value;if(n==="__otro"){n=askOther();if(!n)return render();}setPhoto(+s.dataset.ph,+s.dataset.k,n);return render();}
      if(s.hasAttribute("data-addx")){var i=+s.dataset.addx,v=s.value==="__otro"?askOther():s.value;if(!v)return;var m=model(i);m={photo:m.photo.slice(),extra:m.extra.slice()};if(!m.photo.concat(m.extra).some(function(x){return flat(x)===flat(v);}))m.extra.push(v);S.edit[i]=m;return render();}
    });
    el.addEventListener("input",function(e){if(e.target.hasAttribute("data-q")){S.q=e.target.value;clearTimeout(S.qt);S.qt=setTimeout(function(){render();var q=S.el.querySelector("[data-q]");if(q){q.focus();var L=q.value.length;try{q.setSelectionRange(L,L);}catch(x){}}},300);}});
  }

  var bound=false;
  function mount(el,opts){
    Object.keys(opts||{}).forEach(function(k){OPT[k]=opts[k];});
    if(!document.getElementById("ccCss")){var st=document.createElement("style");st.id="ccCss";st.textContent=CSS;document.head.appendChild(st);}
    if(S.el!==el){S.el=el;el.classList.add("cc");bind(el);}
    if(S.busy)return render();
    return load();
  }
  window.CanevaColores={mount:mount,parse:parseColors,palette:PALETTE,analyze:analyze};

  var CSS=[
  ".cc{color:var(--w,#f7f7f4)}.cc-hide{display:none!important}",
  ".cc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px}",
  ".cc-eyeb{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim,#9a9a96)}",
  ".cc-h{font-family:'Cormorant Garamond',serif;font-weight:300;font-size:34px;line-height:1.05;margin:4px 0 6px}",
  ".cc-lead{max-width:640px;font-size:13.5px;line-height:1.5;color:var(--dim,#9a9a96);margin:0}.cc-lead b{color:var(--w,#fff)}",
  ".cc-acts{display:flex;gap:8px;flex-wrap:wrap}",
  ".cc-btn{border:0;background:var(--w,#f7f7f4);color:var(--k,#0b0b0b);border-radius:12px;padding:11px 15px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}.cc-btn:disabled{opacity:.45;cursor:default}",
  ".cc-btn.ghost{background:none;color:var(--w,#fff);border:1px solid var(--b,rgba(255,255,255,.14))}.cc-btn.sm{padding:7px 11px;font-size:12px}",
  ".cc-prog{position:relative;height:30px;border:1px solid var(--b,rgba(255,255,255,.14));border-radius:10px;overflow:hidden;margin-bottom:14px}.cc-prog i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,rgba(217,196,155,.25),rgba(217,196,155,.55));transition:width .3s}.cc-prog span{position:relative;display:block;text-align:center;line-height:28px;font-size:12.5px}",
  ".cc-gama{border:1px solid var(--b,rgba(255,255,255,.14));border-radius:16px;padding:14px;margin-bottom:14px;background:linear-gradient(160deg,rgba(255,255,255,.035),transparent)}",
  ".cc-sw{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
  ".cc-tone{display:flex;align-items:center;gap:7px;border:1px solid var(--b,rgba(255,255,255,.14));background:none;color:inherit;border-radius:999px;padding:5px 11px 5px 5px;cursor:pointer;font:inherit;font-size:12.5px}.cc-tone.on{border-color:#d9c49b;background:rgba(217,196,155,.12)}",
  ".cc-tone i,.cc-names i,.cc-chip i,.cc-hint i{display:inline-block;width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.35);flex:none}.cc-tone b{font-weight:600;color:var(--dim,#9a9a96)}",
  ".cc-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}.cc-tools input{flex:1 1 200px;min-width:0;background:none;border:1px solid var(--b,rgba(255,255,255,.14));color:inherit;border-radius:10px;padding:9px 11px;font:inherit;font-size:13px}",
  ".cc-seg{display:flex;flex-wrap:wrap;gap:4px}.cc-seg button{background:none;border:1px solid var(--b,rgba(255,255,255,.14));color:var(--dim,#9a9a96);border-radius:999px;padding:6px 11px;font:inherit;font-size:12px;cursor:pointer}.cc-seg button.on{color:var(--k,#000);background:var(--w,#fff);border-color:var(--w,#fff)}",
  ".cc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}",
  ".cc-card{border:1px solid var(--b,rgba(255,255,255,.14));border-radius:16px;padding:12px;min-width:0}.cc-card.dirty{border-color:rgba(217,196,155,.6)}",
  ".cc-ch{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.cc-ch b{display:block;font-size:14.5px;font-weight:600}.cc-ch span{font-size:12px;color:var(--dim,#9a9a96)}",
  ".cc-names{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.cc-names i{width:16px;height:16px}",
  ".cc-new{font-style:normal;font-size:10.5px;color:#d9c49b;border:1px solid rgba(217,196,155,.5);border-radius:999px;padding:2px 7px;margin-left:4px}",
  ".cc-phs{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}",
  ".cc-ph{flex:0 0 120px;display:flex;flex-direction:column;gap:6px}.cc-img{position:relative;width:120px;height:150px;border-radius:10px;overflow:hidden;background:#1a1a1a}.cc-img img{width:100%;height:100%;object-fit:cover;display:block}",
  ".cc-img b{position:absolute;right:6px;bottom:6px;width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5)}",
  ".cc-ph select,.cc-x select{width:100%;background:var(--k,#0b0b0b);color:inherit;border:1px solid var(--b,rgba(255,255,255,.14));border-radius:8px;padding:6px;font:inherit;font-size:12px}.cc-x select{width:auto}",
  ".cc-hint{font-style:normal;font-size:11px;color:#d9c49b;cursor:pointer;display:flex;align-items:center;gap:4px;line-height:1.25}.cc-hint i{width:12px;height:12px}.cc-hint.bad{color:#ff8f80;cursor:default}.cc-hint.dim{color:var(--dim,#9a9a96);cursor:default}",
  ".cc-x{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed var(--b,rgba(255,255,255,.14));font-size:12px}",
  ".cc-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--b,rgba(255,255,255,.14));border-radius:999px;padding:3px 4px 3px 4px;font-size:12px}.cc-chip i{width:16px;height:16px}.cc-chip button{background:none;border:0;color:var(--dim,#9a9a96);font-size:15px;cursor:pointer;padding:0 4px}",
  ".cc-dim{color:var(--dim,#9a9a96);font-size:12px}",
  ".cc-empty{padding:40px 10px;text-align:center;color:var(--dim,#9a9a96);display:flex;flex-direction:column;align-items:center;gap:12px;grid-column:1/-1}",
  ".cc-spin{width:34px;height:34px;border:3px solid var(--b,rgba(255,255,255,.14));border-top-color:var(--w,#fff);border-radius:50%;animation:ccsp 1s linear infinite}@keyframes ccsp{to{transform:rotate(360deg)}}",
  ".cc-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:#f7f7f4;color:#0b0b0b;padding:11px 16px;border-radius:12px;font-size:13.5px;font-weight:600;box-shadow:0 12px 40px rgba(0,0,0,.5);max-width:calc(100vw - 32px)}.cc-toast.err{background:#ffb4a8}",
  "@media(max-width:520px){.cc-grid{grid-template-columns:1fr}.cc-ph{flex-basis:104px}.cc-img{width:104px;height:132px}.cc-h{font-size:28px}}"
  ].join("\n");
})();
