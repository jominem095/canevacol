/* CANEVA admin · Avísame (v1)
   Customers who asked to be told when a sold-out garment or size comes back (/waitlist in the Worker).
   Garments that are back come first with a ready WhatsApp message per customer; mark each one as notified / bought.
   Mounted by admin_movil.html: CanevaAvisame.mount(el, {api, token}) · CanevaAvisame.count({api, token}) for the tab badge */
(function(){
  var S={el:null,o:null,d:null,f:"listas"};
  function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function api(o,path,opt){opt=opt||{};return fetch(o.api+path,{method:opt.method||"GET",headers:{"Content-Type":"application/json","x-admin-token":o.token()},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||("Error "+r.status));return d;});});}
  function waNum(p){var d=String(p||"").replace(/[^\d]/g,"");if(d.length===10&&d[0]==="3")d="57"+d;return d;}
  function first(n){return String(n||"").trim().split(/\s+/)[0]||"";}
  function fdate(iso){try{return new Date(iso).toLocaleDateString("es-CO",{day:"numeric",month:"short"});}catch(e){return "";}}
  function msgBack(x){return "Hola "+first(x.name)+" 💛 Te escribo de CΛNEVΛ: ¡volvió "+x.product+(x.size?" en talla "+x.size:"")+"! Me pediste que te avisara. Aquí la puedes ver y pedir: "+x.link+"\n¿Te la aparto?";}
  function msgWait(x){return "Hola "+first(x.name)+" 💛 Te escribo de CΛNEVΛ por "+x.product+(x.size?" talla "+x.size:"")+". Todavía no ha llegado, pero te tengo en la lista y te aviso apenas llegue. ¿Te muestro algo parecido mientras tanto?";}
  function toast(t){var d=document.createElement("div");d.className="aw-toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},2400);}

  function css(){if(document.getElementById("aw-css"))return;var s=document.createElement("style");s.id="aw-css";s.textContent=
    ".aw{padding:4px 0 90px;color:#f6f7f8;font-family:Inter,system-ui,sans-serif}"+
    ".aw-hero{border-radius:24px;padding:18px;margin:4px 0 12px;background:radial-gradient(500px 240px at 0% 0%,rgba(255,231,168,.14),transparent 60%),linear-gradient(180deg,#121215,#0a0a0c);border:1px solid rgba(246,247,248,.12)}"+
    ".aw-hero h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px}.aw-hero p{margin:4px 0 12px;font-size:13px;color:rgba(246,247,248,.7)}"+
    ".aw-k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media(max-width:560px){.aw-k{grid-template-columns:repeat(2,1fr)}}"+
    ".aw-k button{border-radius:16px;padding:10px 12px;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(246,247,248,.12);color:#f6f7f8;cursor:pointer;font-family:inherit}"+
    ".aw-k button.on{border-color:#ffe7a8;background:rgba(255,231,168,.08)}.aw-k b{display:block;font-size:22px}.aw-k small{font-size:11px;color:rgba(246,247,248,.65)}"+
    ".aw-g{border-radius:20px;padding:12px;margin:10px 0;background:linear-gradient(180deg,#121215,#0b0b0d);border:1px solid rgba(246,247,248,.12)}.aw-g.back{border-color:rgba(140,230,170,.55);box-shadow:0 0 0 1px rgba(140,230,170,.15) inset}"+
    ".aw-gh{display:flex;gap:12px;align-items:center}.aw-gh img{width:54px;height:70px;object-fit:cover;border-radius:12px;background:#1a1a1c}.aw-gh b{display:block;font-size:15px}.aw-gh small{font-size:12px;color:rgba(246,247,248,.6)}"+
    ".aw-badge{display:inline-block;margin-top:4px;font-size:10.5px;border-radius:999px;padding:3px 8px;background:rgba(140,230,170,.15);color:#a8f0c0;border:1px solid rgba(140,230,170,.4)}.aw-badge.w{background:rgba(255,255,255,.06);color:rgba(246,247,248,.7);border-color:rgba(246,247,248,.15)}"+
    ".aw-r{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06);margin-top:9px;font-size:13px}.aw-r .who{flex:1 1 150px}.aw-r .who small{display:block;color:rgba(246,247,248,.55);font-size:11px}"+
    ".aw-r a,.aw-r button{border:0;border-radius:999px;padding:8px 11px;font:700 11.5px Inter,sans-serif;cursor:pointer;text-decoration:none}"+
    ".aw-r a.wa{background:#25d366;color:#04140a}.aw-r a.wa.soft{background:rgba(37,211,102,.14);color:#9ff0bf;border:1px solid rgba(37,211,102,.4)}"+
    ".aw-r button{background:rgba(255,255,255,.07);color:#f6f7f8;border:1px solid rgba(246,247,248,.16)}.aw-r .st{font-size:11px;color:rgba(246,247,248,.6)}"+
    ".aw-empty{padding:30px 16px;text-align:center;color:rgba(246,247,248,.6);font-size:13px;border:1px dashed rgba(246,247,248,.18);border-radius:18px}"+
    ".aw-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:99;background:#f6f7f8;color:#050505;padding:10px 16px;border-radius:999px;font:600 13px Inter,sans-serif}";
    document.head.appendChild(s);}

  function render(){
    var d=S.d,el=S.el;if(!d){el.innerHTML='<div class="aw-empty">Cargando…</div>';return;}
    var c=d.counts||{},f=S.f;
    var list=(d.list||[]).filter(function(x){
      if(f==="listas")return x.back;if(f==="esperando")return x.status==="esperando";if(f==="avisadas")return x.status==="avisada";return x.status==="compro"||x.status==="no";});
    var groups={},order=[];
    list.forEach(function(x){var k=x.pkey;if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(x);});
    order.sort(function(a,b){var ba=groups[a].some(function(x){return x.back;})?0:1,bb=groups[b].some(function(x){return x.back;})?0:1;return ba-bb||groups[b].length-groups[a].length;});
    var empty={listas:"Todavía no ha vuelto ninguna prenda que estén esperando. Cuando una vuelva al inventario te llega un aviso y aparece aquí.",esperando:"Nadie está esperando prendas por ahora. Cuando una clienta toque “Avísame” en una talla o prenda agotada, sale aquí.",avisadas:"Aquí quedan las clientas a las que ya les escribiste.",compraron:"Aquí quedan las que compraron después del aviso."};
    el.innerHTML='<div class="aw"><div class="aw-hero"><h2>🔔 Avísame</h2><p>Clientas que quieren una prenda o talla agotada. Cuando vuelve, escríbeles con un toque: son ventas casi seguras.</p>'+
      '<div class="aw-k">'+[["listas","✨ Ya volvió",c.listas],["esperando","⏳ Esperando",c.esperando],["avisadas","💬 Avisadas",c.avisadas],["compraron","🛍 Compraron",c.compraron]].map(function(k){return '<button type="button" data-f="'+k[0]+'"'+(f===k[0]?' class="on"':'')+'><b>'+(k[2]||0)+'</b><small>'+k[1]+'</small></button>';}).join("")+'</div></div>'+
      (order.length?order.map(function(k){var g=groups[k],x0=g[0],back=g.some(function(x){return x.back;});
        var sizes={};g.forEach(function(x){if(x.size)sizes[x.size]=(sizes[x.size]||0)+1;});
        return '<div class="aw-g'+(back?' back':'')+'"><div class="aw-gh">'+(x0.image?'<img src="'+esc(x0.image)+'" alt="" loading="lazy">':'')+'<div><b>'+esc(x0.product)+'</b><small>'+g.length+' clienta'+(g.length>1?'s':'')+(Object.keys(sizes).length?' · '+Object.keys(sizes).map(function(s){return "T"+s+(sizes[s]>1?" ×"+sizes[s]:"");}).join(", "):"")+(x0.price?' · '+esc(x0.price):'')+'</small><br><span class="aw-badge'+(back?'':' w')+'">'+(back?'✨ Ya está a la venta':'Agotada')+'</span></div></div>'+
          g.map(function(x){var wa=waNum(x.phone),msg=x.back?msgBack(x):msgWait(x);
            return '<div class="aw-r" data-id="'+x.id+'"><div class="who"><b>'+esc(x.name)+'</b>'+(x.size?' · T'+esc(x.size):'')+'<small>'+esc(x.phone)+' · pidió aviso el '+fdate(x.createdAt)+(x.status==="avisada"?' · avisada '+fdate(x.doneAt):'')+'</small></div>'+
              (x.status==="esperando"||x.status==="avisada"?'<a class="wa'+(x.back?'':' soft')+'" target="_blank" rel="noopener" data-act="wa" href="https://wa.me/'+wa+'?text='+encodeURIComponent(msg)+'">'+(x.back?'💬 Avisarle':'💬 Escribirle')+'</a>':'')+
              (x.status==="avisada"?'<button type="button" data-st="compro">🛍 Compró</button><button type="button" data-st="no">No compró</button>':'')+
              (x.status==="esperando"?'<button type="button" data-st="avisada">✓ Ya le avisé</button>':'')+
              (x.status==="compro"?'<span class="st">🛍 Compró</span>':x.status==="no"?'<span class="st">No compró</span>':'')+
              '<button type="button" data-st="borrar" title="Quitar de la lista">🗑</button></div>';}).join("")+'</div>';}).join(""):'<div class="aw-empty">'+empty[f]+'</div>')+'</div>';
  }
  function load(){return api(S.o,"/admin/waitlist").then(function(d){S.d=d;if(S.f==="listas"&&!d.counts.listas&&d.counts.esperando)S.f="esperando";render();}).catch(function(e){S.el.innerHTML='<div class="aw-empty">'+esc(e.message)+'</div>';});}
  function setSt(id,st){
    if(st==="borrar"&&!confirm("¿Quitar a esta clienta de la lista?"))return;
    api(S.o,"/admin/waitlist/"+id,{method:"POST",body:{status:st}}).then(function(){toast(st==="borrar"?"Quitada":"Guardado ✓");load();}).catch(function(e){toast(e.message);});
  }
  function mount(el,o){
    S.el=el;S.o=o;css();
    if(!el.dataset.aw){el.dataset.aw="1";
      el.addEventListener("click",function(e){
        var fb=e.target.closest("[data-f]");if(fb){S.f=fb.dataset.f;render();return;}
        var sb=e.target.closest("[data-st]");if(sb){setSt(sb.closest("[data-id]").dataset.id,sb.dataset.st);return;}
        var wa=e.target.closest('[data-act="wa"]');if(wa){var r=wa.closest("[data-id]"),x=(S.d.list||[]).find(function(y){return String(y.id)===r.dataset.id;});
          if(x&&x.back&&x.status==="esperando")setTimeout(function(){setSt(x.id,"avisada");},800);}
      });}
    render();return load();
  }
  function count(o){return api(o,"/admin/waitlist").then(function(d){return d.counts||{};});}
  window.CanevaAvisame={mount:mount,reload:load,count:count};
})();
