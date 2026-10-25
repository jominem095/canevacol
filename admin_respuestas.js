/* CANEVA admin · Respuestas (v1)
   Ready WhatsApp replies for the owner: tap to copy or open the chat with the number, Caneva AI writes custom replies,
   send a garment with its photo link, her own saved replies (server), and CΛNEVΛ stickers made in the browser.
   Mounted by admin_movil.html: CanevaRespuestas.mount(el, {api, token, products}) */
(function(){
  var S={el:null,o:null,cat:"Todas",q:"",mine:[],phone:"",name:"",prod:null};
  var LS="cv_rs_recent";
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-CO");}
  function api(path,opt){opt=opt||{};return fetch(S.o.api+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":S.o.token()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function first(n){var f=String(n||"").trim().split(/\s+/)[0]||"";return f?f.charAt(0).toUpperCase()+f.slice(1).toLowerCase():"";}
  function num(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;if(d[0]==="3")return "";return d.length>=11&&d.length<=13?d:"";}
  function slug(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
  function plink(p){return S.o.api+"/p/"+[slug(p.nombre),slug(p.categoria),String(p.precio||"").replace(/[^\d]/g,"")].filter(Boolean).join("--");}

  // ---------- default replies (CΛNEVΛ voice) ----------
  var CATS=[["Todas","✦"],["Bienvenida","👋"],["Catálogo","🛍"],["Envíos","🚚"],["Pagos","💳"],["Tallas","📏"],["Club","👑"],["Apartados","⏳"],["Regalos","🎁"],["Internacional","🌎"],["Post-venta","🖤"],["Recuperar","🔥"],["Mías","⭐"]];
  var BASE=[
    ["Bienvenida","Bienvenida","Hola{ nombre} ✨ ¡Bienvenida a CΛNEVΛ! 💎 Qué alegría tenerte por aquí. Cuéntame qué estás buscando (ocasión, estilo o talla) y te ayudo a encontrar tu prenda perfecta 🖤"],
    ["Bienvenida","Bienvenida corta","Hola{ nombre} 💎 Gracias por escribirnos. Ya te ayudo, ¿qué prenda te gustó?"],
    ["Bienvenida","Fuera de horario","Hola{ nombre} 🌙 Gracias por escribir a CΛNEVΛ. En este momento no estamos en línea, pero mañana a primera hora te respondemos. Mientras tanto mira todo en {tienda} y pregúntale a Caneva AI, nuestra asesora 24/7 ✨"],
    ["Catálogo","No tenemos catálogo, es la página","Hola{ nombre} ✨ No manejamos catálogo en PDF: todo lo que tenemos está en nuestra página, siempre actualizado con fotos, precios y tallas disponibles 👉 {tienda}\nAhí puedes agregar al carrito y pagar, o enviarnos tu pedido por WhatsApp 💎"],
    ["Catálogo","Cómo comprar en la página","Es muy fácil{ nombre} 💎\n1️⃣ Entra a {tienda}\n2️⃣ Elige tu prenda y tu talla\n3️⃣ Agrégala al carrito\n4️⃣ Paga con Bre-B, tarjeta, PSE o Nequi (o envíanos el pedido por WhatsApp)\n¡Y listo! Te llega tu recibo al instante 🖤"],
    ["Catálogo","Preguntar por una prenda","¡Claro{ nombre}! 💎 ¿Me compartes la foto o el nombre de la prenda que te gustó? Así te confirmo tallas y colores disponibles."],
    ["Envíos","Domicilio en Barranquilla","Hola{ nombre} 🚚 En Barranquilla y su área (Soledad, Puerto Colombia, Malambo, Galapa) te llevamos el pedido a domicilio, normalmente en 1 día hábil. Aquí sí manejamos contraentrega: pagas al recibir 💎 ¿Me compartes tu dirección y barrio?"],
    ["Envíos","Envíos a toda Colombia","Hola{ nombre} 🚚 Enviamos a toda Colombia con Interrapidísimo. Para otras ciudades el pago es antes del envío (Bre-B, tarjeta, PSE o Nequi) y te compartimos la guía para que lo rastrees 📦 Llevando 2 prendas el envío te sale gratis 💎"],
    ["Envíos","Envío gratis por 2 prendas","¡Te tengo un dato{ nombre}! 💎 Llevando 2 prendas el envío dentro de Colombia te sale GRATIS 🚚✨ ¿Te ayudo a escoger la segunda?"],
    ["Envíos","Tu pedido va en camino","¡Hola{ nombre}! 🚚 Tu pedido CΛNEVΛ ya va en camino 💎 Esta es tu guía: ______. Cualquier cosa me escribes 🖤"],
    ["Envíos","Contraentrega solo Barranquilla","Hola{ nombre} 💎 La contraentrega la manejamos solo en Barranquilla y su área. Para otras ciudades el pago se hace antes del envío y te llega tu recibo y la guía al instante: es 100% seguro 🔒"],
    ["Pagos","Pagar con Bre-B","Para pagar con Bre-B{ nombre} (sin comisión, desde cualquier banco o Nequi):\n1️⃣ Abre tu banco → Bre-B / Enviar con llave\n2️⃣ Llave: {llave}\n3️⃣ Valor: $______\n4️⃣ Envíame el comprobante por aquí 📲\n¡Y listo! 💎"],
    ["Pagos","Pagar en la página","Puedes pagar directo en {tienda}{ nombre} 💳 con tarjeta, PSE, Nequi o Bre-B. Es pago protegido y te llega tu recibo al instante 🔒💎"],
    ["Pagos","Confirmé tu pago","¡Recibido{ nombre}! ✅ Ya confirmamos tu pago. Estamos alistando tu pedido con mucho amor 🖤 Te aviso apenas salga 🚚"],
    ["Pagos","Recordar pago pendiente","Hola{ nombre} 💎 Te escribo porque tu pedido quedó pendiente de pago. ¿Te ayudo a terminarlo? Puedes pagar con Bre-B a la llave {llave} o en {tienda} 🖤 Las prendas vuelan, así que te las guardo un ratico ⏳"],
    ["Tallas","Guía de tallas","Te ayudo con la talla{ nombre} 📏 Cuéntame tu estatura, tu talla habitual de pantalón y de blusa, y si te gusta ajustada u holgada, y te digo cuál te queda perfecta 💎"],
    ["Tallas","Talla agotada","Ay{ nombre}, esa talla se nos agotó 😢 Pero mira, ¿te muestro una parecida que sí tenemos en tu talla? O si quieres te aviso apenas llegue 💎"],
    ["Club","Únete al Club Caneva","Hola{ nombre} 👑 ¿Ya eres del Club Caneva? Es gratis: te regalamos 100 puntos de bienvenida, acumulas puntos en cada compra y los cambias por descuentos 💎 Te unes en 10 segundos en {tienda}"],
    ["Club","Tienes puntos","{Nombre} 👑 tienes puntos en el Club Caneva esperándote 💎 Úsalos en tu próxima compra en {tienda} ✨"],
    ["Apartados","Apartar una prenda","¡Te la aparto{ nombre}! ⏳💎 Con el Apartado CΛNEVΛ pagas hoy solo una parte y el resto en cuotas. La prenda queda separada a tu nombre. ¿Cuál te aparto?"],
    ["Regalos","Tarjeta Regalo","¿No sabes la talla de quien quieres consentir{ nombre}? 🎁 Regala una Tarjeta Regalo CΛNEVΛ: eliges el valor, le llega por correo con un mensaje tuyo y ella escoge lo que más le guste 💎 Está en {tienda}"],
    ["Regalos","Feliz cumpleaños","¡Feliz cumpleaños{ nombre}! 🎂✨ Que tengas un día tan brillante como un diamante 💎 En CΛNEVΛ te queremos consentir: escríbenos y te tenemos un detalle especial 🖤"],
    ["Internacional","Enviamos a tu país","¡Hola{ nombre}! 🌎 Sí enviamos fuera de Colombia (EE. UU., Centroamérica, Suramérica y Europa) con DHL, FedEx o UPS. En {tienda} ves los precios en tu moneda y eliges la empresa de envío. Llevando 2 prendas tienes descuento 💎"],
    ["Internacional","Regalo desde afuera","¿Vives fuera y quieres consentir a alguien en Colombia{ nombre}? 💎 Compra en {tienda}, elige Colombia al pagar y pagas el precio nacional. ¡Se lo llevamos a su puerta! 🎁🚚"],
    ["Post-venta","Gracias por tu compra","¡Gracias por tu compra{ nombre}! 🖤 Esperamos que la disfrutes muchísimo. Nos encantaría ver cómo te queda: etiquétanos en Instagram {ig} ✨💎"],
    ["Post-venta","¿Cómo te quedó?","Hola{ nombre} 💎 ¿Ya estrenaste tu prenda CΛNEVΛ? Cuéntame cómo te quedó 😍 Si nos mandas una foto te regalamos puntos en el Club 👑"],
    ["Post-venta","Reseña","{Nombre} 🖤 tu opinión nos ayuda muchísimo. ¿Nos regalas una reseña o una historia etiquetando {ig}? ✨"],
    ["Recuperar","Dejaste prendas en el carrito","Hola{ nombre} ✨ Vimos que dejaste prendas en tu carrito de CΛNEVΛ 🛍 ¿Te ayudo a terminar tu pedido? Aún están disponibles, pero vuelan 💎"],
    ["Recuperar","Llegó colección nueva","¡{Nombre}, llegó colección nueva a CΛNEVΛ! 💎✨ Te la mostramos primero a ti 👉 {tienda}"],
    ["Recuperar","Últimas unidades","Psst{ nombre} 👀 la prenda que te gustó está en sus últimas unidades. ¿Te la separo? 💎"]
  ];
  function all(){return BASE.map(function(b,i){return {id:"b"+i,cat:b[0],title:b[1],text:b[2],base:true};}).concat(S.mine.map(function(m){return {id:m.id,cat:m.cat||"Mías",title:m.title,text:m.text,mine:true};}));}
  function fill(t){
    var n=first(S.name),p=S.prod;
    return String(t).replace(/\{ nombre\}/g,n?" "+n:"").replace(/\{nombre\}/g,n).replace(/\{Nombre\}/g,n||"Hola").replace(/\{tienda\}/g,"canevacol.com").replace(/\{ig\}/g,"@caneva.col").replace(/\{llave\}/g,"@caneva119")
      .replace(/\{prenda\}/g,p?p.nombre:"tu prenda").replace(/\{precio\}/g,p?p.precio:"").replace(/\{link\}/g,p?plink(p):"canevacol.com");
  }
  function waUrl(text){var k=num(S.phone);return "https://wa.me/"+(k||"")+"?text="+encodeURIComponent(text);}
  function copy(text,btn){var ok=function(){if(btn){var o=btn.innerHTML;btn.innerHTML="✓ Copiado";btn.classList.add("ok");setTimeout(function(){btn.innerHTML=o;btn.classList.remove("ok");},1500);}};
    try{navigator.clipboard.writeText(text).then(ok,old);}catch(e){old();}
    function old(){var t=document.createElement("textarea");t.value=text;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{document.execCommand("copy");}catch(e){}t.remove();ok();}}
  function remember(){var k=num(S.phone);if(!k)return;try{var l=JSON.parse(localStorage.getItem(LS)||"[]").filter(function(x){return x.k!==k;});l.unshift({k:k,n:S.name||""});localStorage.setItem(LS,JSON.stringify(l.slice(0,8)));}catch(e){}}
  function recent(){try{return JSON.parse(localStorage.getItem(LS)||"[]");}catch(e){return [];}}
  function send(text){remember();window.open(waUrl(text),"_blank","noopener");paintRecent();}

  // ---------- styles ----------
  function css(){if(document.getElementById("rs-css"))return;var s=document.createElement("style");s.id="rs-css";s.textContent=
    ".rs{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".rs-hero{position:relative;overflow:hidden;border-radius:22px;padding:18px;margin:4px 0 14px;background:radial-gradient(500px 220px at 15% 0%,rgba(37,211,102,.18),transparent 60%),radial-gradient(400px 200px at 100% 100%,rgba(201,167,255,.14),transparent 60%),#0c0c0e;border:1px solid rgba(37,211,102,.3)}"+
    ".rs-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:28px}.rs-hero p{margin:4px 0 12px;font-size:13px;color:rgba(246,247,248,.7)}"+
    ".rs-to{display:grid;grid-template-columns:1fr 1.2fr;gap:8px}.rs-to input{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:11px 12px;font:15px Inter,sans-serif}"+
    ".rs-to .ph{position:relative}.rs-to .ph button{position:absolute;right:6px;top:6px;border:0;border-radius:9px;background:rgba(246,247,248,.1);color:#fff;font-size:11px;padding:7px 8px;cursor:pointer}"+
    ".rs-rec{display:flex;gap:6px;overflow-x:auto;margin-top:8px;scrollbar-width:none}.rs-rec::-webkit-scrollbar{display:none}.rs-rec button{flex:0 0 auto;border:1px solid rgba(37,211,102,.35);background:rgba(37,211,102,.08);color:#d9ffe9;border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}"+
    ".rs-box{border-radius:18px;padding:14px;margin:12px 0;background:#0e0e10;border:1px solid rgba(246,247,248,.12)}.rs-box h3{margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,247,248,.6);font-weight:600}"+
    ".rs-ai{border-color:rgba(207,230,255,.35);background:linear-gradient(135deg,rgba(159,211,255,.07),rgba(201,167,255,.07))}"+
    ".rs textarea{width:100%;box-sizing:border-box;min-height:84px;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:10px 12px;font:14px/1.45 Inter,sans-serif;resize:vertical}"+
    ".rs-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.rs-btn{border:0;border-radius:999px;padding:10px 14px;font:700 12px Inter,sans-serif;cursor:pointer;background:#f6f7f8;color:#050505}"+
    ".rs-btn.wa{background:#25d366;color:#04140a}.rs-btn.ghost{background:none;color:#f6f7f8;border:1px solid rgba(246,247,248,.25)}.rs-btn.ai{background:linear-gradient(120deg,#cfd6db,#ffffff 45%,#e8eef2 60%,#c3ccd2)}.rs-btn.ok{background:#8ef0c8!important;color:#04140a!important}"+
    ".rs-cats{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none;position:sticky;top:0;z-index:3;background:linear-gradient(#050505 70%,transparent)}.rs-cats::-webkit-scrollbar{display:none}"+
    ".rs-cats button{flex:0 0 auto;border:1px solid rgba(246,247,248,.18);background:#121214;color:#f6f7f8;border-radius:999px;padding:8px 12px;font:600 12px Inter,sans-serif;cursor:pointer}.rs-cats button.on{background:#f6f7f8;color:#050505}"+
    ".rs-search{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:10px 12px;font:14px Inter,sans-serif;margin-bottom:10px}"+
    ".rs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}"+
    ".rs-card{border-radius:16px;padding:12px;background:#0e0e10;border:1px solid rgba(246,247,248,.12);display:flex;flex-direction:column;gap:8px}.rs-card.mine{border-color:rgba(255,214,102,.4)}"+
    ".rs-card .t{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px}.rs-card .t small{margin-left:auto;font-weight:500;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(246,247,248,.45)}"+
    ".rs-bubble{position:relative;white-space:pre-wrap;font-size:13.5px;line-height:1.45;background:#005c4b;color:#eafff6;border-radius:12px 12px 4px 12px;padding:9px 11px;max-height:150px;overflow:auto}"+
    ".rs-card .rs-row{margin-top:0}.rs-card .rs-btn{padding:8px 12px;font-size:11.5px}"+
    ".rs-prod{display:flex;gap:10px;align-items:center}.rs-prod img{width:64px;height:80px;object-fit:cover;border-radius:10px;background:#222}"+
    ".rs-plist{display:flex;gap:8px;overflow-x:auto;margin-top:8px;scrollbar-width:none}.rs-plist button{flex:0 0 86px;border:1px solid rgba(246,247,248,.15);background:#121214;border-radius:12px;padding:5px;color:#f6f7f8;font-size:10px;cursor:pointer;text-align:left}.rs-plist button.on{border-color:#25d366}.rs-plist img{width:100%;height:96px;object-fit:cover;border-radius:8px;display:block;margin-bottom:4px;background:#222}"+
    ".rs-stk{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.rs-stk button{border:1px solid rgba(246,247,248,.12);background:repeating-conic-gradient(#151517 0% 25%,#101012 0% 50%) 50%/16px 16px;border-radius:16px;padding:6px;cursor:pointer}.rs-stk img{width:100%;display:block}"+
    ".rs-note{font-size:11.5px;color:rgba(246,247,248,.55);margin-top:8px;line-height:1.5}"+
    ".rs-new{display:grid;gap:8px}.rs-new input,.rs-new select{width:100%;box-sizing:border-box;background:#050505;border:1px solid rgba(246,247,248,.2);border-radius:12px;color:#fff;padding:10px 12px;font:14px Inter,sans-serif}";
    document.head.appendChild(s);}

  // ---------- render ----------
  function paint(){
    var el=S.el;
    el.innerHTML='<div class="rs">'+
      '<div class="rs-hero"><h2>💬 Respuestas CΛNEVΛ</h2><p>Escribe el número, toca un mensaje y se abre su chat de WhatsApp listo para enviar.</p>'+
        '<div class="rs-to"><input id="rsName" placeholder="Nombre (opcional)" value="'+esc(S.name)+'"><div class="ph"><input id="rsPhone" type="tel" inputmode="tel" placeholder="Celular 300 123 4567" value="'+esc(S.phone)+'"><button type="button" id="rsPaste">Pegar</button></div></div>'+
        '<div class="rs-rec" id="rsRec"></div></div>'+
      '<div class="rs-box rs-ai"><h3>✨ Caneva AI te escribe la respuesta</h3><textarea id="rsAsk" placeholder="Pega aquí lo que te escribió la clienta. Ej: hola, ¿hacen envíos a Medellín y cuánto se demora?"></textarea>'+
        '<div class="rs-row"><button type="button" class="rs-btn ai" id="rsAiGo">✨ Escribir respuesta</button><button type="button" class="rs-btn ghost" data-aitone="mas corta">Más corta</button><button type="button" class="rs-btn ghost" data-aitone="mas cálida y cercana">Más cálida</button><button type="button" class="rs-btn ghost" data-aitone="que cierre la venta">Que cierre la venta</button></div>'+
        '<div id="rsAiOut"></div></div>'+
      '<div class="rs-box"><h3>👗 Enviar una prenda con su foto</h3><input class="rs-search" id="rsPq" placeholder="Busca la prenda: jean, body, vestido…" style="margin:0"><div class="rs-plist" id="rsPl"></div><div id="rsPout"></div></div>'+
      '<div class="rs-cats" id="rsCats">'+CATS.map(function(c){return '<button type="button" data-cat="'+c[0]+'"'+(S.cat===c[0]?' class="on"':'')+'>'+c[1]+' '+c[0]+'</button>';}).join("")+'</div>'+
      '<input class="rs-search" id="rsQ" placeholder="🔎 Buscar mensaje: domicilio, pago, talla…" value="'+esc(S.q)+'">'+
      '<div class="rs-grid" id="rsGrid"></div>'+
      '<div class="rs-box"><h3>🖼 Stickers CΛNEVΛ</h3><div class="rs-stk" id="rsStk"></div><div class="rs-note">Toca un sticker para compartirlo en WhatsApp (o descargarlo). En WhatsApp también puedes volverlo sticker: ábrelo, mantén presionado y "Crear sticker".</div></div>'+
      '<div class="rs-box"><h3>➕ Crear mi respuesta</h3><div class="rs-new"><input id="rsNt" placeholder="Título (ej: Horario de atención)"><select id="rsNc">'+CATS.filter(function(c){return c[0]!=="Todas";}).map(function(c){return '<option'+(c[0]==="Mías"?' selected':'')+'>'+c[0]+'</option>';}).join("")+'</select>'+
        '<textarea id="rsNx" placeholder="Escribe el mensaje. Usa {nombre} para su nombre, {tienda} para la página, {llave} para tu llave Bre-B."></textarea><button type="button" class="rs-btn" id="rsNs">Guardar respuesta</button></div></div>'+
      '</div>';
    bind();grid();paintRecent();prodList();stickers();
  }
  function grid(){
    var q=S.q.toLowerCase(),L=all().filter(function(m){return (S.cat==="Todas"||m.cat===S.cat||(S.cat==="Mías"&&m.mine))&&(!q||(m.title+" "+m.text).toLowerCase().indexOf(q)>=0);});
    var ic={};CATS.forEach(function(c){ic[c[0]]=c[1];});
    S.el.querySelector("#rsGrid").innerHTML=L.length?L.map(function(m){return '<div class="rs-card'+(m.mine?' mine':'')+'"><div class="t">'+(ic[m.cat]||"⭐")+' '+esc(m.title)+'<small>'+esc(m.cat)+'</small></div><div class="rs-bubble">'+esc(fill(m.text))+'</div>'+
      '<div class="rs-row"><button type="button" class="rs-btn wa" data-send="'+m.id+'">💬 WhatsApp</button><button type="button" class="rs-btn ghost" data-copy="'+m.id+'">📋 Copiar</button>'+(m.mine?'<button type="button" class="rs-btn ghost" data-del="'+m.id+'">🗑</button>':'<button type="button" class="rs-btn ghost" data-dup="'+m.id+'" title="Copiar a Mías para editarla">✏️</button>')+'</div></div>';}).join(""):'<div class="rs-note">No hay mensajes con esa búsqueda.</div>';
  }
  function byId(id){var l=all();for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return null;}
  function paintRecent(){var r=recent(),el=S.el&&S.el.querySelector("#rsRec");if(!el)return;el.innerHTML=r.map(function(x){return '<button type="button" data-rec="'+x.k+'" data-n="'+esc(x.n)+'">'+(x.n?esc(first(x.n))+' · ':'')+esc(x.k.replace(/^57/,""))+'</button>';}).join("");}
  function prodList(){
    var P=(S.o.products&&S.o.products())||[],q=(S.el.querySelector("#rsPq").value||"").toLowerCase();
    var L=P.filter(function(p){return p&&p.nombre&&!/^ocult/i.test(p.stock||"")&&(!q||(p.nombre+" "+p.categoria).toLowerCase().indexOf(q)>=0);}).slice(0,24);
    S.el.querySelector("#rsPl").innerHTML=L.map(function(p,i){var img=p.imagen?"https://wsrv.nl/?url="+encodeURIComponent(p.imagen)+"&w=200&output=webp":"";return '<button type="button" data-pi="'+esc(p.nombre)+'"'+(S.prod&&S.prod.nombre===p.nombre?' class="on"':'')+'>'+(img?'<img src="'+img+'" alt="" loading="lazy">':'')+esc(p.nombre).slice(0,28)+'</button>';}).join("")||'<div class="rs-note">Sin prendas con ese nombre.</div>';
  }
  function prodOut(){
    var p=S.prod,o=S.el.querySelector("#rsPout");if(!p){o.innerHTML="";return;}
    var txt=fill("Mira esta belleza{ nombre} 😍💎\n*"+p.nombre+"* · "+p.precio+(p.tallas?"\nTallas: "+p.tallas:"")+"\n👉 {link}\n¿Te la separo?");
    o.innerHTML='<div class="rs-card" style="margin-top:10px"><div class="rs-bubble">'+esc(txt)+'</div><div class="rs-row"><button type="button" class="rs-btn wa" id="rsPs">💬 Enviar por WhatsApp</button><button type="button" class="rs-btn ghost" id="rsPc">📋 Copiar</button></div><div class="rs-note">El enlace muestra la foto de la prenda en WhatsApp y lleva directo a ella en la tienda.</div></div>';
    o.querySelector("#rsPs").onclick=function(){send(txt);};o.querySelector("#rsPc").onclick=function(){copy(txt,this);};
  }
  // ---------- stickers drawn in the browser (512x512, transparent) ----------
  var STK=[["¡Bienvenida!","💎"],["Gracias por tu compra","🖤"],["¡Pago recibido!","✅"],["Va en camino","🚚"],["Te queda divina","✨"],["¡Feliz cumpleaños!","🎂"],["Últimas unidades","🔥"],["Te la aparto","⏳"]];
  function drawSticker(t,e){
    var c=document.createElement("canvas");c.width=c.height=512;var x=c.getContext("2d");
    x.save();x.translate(256,256);x.rotate(-0.05);
    var g=x.createLinearGradient(-230,-150,230,150);g.addColorStop(0,"#0b0b0e");g.addColorStop(1,"#1a1a22");
    x.fillStyle="#ffffff";rr(x,-236,-166,472,332,70);x.fill();
    x.fillStyle=g;rr(x,-226,-156,452,312,62);x.fill();
    var s=x.createLinearGradient(-200,0,200,0);s.addColorStop(0,"#9aa3aa");s.addColorStop(.3,"#ffffff");s.addColorStop(.5,"#cfe6ff");s.addColorStop(.7,"#ffffff");s.addColorStop(1,"#d9c9ff");
    x.strokeStyle=s;x.lineWidth=5;rr(x,-210,-140,420,280,52);x.stroke();
    x.textAlign="center";x.textBaseline="middle";
    x.font="84px 'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif";x.fillText(e,0,-72);
    x.fillStyle=s;var fs=t.length>16?56:68;x.font="italic 500 "+fs+"px 'Cormorant Garamond',Georgia,serif";
    var w=t.split(" "),l1=t,l2="";if(t.length>14){var h=Math.ceil(w.length/2);l1=w.slice(0,h).join(" ");l2=w.slice(h).join(" ");}
    if(l2){x.fillText(l1,0,4);x.fillText(l2,0,4+fs);}else x.fillText(l1,0,20);
    x.fillStyle="rgba(255,255,255,.75)";x.font="600 20px Montserrat,Inter,sans-serif";x.fillText("C Λ N E V Λ",0,118);
    x.restore();return c;
  }
  function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
  function stickers(){
    var box=S.el.querySelector("#rsStk");
    box.innerHTML=STK.map(function(s,i){return '<button type="button" data-stk="'+i+'" title="'+esc(s[0])+'"><img alt="'+esc(s[0])+'"></button>';}).join("");
    (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
      STK.forEach(function(s,i){var img=box.querySelector('[data-stk="'+i+'"] img');if(img)img.src=drawSticker(s[0],s[1]).toDataURL("image/png");});});
  }
  function shareSticker(i){
    var s=STK[i],c=drawSticker(s[0],s[1]),type=c.toDataURL("image/webp").indexOf("image/webp")>0?"image/webp":"image/png";
    c.toBlob(function(b){
      var f=new File([b],"caneva-"+slug(s[0])+(type==="image/webp"?".webp":".png"),{type:type});
      if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:"CΛNEVΛ"}).catch(function(){});return;}
      var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();
    },type);
  }
  // ---------- AI ----------
  function aiRun(tone){
    var ask=(S.el.querySelector("#rsAsk").value||"").trim(),out=S.el.querySelector("#rsAiOut"),prev=out.dataset.reply||"";
    if(!ask&&!prev){S.el.querySelector("#rsAsk").focus();return;}
    out.innerHTML='<div class="rs-note">✨ Escribiendo…</div>';
    var q="Eres Mayra, dueña de CΛNEVΛ (tienda de ropa para mujeres en Barranquilla, Colombia). Escribe UNA respuesta de WhatsApp para una clienta"+(S.name?" llamada "+first(S.name):"")+". "+
      "Cálida, cercana, con 1 a 3 emojis (💎🖤✨), estilo lujo, máximo 6 líneas, sin comillas ni explicaciones. Datos reales que puedes usar: página canevacol.com (no hay catálogo en PDF, todo está en la página); "+
      "domicilio en Barranquilla y su área con contraentrega (1 día hábil); envíos a toda Colombia con Interrapidísimo pagando antes (Bre-B a la llave @caneva119 sin comisión, tarjeta, PSE o Nequi en la página) y se comparte la guía; envío gratis llevando 2 prendas dentro de Colombia; "+
      "Club Caneva gratis con 100 puntos de bienvenida; Apartado (se paga una parte hoy); Tarjeta Regalo; envíos internacionales con DHL, FedEx o UPS; Instagram @caneva.col. Si no sabes un dato (precio exacto, stock), invítala a verlo en la página o di que lo confirmas. "+
      (ask?"La clienta escribió: \""+ask+"\". ":"")+(prev&&tone?"Reescribe esta respuesta para que sea "+tone+": \""+prev+"\". ":"")+"Devuelve solo el mensaje.";
    api("/admin/ai",{method:"POST",body:{message:q,history:[]}}).then(function(d){
      var t=String(d.reply||"").replace(/^["“]|["”]$/g,"").replace(/\n?IDEAS:[\s\S]*$/i,"").trim();if(!t)throw new Error("Sin respuesta");
      out.dataset.reply=t;
      out.innerHTML='<div class="rs-card" style="margin-top:10px"><textarea id="rsAiTx">'+esc(t)+'</textarea><div class="rs-row"><button type="button" class="rs-btn wa" id="rsAiWa">💬 Enviar por WhatsApp</button><button type="button" class="rs-btn ghost" id="rsAiCp">📋 Copiar</button><button type="button" class="rs-btn ghost" id="rsAiSave">⭐ Guardar en Mías</button></div></div>';
      var tx=out.querySelector("#rsAiTx");tx.oninput=function(){out.dataset.reply=tx.value;};
      out.querySelector("#rsAiWa").onclick=function(){send(tx.value);};out.querySelector("#rsAiCp").onclick=function(){copy(tx.value,this);};
      out.querySelector("#rsAiSave").onclick=function(){var b=this;saveMine({id:"m"+Date.now().toString(36),cat:"Mías",title:(ask||"Respuesta IA").slice(0,40),text:tx.value}).then(function(){b.textContent="✓ Guardada";});};
    }).catch(function(e){out.innerHTML='<div class="rs-note">⚠️ '+esc(e.message)+'</div>';});
  }
  function saveMine(item){S.mine=S.mine.filter(function(m){return m.id!==item.id;});if(item)S.mine.unshift(item);
    return api("/admin/replies",{method:"POST",body:{list:S.mine}}).then(function(d){S.mine=d.list||S.mine;grid();}).catch(function(e){alert("No se pudo guardar: "+e.message);});}
  // ---------- events ----------
  function bind(){
    var el=S.el;
    el.querySelector("#rsName").oninput=function(){S.name=this.value;grid();prodOut();};
    el.querySelector("#rsPhone").oninput=function(){S.phone=this.value;};
    el.querySelector("#rsPaste").onclick=function(){try{navigator.clipboard.readText().then(function(t){var d=String(t||"").replace(/[^\d+]/g,"");if(d){S.phone=d;el.querySelector("#rsPhone").value=d;}});}catch(e){}};
    el.querySelector("#rsQ").oninput=function(){S.q=this.value;grid();};
    el.querySelector("#rsPq").oninput=prodList;
    el.querySelector("#rsAiGo").onclick=function(){aiRun("");};
    el.querySelector("#rsNs").onclick=function(){var t=el.querySelector("#rsNt").value.trim(),x=el.querySelector("#rsNx").value.trim(),c=el.querySelector("#rsNc").value;if(!t||!x){alert("Escribe el título y el mensaje.");return;}
      saveMine({id:"m"+Date.now().toString(36),cat:c,title:t,text:x}).then(function(){el.querySelector("#rsNt").value="";el.querySelector("#rsNx").value="";S.cat=c;paintCats();grid();});};
    el.addEventListener("click",function(e){
      var b=e.target.closest("button");if(!b||!el.contains(b))return;
      if(b.dataset.cat){S.cat=b.dataset.cat;paintCats();grid();return;}
      if(b.dataset.send){var m=byId(b.dataset.send);if(m)send(fill(m.text));return;}
      if(b.dataset.copy){var m2=byId(b.dataset.copy);if(m2)copy(fill(m2.text),b);return;}
      if(b.dataset.dup){var m3=byId(b.dataset.dup);if(m3){el.querySelector("#rsNt").value=m3.title;el.querySelector("#rsNx").value=m3.text;el.querySelector("#rsNc").value=m3.cat;el.querySelector("#rsNt").scrollIntoView({behavior:"smooth",block:"center"});}return;}
      if(b.dataset.del){if(confirm("¿Borrar esta respuesta?")){S.mine=S.mine.filter(function(m){return m.id!==b.dataset.del;});saveMine(null);}return;}
      if(b.dataset.rec){S.phone=b.dataset.rec;S.name=b.dataset.n||"";el.querySelector("#rsPhone").value=S.phone;el.querySelector("#rsName").value=S.name;grid();return;}
      if(b.dataset.pi){var P=(S.o.products&&S.o.products())||[];S.prod=P.filter(function(p){return p.nombre===b.dataset.pi;})[0]||null;el.querySelectorAll("#rsPl button").forEach(function(x){x.classList.toggle("on",x===b);});prodOut();return;}
      if(b.dataset.stk){shareSticker(+b.dataset.stk);return;}
      if(b.dataset.aitone){aiRun(b.dataset.aitone);return;}
    });
  }
  function paintCats(){S.el.querySelectorAll("#rsCats button").forEach(function(x){x.classList.toggle("on",x.dataset.cat===S.cat);});}
  window.CanevaRespuestas={mount:function(el,o){S.el=el;S.o=o;css();paint();
    api("/admin/replies").then(function(d){S.mine=d.list||[];grid();}).catch(function(){});},
    // open the module ready for one shopper (used from other screens)
    open:function(phone,name){S.phone=phone||"";S.name=name||"";if(S.el)paint();}};
})();
