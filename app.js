@@ -12,7 +12,7 @@ const say=(s,err=false,where="appmsg")=>{const e=$(where);e.textContent=s||"";e.
const roleLabel=r=>labels[normRole(r)]||String(r||"Acesso pendente");
function when(s){if(!s)return "";let d=new Date(s);return isNaN(d)?esc(s):d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}
function staffTabs(){return [
{id:"home",label:"Início"},{id:"account",label:"Minha conta"},{id:"notices",label:"Avisos"},{id:"events",label:"Calendário"},{id:"messages",label:"Mensagens"},{id:"files",label:"Documentos"},{id:"attendance",label:"Frequência"},{id:"grades",label:"Notas/boletim"},{id:"tasks",label:"Atividades"},...(admin()?[{id:"users",label:"Usuários"}]:[])
{id:"home",label:"Início"},{id:"notices",label:"Avisos"},{id:"events",label:"Calendário"},{id:"messages",label:"Mensagens"},{id:"files",label:"Documentos"},{id:"attendance",label:"Frequência"},{id:"grades",label:"Notas/boletim"},{id:"tasks",label:"Atividades"},...(isOwner()?[{id:"teacher-requests",label:"Solicitações de professor"}]:[]),...(admin()?[{id:"users",label:"Usuários"}]:[])
]}
async function getProfile(){
 const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
@@ -135,6 +135,35 @@ async function render(){
     }catch(err){status.textContent=friendly(err);}
     finally{btn.disabled=false}
   });
   // Solicitação de acesso como professor para contas que ainda não são da equipe.
   if(!staff()){
     const {data:reqRows,error:reqError}=await sb.from("teacher_access_requests").select("id,status,message,created_at,review_note").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1);
     if(reqError)throw reqError;
     const latest=(reqRows||[])[0];
     const requestBox=document.createElement("section");
     requestBox.className="formbox";
     if(latest?.status==="pending"){
       requestBox.innerHTML=`<h3>Solicitação para ser professor</h3><p>Você já enviou uma solicitação em ${esc(when(latest.created_at))}. Ela está aguardando análise do dono do aplicativo.</p><p class="pill">Status: Pendente</p>`;
     }else if(latest?.status==="approved"){
       requestBox.innerHTML=`<h3>Solicitação para ser professor</h3><p class="pill">Status: Aprovada</p><p>Seu pedido foi aprovado. Saia da conta e entre novamente para atualizar seu acesso.</p>`;
     }else{
       requestBox.innerHTML=`<h3>Solicitar acesso como professor</h3><p class="muted">Explique brevemente por que precisa de acesso de professor. A solicitação será enviada ao dono do aplicativo, que decidirá se aprova ou rejeita.</p>${latest?.status==="rejected"?`<p class="pill">Sua solicitação anterior foi rejeitada.${latest.review_note?` Motivo: ${esc(latest.review_note)}`:" Você pode enviar uma nova solicitação."}</p>`:""}<form id="teacher-request-form"><label>Mensagem (opcional)<textarea name="message" maxlength="1000" placeholder="Ex.: Sou professor(a) da escola e preciso publicar avisos e atividades."></textarea></label><button type="submit">Enviar solicitação</button><p id="teacher-request-msg" class="muted" role="status"></p></form>`;
       const requestForm=requestBox.querySelector("#teacher-request-form");
       requestForm.addEventListener("submit",async ev=>{
         ev.preventDefault();
         const btn=requestForm.querySelector("button");btn.disabled=true;
         const status=requestForm.querySelector("#teacher-request-msg");
         try{
           const message=String(new FormData(requestForm).get("message")||"").trim()||null;
           const {error:insertError}=await sb.from("teacher_access_requests").insert({user_id:user.id,message,status:"pending"});
           if(insertError)throw insertError;
           say("Solicitação enviada ao dono do aplicativo.");
           await render();
         }catch(err){status.textContent=friendly(err);btn.disabled=false}
       });
     }
     c.appendChild(requestBox);
   }
 }
 if(tab==="notices"){let rows=await load("notices");c.innerHTML=`<h2>Avisos e comunicados</h2><p class="muted">Publicações oficiais da escola.</p>`+(staff()?form("Publicar aviso",[{name:"title",label:"Título"},{name:"content",label:"Comunicado",type:"textarea"}]):"")+cards(rows,"title","content",r=>authorMeta(r,"author_id","author_name",r.created_at));if(staff())bind("notices",{title:"title",content:"content"},{author_name:profile.full_name||user.email})}
 if(tab==="events"){let rows=await load("school_events");c.innerHTML=`<h2>Calendário escolar</h2><p class="muted">Reuniões, provas, festas e datas importantes.</p>`+(staff()?form("Cadastrar evento",[{name:"title",label:"Nome do evento"},{name:"event_date",label:"Data e hora",type:"datetime-local"},{name:"description",label:"Descrição",type:"textarea",required:false}]):"")+cards(rows,"title","description",r=>`${authorMeta(r,"author_id","author_name",r.event_date)}`);if(staff())bind("school_events",{title:"title",event_date:"event_date",description:"description"})}
@@ -257,10 +286,39 @@ if (tab === "grades") {
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
async function show(session){if(!session){$("auth").hidden=false;$("app").hidden=true;$("account-icon").hidden=true;return}user=session.user;await getProfile();$("auth").hidden=true;$("app").hidden=false;$("account-icon").hidden=false;$("hello").innerHTML=`Olá, ${esc(profile.full_name||user.email)}! ${isOwner()?'<span class="owner-badge">👑 DONO</span>':""}`;
 const isRoleUnknown=!labels[normRole(profile.role)];$("role-alert").hidden=!isRoleUnknown;if(isRoleUnknown)$("role-alert").textContent="Seu perfil tem um cargo não reconhecido. Peça à direção para corrigir a coluna role na tabela profiles.";
 tab="home";await render()}
async function init(){
@@ -270,6 +328,7 @@ async function init(){
 $("signup").onclick=async()=>{try{say("","false","authmsg");const {data,error}=await sb.auth.signUp({email:$("email").value.trim(),password:$("password").value,options:{data:{full_name:$("email").value.split("@")[0]}}});if(error)throw error;say(data.session?"Conta criada.":"Conta criada. Confira seu e-mail para confirmar.",false,"authmsg")}catch(e){say(friendly(e),true,"authmsg")}};
 $("reset").onclick=async()=>{try{const em=$("email").value.trim();if(!em)throw Error("Digite seu e-mail primeiro.");const {error}=await sb.auth.resetPasswordForEmail(em);if(error)throw error;say("Se o e-mail estiver cadastrado, você receberá instruções.",false,"authmsg")}catch(e){say(friendly(e),true,"authmsg")}};
 $("logout").onclick=async()=>{await sb.auth.signOut()};
 $("account-icon").onclick=()=>{tab="account";render();document.getElementById("content").scrollIntoView({behavior:"smooth",block:"start"})};
 sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>show(session).catch(e=>say(friendly(e),true)),0)});
 const {data:{session}}=await sb.auth.getSession();if(session)await show(session)
}
