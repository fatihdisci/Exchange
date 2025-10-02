// Tamamen MANUEL kurla çalışır. İnternet ve canlı kur yok.
// Saklama: localStorage — { base:'EUR', rates:{EUR:1, TRY:x, MKD:y}, lastUpdated: ISO }

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const els = {
  // rates form
  ratesCard: $('#ratesCard'),
  saveRatesBtn: $('#saveRatesBtn'),
  cancelRatesBtn: $('#cancelRatesBtn'),
  eurTryInput: $('#eurTryInput'),
  eurMkdInput: $('#eurMkdInput'),
  ratesStatus: $('#ratesStatus'),
  editRatesBtn: $('#editRatesBtn'),
  resetRatesBtn: $('#resetRatesBtn'),

  // converter
  converterCard: $('#converterCard'),
  amount: $('#amount'),
  result: $('#result'),
  from: $('#from'),
  to: $('#to'),
  toHint: $('#toHint'),
  swap: $('#swap'),
  quickChips: $('#quickChips'),
  rateLine: $('#rateLine'),
  status: $('#statusLine'),

  // summary
  summaryCard: $('#summaryCard'),
  eurTry: $('#eurTry'),
  eurMkd: $('#eurMkd'),
  tryEur: $('#tryEur'),
  mkdEur: $('#mkdEur'),

  updated: $('#updated'),
};

const LS_KEY = 'manual-fx:eur-try-mkd:v1';

let store = {
  base: 'EUR',
  rates: { EUR: 1, TRY: null, MKD: null },
  lastUpdated: null
};

// ---------- Storage ----------
function save(){
  localStorage.setItem(LS_KEY, JSON.stringify(store));
  els.updated.textContent = new Date(store.lastUpdated).toLocaleString();
}
function load(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && s.rates?.TRY && s.rates?.MKD) {
      store = s;
      els.updated.textContent = s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : '—';
      return true;
    }
  }catch{}
  return false;
}
function clearAll(){
  localStorage.removeItem(LS_KEY);
  store = { base:'EUR', rates:{EUR:1, TRY:null, MKD:null}, lastUpdated:null };
}

// ---------- UI Helpers ----------
function showRatesCard(show){
  els.ratesCard.classList.toggle('hidden', !show);
}
function showConverter(show){
  els.converterCard.classList.toggle('hidden', !show);
  els.summaryCard.classList.toggle('hidden', !show);
}
function setRatesStatus(text, kind='ok'){
  els.ratesStatus.textContent = text || '';
  els.ratesStatus.className = `notes ${kind}`;
}
function setStatus(text, kind='ok'){
  els.status.textContent = text || '';
  els.status.className = `notes ${kind}`;
}
function reflectMKDMode(){
  const isMKD = els.from.value === 'MKD';
  els.to.disabled = isMKD;
  els.to.style.opacity = isMKD ? .6 : 1;
  els.toHint.textContent = isMKD ? ' (MKD seçiliyken iki sonuç verilir)' : '';
}
function isReady(){
  return typeof store.rates.TRY === 'number' && typeof store.rates.MKD === 'number';
}

// ---------- Math ----------
const fix = (n, p=4) => Number.parseFloat(n).toFixed(p);

function crossConvert(amount, from, to){
  const r = store.rates; // EUR=1 taban
  if (!r || r.TRY == null || r.MKD == null) return '';
  if (from === to) return fix(amount);
  if (from === 'EUR') return fix(amount * r[to]);
  if (to   === 'EUR') return fix(amount / r[from]);
  // cross
  return fix(amount * (r[to] / r[from]));
}

// ---------- Render ----------
function renderSummary(){
  const r = store.rates;
  els.eurTry.textContent = (r.TRY ?? 0).toFixed(4);
  els.eurMkd.textContent = (r.MKD ?? 0).toFixed(4);
  els.tryEur.textContent = (r.TRY ? (1/r.TRY).toFixed(6) : '—');
  els.mkdEur.textContent = (r.MKD ? (1/r.MKD).toFixed(6) : '—');
}
function recalc(){
  if (!isReady()){ els.result.value=''; els.rateLine.textContent=''; return; }
  const amount = parseFloat(els.amount.value || '0');
  const from = els.from.value;
  const to = els.to.value;

  if(!amount){ els.result.value=''; els.rateLine.textContent=''; return; }

  if(from === 'MKD'){
    const eurVal = crossConvert(amount, 'MKD', 'EUR');
    const tryVal = crossConvert(amount, 'MKD', 'TRY');
    els.result.value = `${eurVal} EUR | ${tryVal} TRY`;
    els.rateLine.textContent =
      `1 MKD = ${crossConvert(1,'MKD','EUR')} EUR | ${crossConvert(1,'MKD','TRY')} TRY`;
  } else {
    els.result.value = crossConvert(amount, from, to);
    els.rateLine.textContent =
      `${from}→${to}: 1 ${from} = ${crossConvert(1,from,to)} ${to}`;
  }
  renderSummary();
}

