// Basit ve dayanıklı kur yöneticisi (EUR • TRY • MKD)
const API = {
  latest: (base='EUR') => `https://api.exchangerate.host/latest?base=${base}&symbols=EUR,TRY,MKD`,
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const els = {
  amount: $('#amount'),
  result: $('#result'),
  from: $('#from'),
  to: $('#to'),
  toHint: $('#toHint'),
  swap: $('#swap'),
  refresh: $('#refreshBtn'),
  rateLine: $('#rateLine'),
  status: $('#statusLine'),
  updated: $('#updated'),
  eurTry: $('#eurTry'),
  eurMkd: $('#eurMkd'),
  tryEur: $('#tryEur'),
  mkdEur: $('#mkdEur'),
};

let state = {
  rates: null,     // { base, date, rates: {EUR,TRY,MKD} } — EUR tabanlı
  lastFetched: null
};

const LS_KEY = 'fx-rates:EUR-TRY-MKD:v1';

// ---------- Local cache ----------
function saveLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify({ state, savedAt: Date.now() }));
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { state: s } = JSON.parse(raw);
    return s;
  } catch { return null; }
}

// ---------- Fetch ----------
async function fetchRates(base='EUR', {silent=false}={}) {
  try {
    if (!silent) setStatus('Kurlar alınıyor…', 'ok');
    const res = await fetch(API.latest(base), { cache: 'no-store' });
    if (!res.ok) throw new Error('Ağ hatası');
    const data = await res.json();
    const need = ['EUR','TRY','MKD'];
    if (!data || !data.rates) throw new Error('Geçersiz yanıt');
    for (const k of need) if (typeof data.rates[k] !== 'number') throw new Error('Eksik kur');
    state.rates = { base: data.base, date: data.date, rates: data.rates };
    state.lastFetched = new Date().toISOString();
    saveLocal();
    setStatus('Kurlar güncellendi.', 'ok');
  } catch (e) {
    console.error(e);
    setStatus('Canlı kura ulaşılamadı, kayıtlı veriler kullanılacak.', 'err');
    if (!state.rates) state.rates = { base:'EUR', date:'', rates:{ EUR:1, TRY:0, MKD:0 } };
  } finally {
    updateUpdatedAt();
    recalc();
  }
}

// ---------- UI helpers ----------
function setStatus(text, cls='ok'){
  els.status.textContent = text;
  els.status.className = `notes ${cls}`;
}
function updateUpdatedAt(){
  els.updated.textContent = state.lastFetched ? new Date(state.lastFetched).toLocaleString() : '—';
}

// EUR tabanlı cross convert
function crossConvert(amount, from, to){
  const r = state.rates.rates; // EUR=1
  const fix = (n, p=4) => Number.parseFloat(n).toFixed(p);

  if (from === to) return fix(amount);

  if (from === 'EUR') return fix(amount * r[to]);
  if (to === 'EUR')   return fix(amount / r[from]);
  return fix(amount * (r[to] / r[from]));
}

// MKD modu için hedef alanını kilitle/aç
function reflectMKDMode() {
  const isMKD = els.from.value === 'MKD';
  els.to.disabled = isMKD;
  els.to.style.opacity = isMKD ? .6 : 1;
  els.toHint.textContent = isMKD ? ' (MKD seçiliyken iki sonuç verilir)' : '';
}

// ---------- Recalc ----------
function recalc(){
  const amount = parseFloat(els.amount.value || '0');
  const from = els.from.value;
  const to = els.to.value;
  if(!amount || !state?.rates?.rates?.EUR){ els.result.value = ''; return; }

  if(from === 'MKD'){
    const eurVal = crossConvert(amount, 'MKD', 'EUR');
    const tryVal = crossConvert(amount, 'MKD', 'TRY');
    els.result.value = `${eurVal} EUR | ${tryVal} TRY`;
    els.rateLine.textContent =
      `1 MKD = ${crossConvert(1,'MKD','EUR')} EUR | ${crossConvert(1,'MKD','TRY')} TRY`;
  } else {
    els.result.value = crossConvert(amount, from, to);
    els.rateLine.textContent =
      `${from}→${to} oranı: 1 ${from} = ${crossConvert(1, from, to)} ${to}`;
  }

  // Özet kutuları
  const r = state.rates.rates;
  els.eurTry.textContent = (r.TRY || 0).toFixed(4);
  els.eurMkd.textContent = (r.MKD || 0).toFixed(4);
  els.tryEur.textContent = (1/(r.TRY||1)).toFixed(6);
  els.mkdEur.textContent = (1/(r.MKD||1)).toFixed(6);
}

// ---------- Bind ----------
function bindUI(){
  ['input','change'].forEach(ev => {
    els.amount.addEventListener(ev, recalc);
    els.from.addEventListener(ev, () => { reflectMKDMode(); recalc(); });
    els.to.addEventListener(ev, recalc);
  });

  els.swap.addEventListener('click', () => {
    if (els.from.value === 'MKD') {
      // MKD modunda swap mantıklı değil; EUR↔TRY arasında değiştir.
      els.from.value = 'EUR';
      els.to.value = 'TRY';
      reflectMKDMode();
      recalc();
      return;
    }
    const a = els.from.value;
    els.from.value = els.to.value;
    els.to.value = a;
    reflectMKDMode();
    recalc();
  });

  els.refresh.addEventListener('click', () => fetchRates('EUR'));

  // Hızlı kısayollar
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

  // Ağ durumu bilgisi
  window.addEventListener('online', () => setStatus('Çevrimiçi. Güncelleyebilirsiniz.', 'ok'));
  window.addEventListener('offline', () => setStatus('Offline mod. Kayıtlı kur kullanılıyor.', 'err'));
}

// ---------- Init ----------
(async function init(){
  bindUI();
  reflectMKDMode();
  const cached = loadLocal();
  if (cached?.rates){
    state = cached;
    setStatus('Kayıtlı kur yüklendi.', 'ok');
    updateUpdatedAt();
    recalc();
  }
  // İlk açılışta canlı kur (sessiz)
  fetchRates('EUR', {silent: !!cached});
})();