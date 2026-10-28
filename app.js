
Skip to content

    ferreiracadu97-source
    App-Nossa-Escola

Repository navigation

Code
Issues
Pull requests
Agents
Actions
Projects
Wiki
Security and quality
Insights

    Settings

Files
tT

WhatsApp Image 2026-10-28 at 08.46.57.jpeg
apep_Nossa_Escola_V2_Publicacao.zip
app.js
config.js
escola-francisco-farias.jpeg
index.html

    style.css

    App-Nossa-Escola

/
in
main

Indent mode
Indent size
Line wrap mode
Editing app.js file contents
242
243
244
245
246
247
248
249
250
251
252
253
254
255
256
257
258
259
260
261
262
263
264
265
266
267
268
269
270
271
272
273
274
275
276
277
278
279
280
281
282
283
284
285
286
287
288
289
290
291
292
293
294
295
296
297
298
299
300
301
302
303
304
305
306
    cards(
      rows,
      "student_name",
      r => `${r.subject}: ${r.grade}`,
      r => r.term || ""
    );

  if (staff()) {
    bind("grades", {
      student_id: "student_id",
      subject: "subject",
      grade: "grade",
      term: "term"
    });
  }
}

 if(tab==="tasks"){let rows=await load("tasks");c.innerHTML=`<h2>Atividades e tarefas</h2><p class="muted">Atividades e prazos publicados pela escola.</p>`+(staff()?form("Cadastrar atividade",[{name:"title",label:"Atividade"},{name:"description",label:"Descrição",type:"textarea",required:false},{name:"due_date",label:"Prazo",type:"date",required:false}]):"")+cards(rows,"title","description",r=>`Prazo: ${r.due_date||"não definido"}`);if(staff())bind("tasks",{title:"title",description:"description",due_date:"due_date"})}
 if(tab==="teacher-requests"){
   if(!isOwner()){c.innerHTML=`<div class="empty">Acesso restrito à conta DONO.</div>`;return}
   const {data:requests,error}=await sb.from("teacher_access_requests").select("id,user_id,message,status,created_at,review_note").eq("status","pending").order("created_at",{ascending:true});
   if(error)throw error;
   const ids=[...new Set((requests||[]).map(r=>r.user_id))];
   let profilesById={};
   if(ids.length){
     const {data:people,error:peopleError}=await sb.from("profiles").select("id,full_name,email,role").in("id",ids);
     if(peopleError)throw peopleError;
     profilesById=Object.fromEntries((people||[]).map(p=>[p.id,p]));
   }
   c.innerHTML=`<h2>Solicitações para ser professor</h2><p class="muted">Somente a conta DONO pode aprovar ou rejeitar pedidos. A aprovação altera o cargo para professor.</p>`+
     ((requests||[]).length?(requests||[]).map(r=>{const person=profilesById[r.user_id]||{};return `<article class="card"><h3>${esc(person.full_name||"Nome não informado")}</h3><p>${esc(person.email||"E-mail não disponível")}</p><p class="meta">Enviada: ${esc(when(r.created_at))}</p><p>${esc(r.message||"Solicitação de acesso como professor.")}</p><div class="actions"><button type="button" data-review="approve" data-request-id="${esc(r.id)}">Aprovar</button><button type="button" class="secondary" data-review="reject" data-request-id="${esc(r.id)}">Rejeitar</button></div></article>`}).join(""):`<div class="empty">Não há solicitações pendentes de professor.</div>`);
   c.querySelectorAll("[data-review]").forEach(btn=>btn.addEventListener("click",async()=>{
     if(!isOwner()){say("Somente a conta DONO pode analisar solicitações.",true);return}
     const approve=btn.dataset.review==="approve";
     const requestId=btn.dataset.requestId;
     const note=approve?null:(window.prompt("Motivo da rejeição (opcional):")||null);
     const action=approve?"aprovar":"rejeitar";
     if(!window.confirm(`Tem certeza de que deseja ${action} esta solicitação?`))return;
     const buttons=c.querySelectorAll("[data-review]");buttons.forEach(b=>b.disabled=true);
     try{
       const {error:reviewError}=await sb.rpc("review_teacher_access_request",{p_request_id:requestId,p_approve:approve,p_review_note:note});
       if(reviewError)throw reviewError;
       say(approve?"Solicitação aprovada. A conta agora tem o cargo de professor.":"Solicitação rejeitada.",false);
       await render();
     }catch(err){say(friendly(err),true);buttons.forEach(b=>b.disabled=false)}
   }));
 }
 if(tab==="users"&&admin()){let rows=await load("profiles");c.innerHTML=`<h2>Perfis de usuários</h2><p class="muted">Ajuste os cargos em Supabase → Editor de tabelas → profiles. O usuário não pode mudar o próprio cargo.</p>`+cards(rows,"full_name",r=>r.email||"",r=>roleLabel(r.role))}
 }catch(e){c.innerHTML=`<div class="empty"><b>Não foi possível carregar esta área.</b><p>${esc(friendly(e))}</p></div>`}
}
async function show(session){if(!session){$("auth").hidden=false;$("app").hidden=true;return}user=session.user;await getProfile();$("auth").hidden=true;$("app").hidden=false;$("hello").innerHTML=`Olá, ${esc(profile.full_name||user.email)}! ${isOwner()?'<span class="owner-badge">👑 DONO</span>':""}`;
 const isRoleUnknown=!labels[normRole(profile.role)];$("role-alert").hidden=!isRoleUnknown;if(isRoleUnknown)$("role-alert").textContent="Seu perfil tem um cargo não reconhecido. Peça à direção para corrigir a coluna role na tabela profiles.";
 tab="home";await render()}
async function init(){
 if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("SEU-PROJETO")||!cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")){say("Configure config.js com a URL e a chave anon/public do Supabase.","true","authmsg");return}
 sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 $("login").onclick=async()=>{say("","false","authmsg");const {error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)say(friendly(error),true,"authmsg")};
 $("signup").onclick=async()=>{try{say("","false","authmsg");const {data,error}=await sb.auth.signUp({email:$("email").value.trim(),password:$("password").value,options:{data:{full_name:$("email").value.split("@")[0]}}});if(error)throw error;say(data.session?"Conta criada.":"Conta criada. Confira seu e-mail para confirmar.",false,"authmsg")}catch(e){say(friendly(e),true,"authmsg")}};
 $("reset").onclick=async()=>{try{const em=$("email").value.trim();if(!em)throw Error("Digite seu e-mail primeiro.");const {error}=await sb.auth.resetPasswordForEmail(em);if(error)throw error;say("Se o e-mail estiver cadastrado, você receberá instruções.",false,"authmsg")}catch(e){say(friendly(e),true,"authmsg")}};
 $("logout").onclick=async()=>{await sb.auth.signOut()};
 sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>show(session).catch(e=>say(friendly(e),true)),0)});
 const {data:{session}}=await sb.auth.getSession();if(session)await show(session)
}
document.addEventListener("DOMContentLoaded",init);
})();
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