// ---------- Events ----------
function bind(){
  // rates form
  els.saveRatesBtn.addEventListener('click', () => {
    const tryVal = parseFloat(els.eurTryInput.value.replace(',','.'));
    const mkdVal = parseFloat(els.eurMkdInput.value.replace(',','.'));
    if (!Number.isFinite(tryVal) || tryVal <= 0){
      setRatesStatus('Lütfen 1 EUR kaç TRY değerini geçerli girin.', 'err'); return;
    }
    if (!Number.isFinite(mkdVal) || mkdVal <= 0){
      setRatesStatus('Lütfen 1 EUR kaç MKD değerini geçerli girin.', 'err'); return;
    }
    store.rates.TRY = tryVal;
    store.rates.MKD = mkdVal;
    store.lastUpdated = new Date().toISOString();
    save();
    setRatesStatus('Kurlar kaydedildi.', 'ok');
    showRatesCard(false);
    showConverter(true);
    setStatus('Manuel kurlarla çeviriyorsunuz.', 'ok');
    recalc();
  });

  els.cancelRatesBtn.addEventListener('click', () => {
    // Varsa önceki kayıtla devam
    if (isReady()){
      showRatesCard(false);
      showConverter(true);
      setStatus('Mevcut kurlarla devam ediliyor.', 'ok');
    } else {
      setRatesStatus('Kur girmeden devam edemezsiniz.', 'err');
    }
  });

  els.editRatesBtn.addEventListener('click', () => {
    // mevcut değerleri forma doldur
    els.eurTryInput.value = store.rates.TRY ?? '';
    els.eurMkdInput.value = store.rates.MKD ?? '';
    showRatesCard(true);
    showConverter(false);
    setRatesStatus('Kurları düzenleyin ve kaydedin.', 'ok');
  });

  els.resetRatesBtn.addEventListener('click', () => {
    if (confirm('Tüm kayıtlı kur bilgilerini silmek istiyor musunuz?')){
      clearAll();
      els.eurTryInput.value = '';
      els.eurMkdInput.value = '';
      els.updated.textContent = '—';
      showRatesCard(true);
      showConverter(false);
      setRatesStatus('Sıfırlandı. Yeni kurları girin ve kaydedin.', 'ok');
      setStatus('', 'ok');
    }
  });

  // converter
  ['input','change'].forEach(ev => {
    els.amount.addEventListener(ev, recalc);
    els.from.addEventListener(ev, () => { reflectMKDMode(); recalc(); });
    els.to.addEventListener(ev, recalc);
  });

  els.swap.addEventListener('click', () => {
    if (els.from.value === 'MKD'){
      // MKD modunda swap yerine EUR↔TRY arasında hızlı geçiş
      els.from.value = 'EUR';
      els.to.value = 'TRY';
    } else {
      const a = els.from.value;
      els.from.value = els.to.value;
      els.to.value = a;
    }
    reflectMKDMode();
    recalc();
  });

  // quick chips
  $$('#quickChips .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      const f = ch.dataset.from;
      const t = ch.dataset.to;
      els.from.value = f;
      if (t === 'EURTRY') {
        reflectMKDMode();
        recalc();
      } else {
        els.to.value = t;
        reflectMKDMode();
        recalc();
      }
    });
  });
}

// ---------- Init ----------
(function init(){
  bind();
  const has = load();
  if (has){
    // kayıt varsa çevirici açık
    showRatesCard(false);
    showConverter(true);
    setStatus('Manuel kurlarla çeviriyorsunuz.', 'ok');
    reflectMKDMode();
    renderSummary();
    recalc();
  } else {
    // ilk kurulum
    showRatesCard(true);
    showConverter(false);
    setRatesStatus('Başlamak için 1 EUR karşılıklarını girin ve kaydedin.', 'ok');
  }
})();
