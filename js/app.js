import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

/* Configuração web do projeto Firebase fornecida pelo usuário.
   A apiKey do Firebase Web identifica o projeto; as regras e a autenticação protegem os dados. */
const firebaseConfig = {
  apiKey: "AIzaSyBQR2-8CNeraOb4kG4zaFptco008bawFwg",
  authDomain: "biblioteca-cepk.firebaseapp.com",
  projectId: "biblioteca-cepk",
  storageBucket: "biblioteca-cepk.firebasestorage.app",
  messagingSenderId: "460276146091",
  appId: "1:460276146091:web:2d686709f7dac2cfd8bcee"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// E-mail fixo da conta administrativa criada em Firebase Authentication.
// Substitua pelo e-mail real dessa conta; a tela continuará mostrando apenas a senha.
const ADMIN_EMAIL = "raniel.nazarko@escola.pr.gov.br";

const $ = (id) => document.getElementById(id);
const state = { books: [], loans: [], currentUser: null, editingId: null };
const palette = ["#315e85", "#7b4b63", "#3f6b5b", "#a66c3b", "#4b5487", "#8a5550"];

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  window.setTimeout(() => $("toast").classList.add("hidden"), 3200);
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function setView(view) {
  ["homeView","catalogView","adminView"].forEach(id => $(id).classList.toggle("hidden", id !== view));
  window.scrollTo({top:0, behavior:"smooth"});
}
function toDateInput(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0,10);
}
function addDays(dateString, days) {
  const d = new Date(`${dateString}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}
function formatDate(dateString) {
  if (!dateString) return "—";
  const [y,m,d] = dateString.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString("pt-BR");
}
function availableCopies(book) {
  const borrowed = state.loans.filter(l => l.bookId === book.id && l.status === "active").length;
  return Math.max(0, Number(book.copies || 1) - borrowed);
}
function normalizeBook(docSnap) {
  const d = docSnap.data();
  return { id:docSnap.id, title:d.title || "", author:d.author || "", genre:d.genre || "Não informado",
    publisher:d.publisher || "", year:d.year || "", pages:d.pages || "", language:d.language || "",
    isbn:d.isbn || "", classification:d.classification || "", edition:d.edition || "", collection:d.collection || "",
    copies:Math.max(1,Number(d.copies || 1)), coverUrl:d.coverUrl || "", synopsis:d.synopsis || "",
    observations:d.observations || "", archived:!!d.archived };
}
async function loadBooks() {
  try {
    const snap = await getDocs(query(collection(db,"books"), where("archived","==",false)));
    state.books = snap.docs.map(normalizeBook);
    $("catalogMessage").classList.add("hidden");
  } catch (error) {
    console.error(error);
    state.books = [];
    $("catalogMessage").textContent = "Não foi possível carregar o acervo. Confira se o Firestore está criado e se as regras permitem a leitura pública da coleção books.";
    $("catalogMessage").classList.remove("hidden");
  }
  renderCatalog();
}
async function loadLoans() {
  if (!state.currentUser) { state.loans = []; return; }
  try {
    const snap = await getDocs(query(collection(db,"loans"), orderBy("loanDate","desc")));
    state.loans = snap.docs.map(s => ({id:s.id,...s.data()}));
  } catch (error) {
    console.error(error);
    showToast("Não foi possível carregar os empréstimos. Verifique as regras do Firestore.");
    state.loans = [];
  }
}
function renderCatalog() {
  const search = $("searchInput").value.trim().toLocaleLowerCase("pt-BR");
  const genre = $("genreFilter").value;
  const availability = $("availabilityFilter").value;
  const genres = [...new Set(state.books.map(b=>b.genre).filter(g=>g && g!=="Não informado"))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const currentGenre = $("genreFilter").value;
  $("genreFilter").innerHTML = '<option value="">Todos os gêneros</option>' + genres.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
  if (genres.includes(currentGenre)) $("genreFilter").value = currentGenre;
  const filtered = state.books.filter(b => {
    const text = [b.title,b.author,b.genre,b.publisher,b.isbn].join(" ").toLocaleLowerCase("pt-BR");
    const avail = availableCopies(b)>0;
    return text.includes(search) && (!genre || b.genre===genre) && (!availability || (availability==="available" ? avail : !avail));
  });
  $("bookCount").textContent = `${filtered.length} ${filtered.length===1?"livro":"livros"}`;
  $("bookGrid").innerHTML = filtered.map((b,i)=> {
    const avail = availableCopies(b);
    const cover = b.coverUrl ? `<img src="${escapeHtml(b.coverUrl)}" alt="Capa de ${escapeHtml(b.title)}" loading="lazy" onerror="this.remove()">` : "";
    return `<article class="book-card" tabindex="0" role="button" data-book="${b.id}" aria-label="Ver detalhes de ${escapeHtml(b.title)}">
      <div class="cover">${cover}<div class="cover-placeholder ${b.coverUrl?"hidden":""}" style="--cover:${palette[i%palette.length]}">${escapeHtml(b.title)}</div></div>
      <div class="book-info"><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.author)}</p><div class="pills"><span class="pill">${escapeHtml(b.genre)}</span><span class="pill ${avail?"available":"unavailable"}">${avail?`${avail} disponível(is)`:"Indisponível"}</span></div></div>
    </article>`;
  }).join("");
  $("emptyState").classList.toggle("hidden", filtered.length>0);
  $("bookGrid").querySelectorAll("[data-book]").forEach(el=>{
    const open = () => showBook(el.dataset.book);
    el.addEventListener("click",open);
    el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
  });
}
function showBook(id) {
  const b = state.books.find(x=>x.id===id);
  if (!b) return;
  const avail = availableCopies(b);
  const cover = b.coverUrl ? `<img src="${escapeHtml(b.coverUrl)}" alt="Capa de ${escapeHtml(b.title)}">` : `<div class="cover-placeholder" style="--cover:${palette[0]}">${escapeHtml(b.title)}</div>`;
  const fields = [["Gênero",b.genre],["Editora",b.publisher],["Ano",b.year],["Páginas",b.pages],["Idioma",b.language],["ISBN",b.isbn],["Classificação",b.classification],["Edição",b.edition],["Coleção",b.collection],["Exemplares",b.copies],["Disponíveis",avail]];
  $("bookDetail").innerHTML = `<div class="detail-layout"><div class="detail-cover">${cover}</div><div class="detail-content"><span class="eyebrow">DETALHES DO ACERVO</span><h2>${escapeHtml(b.title)}</h2><p class="author">por ${escapeHtml(b.author)}</p><div class="pills"><span class="pill ${avail?"available":"unavailable"}">${avail?"Disponível para empréstimo":"Sem exemplares disponíveis"}</span></div><dl>${fields.filter(x=>x[1]!=="" && x[1]!==null).map(x=>`<div><dt>${x[0]}</dt><dd>${escapeHtml(x[1])}</dd></div>`).join("")}</dl><h4>Sinopse</h4><p class="synopsis">${escapeHtml(b.synopsis||"Sinopse não informada.")}</p>${b.observations?`<h4>Observações</h4><p class="synopsis">${escapeHtml(b.observations)}</p>`:""}</div></div>`;
  $("bookDialog").showModal();
}
function resetBookForm() {
  $("bookForm").reset(); $("editBookId").value=""; $("language").value="Português"; $("copies").value="1";
  $("bookFormTitle").textContent="Cadastrar livro"; $("saveBookBtn").textContent="Salvar livro";
  $("cancelEditBtn").classList.add("hidden"); state.editingId=null;
}
function fillBookForm(b) {
  const keys=["title","author","genre","publisher","year","pages","language","isbn","classification","edition","collection","copies","coverUrl","synopsis","observations"];
  keys.forEach(k=>$(k).value=b[k]??"");
  $("editBookId").value=b.id; $("bookFormTitle").textContent="Editar livro"; $("saveBookBtn").textContent="Salvar alterações";
  $("cancelEditBtn").classList.remove("hidden"); state.editingId=b.id;
  $("booksTab").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderAdminBooks() {
  $("adminBooksRows").innerHTML = state.books.map(b=>`<tr><td><strong>${escapeHtml(b.title)}</strong><br><span class="muted">${escapeHtml(b.author)}</span></td><td>${b.copies}</td><td>${availableCopies(b)}</td><td><button class="secondary" data-edit="${b.id}">Editar</button><button class="secondary" data-archive="${b.id}">Arquivar</button></td></tr>`).join("") || '<tr><td colspan="4">Nenhum livro cadastrado.</td></tr>';
  $("adminBooksRows").querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>{const b=state.books.find(x=>x.id===btn.dataset.edit);if(b)fillBookForm(b);}));
  $("adminBooksRows").querySelectorAll("[data-archive]").forEach(btn=>btn.addEventListener("click",()=>archiveBook(btn.dataset.archive)));
  $("loanBook").innerHTML = '<option value="">Selecione um livro</option>'+state.books.filter(b=>availableCopies(b)>0).map(b=>`<option value="${b.id}">${escapeHtml(b.title)} — ${availableCopies(b)} disponível(is)</option>`).join("");
}
async function archiveBook(id) {
  const b=state.books.find(x=>x.id===id);
  if(!b||!confirm(`Arquivar "${b.title}"? Ele deixará de aparecer no catálogo público.`))return;
  try {
    await updateDoc(doc(db,"books",id),{archived:true,updatedAt:serverTimestamp()});
    showToast("Livro arquivado."); await refreshAdminData();
  } catch(e) { console.error(e); showToast("Não foi possível arquivar. Verifique as regras do Firestore."); }
}
async function refreshAdminData() {
  await loadBooks(); await loadLoans(); renderCatalog(); renderAdminBooks(); renderLoans();
}
async function renderLoans() {
  $("loansRows").innerHTML = state.loans.map(l=>{
    const b=state.books.find(x=>x.id===l.bookId);
    const late=l.status==="active" && l.dueDate < toDateInput();
    const status=l.status==="returned"?"Devolvido":late?"Atrasado":"Em andamento";
    return `<tr><td>${escapeHtml(l.bookTitle||b?.title||"Livro arquivado")}</td><td>${escapeHtml(l.borrower||"")}</td><td>${formatDate(l.loanDate)}</td><td>${formatDate(l.dueDate)}</td><td><span class="status ${late?"late":""}">${status}</span></td><td>${l.status==="active"?`<button class="secondary" data-return="${l.id}">Devolver</button><button class="secondary" data-renew="${l.id}">Renovar +7 dias</button>`:"—"}</td></tr>`;
  }).join("") || '<tr><td colspan="6">Nenhum empréstimo registrado.</td></tr>';
  $("loansRows").querySelectorAll("[data-return]").forEach(btn=>btn.addEventListener("click",()=>returnLoan(btn.dataset.return)));
  $("loansRows").querySelectorAll("[data-renew]").forEach(btn=>btn.addEventListener("click",()=>renewLoan(btn.dataset.renew)));
}
async function saveBook(e) {
  e.preventDefault();
  const id=$("editBookId").value;
  const book={title:$("title").value.trim(),author:$("author").value.trim(),genre:$("genre").value.trim()||"Não informado",
    publisher:$("publisher").value.trim(),year:$("year").value?Number($("year").value):"",pages:$("pages").value?Number($("pages").value):"",
    language:$("language").value.trim(),isbn:$("isbn").value.trim(),classification:$("classification").value.trim(),
    edition:$("edition").value.trim(),collection:$("collection").value.trim(),copies:Math.max(1,Number($("copies").value)||1),
    coverUrl:$("coverUrl").value.trim(),synopsis:$("synopsis").value.trim(),observations:$("observations").value.trim(),archived:false,updatedAt:serverTimestamp()};
  $("saveBookBtn").disabled=true;
  try {
    if(id) await updateDoc(doc(db,"books",id),book);
    else await addDoc(collection(db,"books"),{...book,createdAt:serverTimestamp()});
    $("bookFormMessage").textContent="Salvo com sucesso."; resetBookForm(); await refreshAdminData(); showToast("Livro salvo no Firebase.");
  } catch(error) { console.error(error); $("bookFormMessage").textContent="Falha ao salvar. Confira a conexão e as regras do Firestore."; }
  finally { $("saveBookBtn").disabled=false; }
}
async function createLoan(e) {
  e.preventDefault();
  const book=state.books.find(b=>b.id===$("loanBook").value);
  const loanDate=$("loanDate").value;
  if(!book||availableCopies(book)<1){$("loanMessage").textContent="Livro sem exemplar disponível.";return;}
  const loan={bookId:book.id,bookTitle:book.title,borrower:$("borrower").value.trim(),borrowerId:$("borrowerId").value.trim(),
    loanDate,dueDate:addDays(loanDate,7),status:"active",createdAt:serverTimestamp(),createdBy:state.currentUser.uid};
  try {await addDoc(collection(db,"loans"),loan);$("loanForm").reset();$("loanDate").value=toDateInput();$("loanMessage").textContent="Empréstimo registrado.";await refreshAdminData();showToast("Empréstimo registrado por 7 dias.");}
  catch(error){console.error(error);$("loanMessage").textContent="Não foi possível registrar. Confira as regras do Firestore.";}
}
async function returnLoan(id) {
  if(!confirm("Confirmar a devolução deste livro?"))return;
  try {await updateDoc(doc(db,"loans",id),{status:"returned",returnedAt:serverTimestamp(),returnedDate:toDateInput()});await refreshAdminData();showToast("Devolução registrada.");}
  catch(e){console.error(e);showToast("Não foi possível registrar a devolução.");}
}
async function renewLoan(id) {
  const loan=state.loans.find(l=>l.id===id); if(!loan||loan.status!=="active")return;
  const base=loan.dueDate>toDateInput()?loan.dueDate:toDateInput();
  try {await updateDoc(doc(db,"loans",id),{dueDate:addDays(base,7),renewals:Number(loan.renewals||0)+1,updatedAt:serverTimestamp()});await refreshAdminData();showToast("Prazo renovado por mais 7 dias.");}
  catch(e){console.error(e);showToast("Não foi possível renovar o empréstimo.");}
}
function setupEvents() {
  $("homeLink").addEventListener("click",e=>{e.preventDefault();setView("homeView");});
  $("catalogNav").addEventListener("click",()=>{setView("catalogView");});
  $("browseBtn").addEventListener("click",()=>{setView("catalogView");});
  $("adminNav").addEventListener("click",()=>{setView("adminView");});
  $("heroAdminBtn").addEventListener("click",()=>{setView("adminView");});
  $("searchInput").addEventListener("input",renderCatalog);
  $("genreFilter").addEventListener("change",renderCatalog);
  $("availabilityFilter").addEventListener("change",renderCatalog);
  $("closeDialog").addEventListener("click",()=>$("bookDialog").close());
  $("bookDialog").addEventListener("click",e=>{if(e.target===$("bookDialog"))$("bookDialog").close();});
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault(); $("loginError").classList.add("hidden");
    if(ADMIN_EMAIL === "COLOQUE_O_EMAIL_DO_RESPONSAVEL_AQUI") {
      $("loginError").textContent="Antes de usar, configure ADMIN_EMAIL no arquivo js/app.js com o e-mail da conta administrativa do Firebase.";
      $("loginError").classList.remove("hidden");
      return;
    }
    try {await signInWithEmailAndPassword(auth,ADMIN_EMAIL,$("adminPassword").value);$("adminPassword").value="";}
    catch(error){console.error(error);$("loginError").textContent="Não foi possível entrar. Confira o e-mail/senha e se a conta existe no Firebase Authentication."; $("loginError").classList.remove("hidden");}
  });
  $("logoutBtn").addEventListener("click",()=>signOut(auth));
  $("bookForm").addEventListener("submit",saveBook);
  $("cancelEditBtn").addEventListener("click",resetBookForm);
  $("loanForm").addEventListener("submit",createLoan);
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===btn));
    $("booksTab").classList.toggle("hidden",btn.dataset.tab!=="books");
    $("loansTab").classList.toggle("hidden",btn.dataset.tab!=="loans");
  }));
  $("loanDate").value=toDateInput();
}
onAuthStateChanged(auth,async user=>{
  state.currentUser=user;
  $("loginCard").classList.toggle("hidden",!!user);
  $("adminPanel").classList.toggle("hidden",!user);
  if(user){$("adminStatus").textContent=`Sessão autenticada: ${user.email||"responsável"}`;await refreshAdminData();}
  else {state.loans=[];renderLoans();}
});
setupEvents();
loadBooks();
