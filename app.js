// Manuel kur: 1 EUR = ? TRY ve 1 MKD = ? TRY girilir.
// Uygulama 1 EUR = ? MKD'yi (TRY oranlarından) otomatik hesaplar.

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const els = {
  // rates form
  ratesCard: $('#ratesCard'),
  saveRatesBtn: $('#saveRatesBtn'),
  eurTryInput: $('#eurTryInput'),
  mkdTryInput: $('#mkdTryInput'),
  eurMkdPreview: $('#eurMkdPreview'),
  ratesStatus: $('#ratesStatus'),
  editRatesBtn: $('#editRatesBtn'),
  resetRatesBtn: $('#resetRatesBtn'),

  // converter
  converterCard: $('#converterCard'),
  amount: $('#amount'),
  from: $('#from'),
  swap: $('#swap'),
  rateLine: $('#rateLine'),
  status: $('#statusLine'),
  resultMain: $('#resultMain'),
  resultSub: $('#resultSub'),
  quickChips: $('#quickChips'),

  // summary
  summaryCard: $('#summaryCard'),
  s_eur_try: $('#s_eur_try'),
  s_eur_mkd: $('#s_eur_mkd'),
  s_try_eur: $('#s_try_eur'),
  s_mkd_try: $('#s_mkd_try'),

  updated: $('#updated'),
};

const LS_KEY = 'manual-fx:eur-try-mkd:v3';

let store = {
  base: 'EUR',
  rates: { EUR: 1, TRY: null, MKD: null }, // EUR taban
  mkdTry: null, // 1 MKD = ? TRY
  lastUpdated: null
};

// ---------- Utils ----------
const fix = (n, p=4) => Number.parseFloat(n).toFixed(p);
const okNum = v => Number.isFinite(v) && v > 0;
const norm = v => parseFloat(String(v).replace(',', '.')); // virgül desteği

// ---------- Storage ----------
function save(){
  localStorage.setItem(LS_KEY, JSON.stringify(store));
  els.updated.textContent = new Date(store.lastUpdated).toLocaleString();
}
function load(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s?.rates?.TRY && s?.rates?.MKD && s?.mkdTry){
      store = s;
      els.updated.textContent = s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : '—';
      return true;
    }
  }catch(e){
    console.error('load error', e);
  }
  return false;
}
function clearAll(){
  localStorage.removeItem(LS_KEY);
  store = { base:'EUR', rates:{EUR:1, TRY:null, MKD:null}, mkdTry:null, lastUpdated:null };
}

// ---------- Math ----------
function crossConvert(amount, from, to){
  const r = store.rates; // EUR=1 taban
  if (!okNum(r.TRY) || !okNum(r.MKD)) return '';
  if (from === to) return fix(amount);
  if (from === 'EUR') return fix(amount * r[to]);
  if (to   === 'EUR') return fix(amount / r[from]);
  return fix(amount * (r[to] / r[from]));
}

// ---------- UI helpers ----------
function showRatesCard(show){ els.ratesCard.classList.toggle('hidden', !show); }
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
function isReady(){ return okNum(store.rates.TRY) && okNum(store.rates.MKD) && okNum(store.mkdTry); }

// Küçük özetler
function renderSummary(){
  const r = store.rates;
  if (!isReady()){
    els.s_eur_try.textContent = '—';
    els.s_eur_mkd.textContent = '—';
    els.s_try_eur.textContent = '—';
    els.s_mkd_try.textContent = '—';
    return;
  }
  els.s_eur_try.textContent = fix(r.TRY, 4);
  els.s_eur_mkd.textContent = fix(r.MKD, 4);
  els.s_try_eur.textContent = (1/r.TRY).toFixed(6);
  els.s_mkd_try.textContent = fix(store.mkdTry, 4);
}

// Büyük sonuç alanı
function renderResult(){
  if (!isReady()){ els.resultMain.textContent = '—'; els.resultSub.textContent=''; els.rateLine.textContent=''; return; }
  const amt = norm(els.amount.value || '0');
  if (!okNum(amt)){ els.resultMain.textContent = '—'; els.resultSub.textContent=''; els.rateLine.textContent=''; return; }

  const from = els.from.value;
  if (from === 'MKD'){
    const eurVal = crossConvert(amt, 'MKD', 'EUR');
    const tryVal = crossConvert(amt, 'MKD', 'TRY');
    els.resultMain.textContent = `${eurVal} EUR`;
    els.resultSub.textContent  = `• ${tryVal} TRY`;
    els.rateLine.textContent   = `1 MKD = ${crossConvert(1,'MKD','EUR')} EUR • ${crossConvert(1,'MKD','TRY')} TRY`;
  } else if (from === 'EUR'){
    const tryVal = crossConvert(amt, 'EUR', 'TRY');
    const mkdVal = crossConvert(amt, 'EUR', 'MKD');
    els.resultMain.textContent = `${tryVal} TRY`;
    els.resultSub.textContent  = `• ${mkdVal} MKD`;
    els.rateLine.textContent   = `1 EUR = ${crossConvert(1,'EUR','TRY')} TRY • ${crossConvert(1,'EUR','MKD')} MKD`;
  } else { // TRY
    const eurVal = crossConvert(amt, 'TRY', 'EUR');
    const mkdVal = crossConvert(amt, 'TRY', 'MKD');
    els.resultMain.textContent = `${eurVal} EUR`;
    els.resultSub.textContent  = `• ${mkdVal} MKD`;
    els.rateLine.textContent   = `1 TRY = ${crossConvert(1,'TRY','EUR')} EUR • ${crossConvert(1,'TRY','MKD')} MKD`;
  }
}

