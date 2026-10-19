import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// Configuração pública do projeto Firebase usada pelo sistema de gestão.
// A segurança real é controlada pelas regras do Firestore, não por esconder este arquivo.
const firebaseConfig = {
  apiKey: 'AIzaSyD6hbwYY4dP5o9d7ELJ7PP7IkPG4frMVCc',
  authDomain: 'sistema-de-gestao-38ba7.firebaseapp.com',
  projectId: 'sistema-de-gestao-38ba7',
  storageBucket: 'sistema-de-gestao-38ba7.firebasestorage.app',
  messagingSenderId: '974408210302',
  appId: '1:974408210302:web:db0f832af697a17ee2c52f'
};
const COMPANY_UID = 'ilbAQmxW1sVdSGmUrQB0UXMtF6v2';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const aliases = {
  coxinhas: new Set(['coxinha', 'mini coxinha', 'coxinhas']),
  risoles: new Set(['risole', 'risoles', 'mini risoles']),
  pastelzinhos: new Set(['pastelzinho', 'pastel', 'mini pastelzinho', 'mini pastel'])
};
function normalize(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
const statusEl = document.querySelector('#stock-status');
const counts = Object.fromEntries(Object.keys(aliases).map(key => [key, document.querySelector(`[data-stock="${key}"]`)]));
function showStatus(message, error = false) { statusEl.classList.toggle('error', error); statusEl.innerHTML = `<span class="status-dot"></span><span>${message}</span>`; }
async function loadStock() {
  const button = document.querySelector('#refresh-stock'); button.disabled = true; button.textContent = 'Carregando…';
  showStatus('Consultando estoque…');
  try {
    const snap = await getDocs(collection(db, 'empresas', COMPANY_UID, 'estoque'));
    const totals = { coxinhas: 0, risoles: 0, pastelzinhos: 0 };
    for (const item of snap.docs) {
      const data = item.data();
      const name = normalize(data.produtoNormalizado || data.produto);
      for (const [category, acceptedNames] of Object.entries(aliases)) {
        if (acceptedNames.has(name)) totals[category] += Number(data.quantidade) || 0;
      }
    }
    for (const [category, value] of Object.entries(totals)) counts[category].innerHTML = `${value.toLocaleString('pt-BR')} <small>unidades</small>`;
    const now = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    document.querySelector('#stock-updated').textContent = `Estoque consultado em ${now}.`;
    showStatus('Estoque atualizado');
  } catch (error) {
    console.error('Não foi possível consultar o estoque:', error);
    for (const element of Object.values(counts)) element.innerHTML = '— <small>indisponível</small>';
    showStatus('Não foi possível carregar o estoque. Verifique as regras públicas do Firestore.', true);
    document.querySelector('#stock-updated').textContent = 'Os números não foram carregados; nenhum valor foi inventado.';
  } finally { button.disabled = false; button.textContent = '↻ Atualizar estoque'; }
}
document.querySelector('#refresh-stock').addEventListener('click', loadStock);
const toggle = document.querySelector('.menu-toggle'); const nav = document.querySelector('.nav');
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? '×' : '☰'; });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.textContent='☰'; }));
document.querySelector('#year').textContent = new Date().getFullYear();
loadStock();
