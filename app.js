import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

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
const COMPANY_UID = 'W2OxRO5cnIgfhG6CS5BqlwPH0o13';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// A gestão salva produto/produtoNormalizado e quantidade em cada documento.
// A identificação usa palavras-chave para aceitar, por exemplo, 'Coxinha de frango'.
function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ');
}
const productRules = {
  coxinhas: name => name.includes('coxinh'),
  risoles: name => name.includes('risol'),
  pastelzinhos: name => name.includes('pastel') || name.includes('pastei')
};
const statusEl = document.querySelector('#stock-status');
const counts = Object.fromEntries(Object.keys(productRules).map(key => [key, document.querySelector(`[data-stock="${key}"]`)]));
function showStatus(message, error = false) {
  statusEl.classList.toggle('error', error);
  statusEl.innerHTML = `<span class="status-dot"></span><span>${message}</span>`;
}
function readQuantity(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
async function loadStock() {
  const button = document.querySelector('#refresh-stock');
  button.disabled = true;
  button.textContent = 'Carregando…';
  showStatus('Consultando estoque…');
  try {
    const stockRef = collection(db, 'empresas', COMPANY_UID, 'estoque');
    const snap = await getDocs(stockRef);
    const totals = { coxinhas: 0, risoles: 0, pastelzinhos: 0 };
    const matches = { coxinhas: 0, risoles: 0, pastelzinhos: 0 };
    const foundProducts = [];

    for (const item of snap.docs) {
      const data = item.data();
      const name = normalize(data.produtoNormalizado || data.produto || data.nome);
      if (name) foundProducts.push(name);
      for (const [category, matchesName] of Object.entries(productRules)) {
        if (matchesName(name)) {
          totals[category] += readQuantity(data.quantidade);
          matches[category] += 1;
        }
      }
    }

    // Useful diagnostics when the new company's product names differ from expectations.
    console.info('[Culto Salgados] Documentos encontrados no estoque:', snap.size);
    console.info('[Culto Salgados] Produtos lidos:', foundProducts);
    console.info('[Culto Salgados] Documentos correspondentes por categoria:', matches);

    for (const [category, value] of Object.entries(totals)) {
      counts[category].innerHTML = `${value.toLocaleString('pt-BR')} <small>unidades</small>`;
    }
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.querySelector('#stock-updated').textContent = `Estoque consultado em ${now}.`;
    const matchedCount = Object.values(matches).reduce((sum, count) => sum + count, 0);
    if (snap.empty) {
      showStatus('Conexão realizada, mas não há produtos na coleção de estoque desta empresa.', true);
      document.querySelector('#stock-updated').textContent = 'O Firebase respondeu, mas a coleção consultada está vazia.';
    } else if (matchedCount === 0) {
      showStatus('Estoque encontrado, mas os nomes dos produtos não foram reconhecidos.', true);
      document.querySelector('#stock-updated').textContent = 'Confira os nomes dos produtos no console do navegador (F12 → Console).';
    } else {
      showStatus('Estoque atualizado');
    }
  } catch (error) {
    console.error('[Culto Salgados] Erro ao consultar o estoque:', error);
    for (const element of Object.values(counts)) element.innerHTML = '— <small>indisponível</small>';
    showStatus('Não foi possível consultar o estoque. Confira o erro no console do navegador (F12).', true);
    document.querySelector('#stock-updated').textContent = 'A consulta falhou; nenhum valor foi inventado.';
  } finally {
    button.disabled = false;
    button.textContent = '↻ Atualizar estoque';
  }
}
document.querySelector('#refresh-stock').addEventListener('click', loadStock);
const toggle = document.querySelector('.menu-toggle'); const nav = document.querySelector('.nav');
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? '×' : '☰'; });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.textContent='☰'; }));
document.querySelector('#year').textContent = new Date().getFullYear();

// Projeto Firebase separado, usado exclusivamente para os pedidos do cardápio.
const ordersFirebaseConfig = {
  apiKey: 'AIzaSyC2k7-V4sx0Cf8Xg0nv_2ixq0kMChy1EBA',
  authDomain: 'cardapio-7bca4.firebaseapp.com',
  projectId: 'cardapio-7bca4',
  storageBucket: 'cardapio-7bca4.firebasestorage.app',
  messagingSenderId: '1007527463516',
  appId: '1:1007527463516:web:fbaa69337520f081017499'
};
const ordersApp = initializeApp(ordersFirebaseConfig, 'culto-orders');
const ordersDb = getFirestore(ordersApp);
const cupPrices = { minibig: 900, big: 1000, bigbig: 1300 };
const cupLabels = { minibig: 'MiniBig', big: 'Big', bigbig: 'BigBig' };
const cupQuantities = { minibig: 0, big: 0, bigbig: 0 };
const brl = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function updateOrderTotal() {
  let cups = 0, cents = 0;
  for (const key of Object.keys(cupQuantities)) {
    document.querySelector(`#qty-${key}`).textContent = cupQuantities[key];
    cups += cupQuantities[key]; cents += cupQuantities[key] * cupPrices[key];
  }
  document.querySelector('#total-cups').textContent = `${cups} ${cups === 1 ? 'copo' : 'copos'}`;
  document.querySelector('#order-total-price').textContent = brl(cents);
  return { cups, cents };
}
document.querySelectorAll('[data-change]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.change;
  cupQuantities[key] = Math.max(0, cupQuantities[key] + Number(button.dataset.delta));
  updateOrderTotal();
}));
document.querySelector('#order-form').addEventListener('submit', async event => {
  event.preventDefault();
  const feedback = document.querySelector('#order-feedback');
  const submit = document.querySelector('#submit-order');
  const name = document.querySelector('#customer-name').value.trim();
  const notes = document.querySelector('#order-notes').value.trim();
  const total = updateOrderTotal();
  if (!name) { feedback.textContent = 'Informe seu nome para continuar.'; feedback.className = 'order-feedback error'; return; }
  if (total.cups < 1) { feedback.textContent = 'Escolha pelo menos um copo antes de enviar.'; feedback.className = 'order-feedback error'; return; }
  const items = Object.keys(cupQuantities).filter(key => cupQuantities[key] > 0).map(key => ({ size: cupLabels[key], quantity: cupQuantities[key], unitPriceCents: cupPrices[key], subtotalCents: cupPrices[key] * cupQuantities[key] }));
  submit.disabled = true; submit.textContent = 'Enviando pedido…';
  feedback.textContent = 'Salvando seu pedido…'; feedback.className = 'order-feedback';
  try {
    const doc = await addDoc(collection(ordersDb, 'pedidos'), {
      customerName: name, notes, items, totalCups: total.cups, totalCents: total.cents,
      status: 'pendente', createdAt: serverTimestamp()
    });
    feedback.textContent = `Pedido enviado com sucesso! Número do pedido: ${doc.id.slice(-6).toUpperCase()}. O pagamento será feito na retirada.`;
    feedback.className = 'order-feedback success';
    document.querySelector('#order-form').reset();
    Object.keys(cupQuantities).forEach(key => cupQuantities[key] = 0);
    updateOrderTotal();
  } catch (error) {
    console.error('[Culto Salgados] Erro ao salvar pedido:', error);
    feedback.textContent = 'Não foi possível enviar o pedido. Confira a conexão e as regras do Firestore.';
    feedback.className = 'order-feedback error';
  } finally {
    submit.disabled = false; submit.innerHTML = 'Enviar pedido <span>→</span>';
  }
});
updateOrderTotal();

loadStock();