// Kur ayarı önizlemesi (1 EUR = ? MKD)
function updatePreview(){
  const eurTry = norm(els.eurTryInput.value);
  const mkdTry = norm(els.mkdTryInput.value);
  if (okNum(eurTry) && okNum(mkdTry)){
    const eurMkd = eurTry / mkdTry;
    els.eurMkdPreview.value = isFinite(eurMkd) ? fix(eurMkd,4) : '';
  } else {
    els.eurMkdPreview.value = '';
  }
}

// ---------- Events ----------
function bind(){
  // Kur alanları
  els.eurTryInput.addEventListener('input', updatePreview, {passive:true});
  els.mkdTryInput.addEventListener('input', updatePreview, {passive:true});

  // Enter ile kaydet
  [els.eurTryInput, els.mkdTryInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        els.saveRatesBtn.click();
      }
    });
  });

  // Kaydet butonu
  els.saveRatesBtn.addEventListener('click', () => {
    try{
      const eurTry = norm(els.eurTryInput.value);
      const mkdTry = norm(els.mkdTryInput.value);
      if (!okNum(eurTry)) return setRatesStatus('Lütfen 1 EUR kaç TRY değerini geçerli girin.', 'err');
      if (!okNum(mkdTry)) return setRatesStatus('Lütfen 1 MKD kaç TRY değerini geçerli girin.', 'err');

      const eurMkd = eurTry / mkdTry; // tutarlı oran

      store.rates.TRY = eurTry;      // 1 EUR = eurTry TRY
      store.rates.MKD = eurMkd;      // 1 EUR = eurMkd MKD
      store.mkdTry    = mkdTry;      // 1 MKD = mkdTry TRY
      store.lastUpdated = new Date().toISOString();

      save();
      setRatesStatus('Kurlar kaydedildi.', 'ok');
      showRatesCard(false);
      showConverter(true);
      setStatus('Manuel kurlarla çeviriyorsunuz.', 'ok');
      renderSummary();
      renderResult();
    }catch(err){
      console.error('save error', err);
      setRatesStatus('Kayıt sırasında beklenmeyen hata.', 'err');
    }
  });

  // Düzenle/Sıfırla
  els.editRatesBtn.addEventListener('click', () => {
    els.eurTryInput.value = store.rates.TRY ?? '';
    els.mkdTryInput.value = store.mkdTry ?? '';
    updatePreview();
    showRatesCard(true);
    showConverter(false);
    setRatesStatus('Kurları düzenleyin ve kaydedin.', 'ok');
  });

  els.resetRatesBtn.addEventListener('click', () => {
    if (confirm('Tüm kayıtlı kur bilgilerini silmek istiyor musunuz?')){
      clearAll();
      els.eurTryInput.value = '';
      els.mkdTryInput.value = '';
      els.eurMkdPreview.value = '';
      els.updated.textContent = '—';
      showRatesCard(true);
      showConverter(false);
      setRatesStatus('Sıfırlandı. Yeni kurları girin ve kaydedin.', 'ok');
      setStatus('', 'ok');
    }
  });

  // Çevirici
  ['input','change'].forEach(ev => {
    els.amount.addEventListener(ev, renderResult);
    els.from.addEventListener(ev, renderResult);
  });

  // Hızlı döngü: EUR -> TRY -> MKD -> EUR
  els.swap.addEventListener('click', () => {
    const order = ['EUR','TRY','MKD'];
    const idx = order.indexOf(els.from.value);
    els.from.value = order[(idx+1)%order.length];
    renderResult();
  });

  // Kısayol çipleri
  $$('#quickChips .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      els.from.value = ch.dataset.from;
      renderResult();
    });
  });
}

// ---------- Init ----------
(function init(){
  bind();
  if (load()){
    showRatesCard(false);
    showConverter(true);
    setStatus('Manuel kurlarla çeviriyorsunuz.', 'ok');
    renderSummary();
    renderResult();
  } else {
    showRatesCard(true);
    showConverter(false);
    setRatesStatus('Başlamak için 1 EUR = ? TRY ve 1 MKD = ? TRY girin; otomatik oran hesaplanır.', 'ok');
  }
})();
