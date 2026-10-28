(() => {
const $=id=>document.getElementById(id), cfg=window.APP_CONFIG||{};
let sb,user,profile,tab="home";
 const OWNER_ID="575779b7-dc46-4252-b362-c9dc94bf0a68";
const isOwner=()=>user?.id===OWNER_ID;
const labels={teacher:"Professor(a)",professor:"Professor(a)",professora:"Professor(a)",director:"Direção",diretor:"Direção",diretora:"Direção",admin:"Administrador(a)",administrator:"Administrador(a)",guardian:"Responsável",responsavel:"Responsável",responsável:"Responsável",parent:"Responsável",student:"Aluno(a)",aluno:"Aluno(a)",aluna:"Aluno(a)"};
function normRole(raw){let r=String(raw||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s-]+/g,"_");const map={professor:"teacher",professora:"teacher",docente:"teacher",diretor:"director",diretora:"director",direcao:"director",coordenador:"director",coordenadora:"director",administrador:"admin",administradora:"admin",responsavel:"guardian",pai:"guardian",mae:"guardian",encarregado:"guardian",encarregada:"guardian",aluno:"student",aluna:"student",estudante:"student"};return map[r]||r||"guardian"}
const staff=()=>isOwner()||["teacher","director","admin"].includes(normRole(profile?.role));
const admin=()=>isOwner()||["director","admin"].includes(normRole(profile?.role));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(s,err=false,where="appmsg")=>{const e=$(where);e.textContent=s||"";e.classList.toggle("error",!!err)};
const roleLabel=r=>labels[normRole(r)]||String(r||"Acesso pendente");
function when(s){if(!s)return "";let d=new Date(s);return isNaN(d)?esc(s):d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}
function staffTabs(){return [
{id:"home",label:"Início"},{id:"account",label:"Minha conta"},{id:"notices",label:"Avisos"},{id:"events",label:"Calendário"},{id:"messages",label:"Mensagens"},{id:"files",label:"Documentos"},{id:"attendance",label:"Frequência"},{id:"grades",label:"Notas/boletim"},{id:"tasks",label:"Atividades"},...(admin()?[{id:"users",label:"Usuários"}]:[])
]}
async function getProfile(){
 const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
 if(error)throw error;
 profile=data||{id:user.id,email:user.email,full_name:user.email,role:"guardian"};
 profile.role=normRole(profile.role);
}
async function load(table, order="created_at"){const {data,error}=await sb.from(table).select("*").order(order,{ascending:false}).limit(100);if(error)throw error;return data||[]}

function form(title, fields, button = "Salvar") {
  return `<div class="formbox"><h3>${title}</h3><form class="entryform">${
    fields.map(f => `<label>${f.label}${
      f.type === "textarea"
        ? `<textarea name="${f.name}" ${f.required === false ? "" : "required"}></textarea>`
        : f.type === "select"
          ? `<select name="${f.name}" ${f.required === false ? "" : "required"}>
              <option value="">Selecione...</option>
              ${(f.options || []).map(o =>
                `<option value="${o.value}">${o.label}</option>`
              ).join("")}
            </select>`
          : `<input name="${f.name}" type="${f.type || "text"}" ${f.required === false ? "" : "required"} ${f.step ? `step="${f.step}"` : ""}>`
    }</label>`).join("")
  }<button>${button}</button></form></div>`;
}

const OWNER_BADGE_MARKER="__OWNER_BADGE_MARKER__";
function authorMeta(row,idField,nameField,dateValue){
  const owner=(row[idField]===OWNER_ID);
  const name=row[nameField]||(row[idField]===user?.id?profile?.full_name:"")||"Escola";
  return `${name}${owner?OWNER_BADGE_MARKER:""}${dateValue?` · ${when(dateValue)}`:""}`;
}
function cards(rows,title,body,meta){return rows.length?rows.map(r=>{const rawMeta=typeof meta==="function"?meta(r):(r[meta]||"");const safeMeta=esc(rawMeta).replaceAll(esc(OWNER_BADGE_MARKER),'<span class="owner-badge">👑 DONO</span>');return `<article class="card"><h3>${esc(r[title]||"Sem título")}</h3><p>${esc(typeof body==="function"?body(r):(r[body]||""))}</p><div class="meta">${safeMeta}</div></article>`}).join(""):`<div class="empty">Ainda não há registros.</div>`}

async function insert(formEl, table, map, extra = {}) {
  const btn = formEl.querySelector("button");
  btn.disabled = true;

  try {
    const fd = new FormData(formEl);
    const row = { ...extra };

    for (const [field, col] of Object.entries(map)) {
      let v = fd.get(field);
      if (v === "") v = null;
      row[col] = v;
    }

    if (map.student_id) {
      const select = formEl.elements.namedItem("student_id");
      if (!select || !select.value) {
        throw Error("Selecione um aluno.");
      }

      row.student_id = select.value;
      row.student_name =
        select.options[select.selectedIndex].text;
    }

    if ([
      "notices",
      "school_events",
      "school_files",
      "attendance",
      "grades",
      "tasks"
    ].includes(table)) {
      row.author_id = user.id;
    }

    if (table === "messages") {
      row.sender_id = user.id;
    }

    const { error } = await sb.from(table).insert(row);
    if (error) throw error;

    say("Salvo com sucesso!");
    await render();
  } catch (e) {
    say(friendly(e), true);
  } finally {
    btn.disabled = false;
  }
}

function friendly(e){let m=e?.message||String(e);if(/schema cache|does not exist|could not find the table/i.test(m))return "A tabela necessária não existe neste banco. Confira o arquivo MIGRACAO_SUPABASE.sql incluído no ZIP.";if(/row-level security|permission denied|not allowed/i.test(m))return "O banco bloqueou esta ação por permissão. Confira se o perfil foi atribuído corretamente e se a migração SQL foi executada.";return m}
function bind(table,map,extra={}){const f=$("content").querySelector(".entryform");if(f)f.addEventListener("submit",e=>{e.preventDefault();insert(f,table,map,extra)})}
async function render(){
 $("nav").innerHTML=staffTabs().map(t=>`<button data-id="${t.id}" class="${tab===t.id?"active":""}">${t.label}</button>`).join("");
 $("nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{tab=b.dataset.id;render()});
 const c=$("content");c.innerHTML="<p>Carregando...</p>";say("");
 try{
 if(tab==="home"){c.innerHTML=`<p class="eyebrow">RESUMO</p><h2>Olá, ${esc(profile.full_name||user.email)}!</h2><p class="muted">Seu perfil é <span class="pill">${esc(roleLabel(profile.role))}</span>.</p><div class="card"><h3>O que você pode fazer?</h3><p>${staff()?"Publicar avisos, cadastrar eventos e organizar atividades escolares.":"Consultar avisos, calendário e informações liberadas para seu perfil."}</p></div><p class="small muted">Se seu cargo estiver incorreto, peça à direção para ajustar seu perfil. O aplicativo não permite que cada pessoa mude o próprio cargo.</p>`}
 if(tab==="account"){
   c.innerHTML=`<h2>Minha conta</h2><p class="muted">Escolha o nome que aparecerá no App Nossa Escola. Seu cargo não pode ser alterado por esta tela.</p><div class="formbox"><form id="account-form"><label>Nome completo<input name="full_name" maxlength="100" required value="${esc(profile.full_name||"")}" autocomplete="name"></label><button type="submit">Salvar nome</button><p id="account-msg" class="muted" role="status"></p></form></div>`;
   const af=$("account-form");
   af.addEventListener("submit",async e=>{
     e.preventDefault();
     const btn=af.querySelector("button"); btn.disabled=true;
     const name=new FormData(af).get("full_name").trim();
     const status=$("account-msg");
     if(!name){status.textContent="Digite seu nome.";btn.disabled=false;return}
     try{
       const {data,error}=await sb.from("profiles").update({full_name:name}).eq("id",user.id).select("id,full_name,role").maybeSingle();
       if(error)throw error;
       if(!data)throw new Error("Não foi possível atualizar o perfil. Confirme se existe uma linha desta conta na tabela profiles e se a política permite alterar o próprio nome.");
       profile={...profile,...data};
       $("hello").innerHTML=`Olá, ${esc(profile.full_name||user.email)}! ${isOwner()?'<span class="owner-badge">👑 DONO</span>':""}`;
       status.textContent="Nome salvo com sucesso!";
     }catch(err){status.textContent=friendly(err);}
     finally{btn.disabled=false}
   });
 }
 if(tab==="notices"){let rows=await load("notices");c.innerHTML=`<h2>Avisos e comunicados</h2><p class="muted">Publicações oficiais da escola.</p>`+(staff()?form("Publicar aviso",[{name:"title",label:"Título"},{name:"content",label:"Comunicado",type:"textarea"}]):"")+cards(rows,"title","content",r=>authorMeta(r,"author_id","author_name",r.created_at));if(staff())bind("notices",{title:"title",content:"content"},{author_name:profile.full_name||user.email})}
 if(tab==="events"){let rows=await load("school_events");c.innerHTML=`<h2>Calendário escolar</h2><p class="muted">Reuniões, provas, festas e datas importantes.</p>`+(staff()?form("Cadastrar evento",[{name:"title",label:"Nome do evento"},{name:"event_date",label:"Data e hora",type:"datetime-local"},{name:"description",label:"Descrição",type:"textarea",required:false}]):"")+cards(rows,"title","description",r=>`${authorMeta(r,"author_id","author_name",r.event_date)}`);if(staff())bind("school_events",{title:"title",event_date:"event_date",description:"description"})}
 if(tab==="messages"){let rows=await load("messages");c.innerHTML=`<h2>Mensagens</h2><p class="muted">Mural básico para comunicação entre usuários autenticados. Não é chat privado.</p>`+form("Enviar mensagem",[{name:"content",label:"Mensagem",type:"textarea"}])+cards(rows,"sender_name","content",r=>authorMeta(r,"sender_id","sender_name",r.created_at));bind("messages",{content:"content"},{sender_name:profile.full_name||user.email})}
 if(tab==="files"){let rows=await load("school_files");c.innerHTML=`<h2>Documentos e arquivos</h2><p class="muted">Cadastro de links para documentos. Use somente links autorizados.</p>`+(staff()?form("Adicionar documento",[{name:"title",label:"Nome do documento"},{name:"file_url",label:"Link do arquivo",type:"url"},{name:"description",label:"Descrição",required:false}]):"")+cards(rows,"title",r=>r.description||r.file_url,r=>r.file_url||"");if(staff())bind("school_files",{title:"title",file_url:"file_url",description:"description"})}
 
if (tab === "attendance") {
  let rows = await load("attendance");
  let studentOptions = [];

  if (staff()) {
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .order("full_name");

    if (error) throw error;

    studentOptions = (data || []).map(p => ({
      value: p.id,
      label: esc(p.full_name || p.email || "Aluno sem nome")
    }));
  }

  c.innerHTML =
    `<h2>Frequência dos alunos</h2>
     <p class="muted">Selecione a conta correta do aluno para registrar a frequência.</p>` +
    (staff()
      ? form("Registrar frequência", [
          {
            name: "student_id",
            label: "Aluno",
            type: "select",
            options: studentOptions
          },
          { name: "attendance_date", label: "Data", type: "date" },
          { name: "status", label: "Situação (presente/ausente)" },
          {
            name: "notes",
            label: "Observação",
            required: false,
            type: "textarea"
          }
        ])
      : "") +
    cards(
      rows,
      "student_name",
      r => r.notes || "",
      r => `${r.attendance_date || ""} · ${r.status || ""}`
    );

  if (staff()) {
    bind("attendance", {
      student_id: "student_id",
      attendance_date: "attendance_date",
      status: "status",
      notes: "notes"
    });
  }
}

 
if (tab === "grades") {
  let rows = await load("grades");
  let studentOptions = [];

  if (staff()) {
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .order("full_name");

    if (error) throw error;

    studentOptions = (data || []).map(p => ({
      value: p.id,
      label: esc(p.full_name || p.email || "Aluno sem nome")
    }));
  }

  c.innerHTML =
    `<h2>Notas e boletim</h2>
     <p class="muted">Selecione a conta correta do aluno antes de lançar uma nota.</p>` +
    (staff()
      ? form("Lançar nota", [
          {
            name: "student_id",
            label: "Aluno",
            type: "select",
            options: studentOptions
          },
          { name: "subject", label: "Disciplina" },
          {
            name: "grade",
            label: "Nota",
            type: "number",
            step: "0.01"
          },
          { name: "term", label: "Bimestre/período" }
        ])
      : "") +
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
