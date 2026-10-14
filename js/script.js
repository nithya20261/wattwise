const $ = (id) => document.getElementById(id);
const currency = (value, decimals = 0) => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', minimumFractionDigits:decimals, maximumFractionDigits:decimals}).format(Number.isFinite(value) ? value : 0);
const number = (value, decimals = 2) => new Intl.NumberFormat('en-IN', {minimumFractionDigits:decimals, maximumFractionDigits:decimals}).format(Number.isFinite(value) ? value : 0);
const STORAGE = {history:'wattwise_history_v1', theme:'wattwise_theme_v1'};
const SUPABASE_CONFIG = window.WATTWISE_SUPABASE_CONFIG || {};
let appliances = [];
let nextApplianceId = 1;
let toastInstance = null;
let supabaseClient = null;

function storageGet(key){
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value){
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function storageRemove(key){
  try { localStorage.removeItem(key); } catch {}
}

function showToast(message){
  $('toastMessage').textContent = message;
  if (window.bootstrap && $('appToast')) {
    toastInstance = toastInstance || new bootstrap.Toast($('appToast'), {delay:2600});
    toastInstance.show();
  }
}
function getBillInputs(){
  return {
    units: Math.max(0, Number($('unitsInput').value) || 0),
    rate: Math.max(0, Number($('rateInput').value) || 0),
    fixed: Math.max(0, Number($('fixedInput').value) || 0),
    days: Math.max(1, Number($('daysInput').value) || 30)
  };
}
function calculateBill(){
  const {units, rate, fixed, days} = getBillInputs();
  const energy = units * rate;
  const total = energy + fixed;
  const daily = units / days;
  const sliderMax = Math.min(Number($('unitsInput').max), Math.max(800, Math.ceil(units / 100) * 100));
  const reduction = Number($('reductionRange').value) || 0;
  const savings = energy * reduction / 100;
  const newBill = total - savings;
  $('unitsRange').max = sliderMax;
  $('unitsRangeMaxLabel').textContent = `${number(sliderMax, 0)} units`;
  $('unitsRange').value = units;
  $('billMetric').textContent = currency(total);
  $('unitsMetric').textContent = number(units, units % 1 ? 1 : 0);
  $('dailyMetric').textContent = number(daily, 1);
  $('savingsMetric').textContent = currency(energy * .15);
  $('totalBill').textContent = currency(total, 2);
  $('billBreakdown').textContent = `${number(units, units % 1 ? 1 : 0)} units × ${currency(rate, 2)} + ${currency(fixed)} fixed charge`;
  $('energyCost').textContent = currency(energy);
  $('fixedCost').textContent = currency(fixed);
  $('donutTotal').textContent = total >= 10000 ? `₹${(total/1000).toFixed(1)}k` : currency(total);
  const energyPercent = total > 0 ? Math.min(100, Math.max(0, energy / total * 100)) : 0;
  $('donutChart').style.background = `conic-gradient(var(--green) 0 ${energyPercent}%, #426078 ${energyPercent}% 100%)`;
  $('quickInsight').textContent = `Every 10 units saved could reduce your estimate by ${currency(10 * rate)}.`;
  $('reductionLabel').textContent = `${reduction}%`;
  $('savingAmount').textContent = currency(savings, 2);
  $('newBillAmount').textContent = currency(newBill, 2);
  return {units, rate, fixed, days, energy, total, daily};
}
function updateFromInputs(){ calculateBill(); }
function syncUnits(value){ $('unitsInput').value = value; calculateBill(); }
function applianceTypeDetails(type){
  const details = {
    bulb:{name:'LED bulb',emoji:'💡',watts:9}, fan:{name:'Ceiling fan',emoji:'🌀',watts:75},
    tv:{name:'Television',emoji:'📺',watts:100}, laptop:{name:'Laptop',emoji:'💻',watts:65},
    fridge:{name:'Refrigerator',emoji:'🧊',watts:180}, ac:{name:'Air conditioner',emoji:'❄️',watts:1500},
    washer:{name:'Washing machine',emoji:'🧺',watts:500}, iron:{name:'Electric iron',emoji:'♨️',watts:1000},
    custom:{name:'Custom appliance',emoji:'🔌',watts:100}
  };
  return details[type] || details.custom;
}
function updateAppliancePreview(){
  const watts = Math.max(0, Number($('wattInput').value) || 0);
  const quantity = Math.max(0, Number($('quantityInput').value) || 0);
  const hours = Math.max(0, Number($('hoursInput').value) || 0);
  const days = Math.max(0, Number($('applianceDays').value) || 0);
  $('appliancePreview').textContent = `${number(watts * quantity * hours * days / 1000)} kWh`;
}
function renderAppliances(){
  const list = $('applianceList');
  $('applianceCount').textContent = `${appliances.length} ${appliances.length === 1 ? 'item' : 'items'}`;
  if(!appliances.length){
    list.innerHTML = '<div class="empty-state"><span>ϟ</span><strong>Your list is ready</strong><p>Add an appliance to start exploring your energy use.</p></div>';
  } else {
    list.innerHTML = appliances.map(a => {
      const usage = a.watts * a.quantity * a.hours * a.days / 1000;
      return `<div class="appliance-row" data-id="${a.id}">
        <div class="appliance-emoji">${a.emoji}</div>
        <div class="appliance-info"><strong>${escapeHTML(a.name)}</strong><small>${a.watts} W · ${a.quantity} item${a.quantity===1?'':'s'} · ${number(a.hours,1)} h/day</small></div>
        <div class="appliance-usage"><strong>${number(usage)} kWh</strong><small>${currency(usage * getBillInputs().rate, 2)}</small></div>
        <button type="button" class="remove-appliance" data-remove="${a.id}" aria-label="Remove ${escapeHTML(a.name)}" title="Remove appliance">✕</button>
      </div>`;
    }).join('');
  }
  const total = appliances.reduce((sum,a)=>sum + a.watts*a.quantity*a.hours*a.days/1000,0);
  $('applianceTotal').textContent = `${number(total)} kWh`;
  $('applianceCost').textContent = currency(total * getBillInputs().rate, 2);
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function saveHistory(){
  const entry = {...calculateBill(), id:window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, savedAt:new Date().toISOString()};
  let history = readHistory();
  history.unshift(entry);
  history = history.slice(0,8);
  const stored = storageSet(STORAGE.history, JSON.stringify(history));
  renderHistory();
  saveRemoteEstimate(entry, stored);
}
function readHistory(){
  try {
    const parsed = JSON.parse(storageGet(STORAGE.history) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
async function getSupabaseContext(){
  if(!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) return null;
  if(!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  const {data, error} = await supabaseClient.auth.getSession();
  if(error) throw error;
  if(data.session) return {client:supabaseClient, userId:data.session.user.id};
  const {data:authData, error:authError} = await supabaseClient.auth.signInAnonymously();
  if(authError) throw authError;
  return {client:supabaseClient, userId:authData.user.id};
}
function remoteEstimate(item, userId){
  return {
    id:String(item.id), user_id:userId, saved_at:item.savedAt || new Date().toISOString(),
    units:Number(item.units) || 0, rate:Number(item.rate) || 0, fixed:Number(item.fixed) || 0,
    days:Number(item.days) || 30, energy:Number(item.energy) || 0, total:Number(item.total) || 0,
    daily:Number(item.daily) || 0
  };
}
async function saveRemoteEstimate(entry, stored){
  try {
    const context = await getSupabaseContext();
    if(!context){ showToast(stored ? 'Estimate saved in this browser.' : 'Browser storage is unavailable.'); return; }
    const {error} = await context.client.from('estimates').upsert(remoteEstimate(entry, context.userId), {onConflict:'user_id,id'});
    if(error) throw error;
    showToast('Estimate saved in this browser and synced to Supabase.');
  } catch {
    showToast(stored ? 'Estimate saved here; Supabase sync is unavailable.' : 'Supabase sync is unavailable.');
  }
}
async function syncRemoteHistory(){
  try {
    const context = await getSupabaseContext();
    if(!context) return;
    const localHistory = readHistory();
    if(localHistory.length){
      const {error} = await context.client.from('estimates').upsert(localHistory.map(item => remoteEstimate(item, context.userId)), {onConflict:'user_id,id'});
      if(error) throw error;
    }
    const {data, error} = await context.client.from('estimates').select('id,units,rate,fixed,days,energy,total,daily,saved_at').eq('user_id', context.userId).order('saved_at', {ascending:false}).limit(8);
    if(error) throw error;
    const remoteHistory = data.map(item => ({...item, savedAt:item.saved_at}));
    const merged = new Map();
    [...remoteHistory, ...localHistory].forEach(item => { if(!merged.has(String(item.id))) merged.set(String(item.id), item); });
    const history = [...merged.values()].sort((a,b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).slice(0,8);
    storageSet(STORAGE.history, JSON.stringify(history));
    renderHistory();
  } catch {}
}
async function deleteRemoteEstimate(id){
  try {
    const context = await getSupabaseContext();
    if(!context) return;
    const {error} = await context.client.from('estimates').delete().eq('id', String(id)).eq('user_id', context.userId);
    if(error) throw error;
  } catch { showToast('Estimate removed here; Supabase could not sync the deletion.'); }
}
async function clearRemoteHistory(){
  try {
    const context = await getSupabaseContext();
    if(!context) return;
    const {error} = await context.client.from('estimates').delete().eq('user_id', context.userId);
    if(error) throw error;
  } catch { showToast('History cleared here; Supabase could not sync the deletion.'); }
}
function renderHistory(){
  const history = readHistory();
  const list = $('historyList');
  if(!history.length){ list.innerHTML = '<div class="history-empty">No saved estimates yet. Use “Save estimate” in the calculator to keep one here.</div>'; return; }
  list.innerHTML = history.map(item => {
    const date = new Date(item.savedAt);
    const dateText = Number.isNaN(date.getTime()) ? 'Saved estimate' : date.toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div class="history-row"><div><strong>${currency(item.total,2)} estimated bill</strong><small>${dateText}</small></div><div class="history-units">${number(item.units,1)} kWh · ${currency(item.rate,2)}/unit</div><div class="d-flex align-items-center gap-2"><span class="history-price">${currency(item.total)}</span><button class="history-delete" type="button" data-history-delete="${escapeHTML(item.id)}" aria-label="Delete saved estimate" title="Delete">✕</button></div></div>`;
  }).join('');
}
function setTheme(light){
  document.body.classList.toggle('light-mode', light);
  $('themeToggle').textContent = light ? '☾ Dark mode' : '☼ Light mode';
  storageSet(STORAGE.theme, light ? 'light' : 'dark');
}
function validateNumberInput(input, min, max){
  let val = Number(input.value);
  if(!Number.isFinite(val)) val = min;
  input.value = Math.min(max, Math.max(min, val));
}

document.addEventListener('DOMContentLoaded', () => {
  // Calculator: values stay in sync as the user types or moves the range slider.
  ['unitsInput','rateInput','fixedInput','daysInput'].forEach(id => {
    $(id).addEventListener('input', () => { calculateBill(); renderAppliances(); });
    $(id).addEventListener('blur', () => {
      const ranges = {unitsInput:[0,100000],rateInput:[0,1000],fixedInput:[0,100000],daysInput:[1,366]};
      validateNumberInput($(id), ...ranges[id]); calculateBill();
    });
  });
  $('unitsRange').addEventListener('input', event => syncUnits(event.target.value));
  $('billForm').addEventListener('submit', event => {
    event.preventDefault();
    ['unitsInput','rateInput','fixedInput','daysInput'].forEach(id => {
      const ranges = {unitsInput:[0,100000],rateInput:[0,1000],fixedInput:[0,100000],daysInput:[1,366]};
      validateNumberInput($(id), ...ranges[id]);
    });
    calculateBill(); renderAppliances(); showToast('Your estimate is up to date.');
  });
  $('resetCalc').addEventListener('click', () => {
    $('unitsInput').value = 180; $('rateInput').value = 6; $('fixedInput').value = 0; $('daysInput').value = 30;
    $('unitsRange').value = 180; $('reductionRange').value = 15; calculateBill(); renderAppliances(); showToast('Calculator values reset.');
  });
  $('saveEstimate').addEventListener('click', saveHistory);
  $('reductionRange').addEventListener('input', calculateBill);

  $('applianceSelect').addEventListener('change', event => {
    const detail = applianceTypeDetails(event.target.value);
    $('wattInput').value = detail.watts;
    if(event.target.value === 'bulb'){ $('quantityInput').value = 4; $('hoursInput').value = 6; }
    else if(event.target.value === 'fan'){ $('quantityInput').value = 2; $('hoursInput').value = 8; }
    else if(event.target.value === 'ac'){ $('quantityInput').value = 1; $('hoursInput').value = 6; }
    else { $('quantityInput').value = 1; $('hoursInput').value = 4; }
    updateAppliancePreview();
  });
  ['wattInput','quantityInput','hoursInput','applianceDays'].forEach(id => $(id).addEventListener('input', updateAppliancePreview));
  $('applianceForm').addEventListener('submit', event => {
    event.preventDefault();
    const type = $('applianceSelect').value;
    const detail = applianceTypeDetails(type);
    const watts = Number($('wattInput').value), quantity = Number($('quantityInput').value), hours = Number($('hoursInput').value), days = Number($('applianceDays').value);
    if(!Number.isFinite(watts) || watts <= 0 || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(hours) || hours < 0 || hours > 24 || !Number.isFinite(days) || days < 1 || days > 31){
      showToast('Please enter valid appliance values.'); return;
    }
    appliances.push({id:nextApplianceId++, type, name:detail.name, emoji:detail.emoji, watts, quantity, hours, days});
    renderAppliances(); showToast(`${detail.name} added to your planner.`);
  });
  $('applianceList').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if(!button) return;
    appliances = appliances.filter(a => a.id !== Number(button.dataset.remove));
    renderAppliances(); showToast('Appliance removed.');
  });
  $('clearAppliances').addEventListener('click', () => {
    appliances = []; renderAppliances(); showToast('Appliance list cleared.');
  });
  $('useApplianceTotal').addEventListener('click', () => {
    const total = appliances.reduce((sum,a)=>sum+a.watts*a.quantity*a.hours*a.days/1000,0);
    $('unitsInput').value = Number(total.toFixed(2)); $('unitsRange').value = Math.min(800,total);
    calculateBill(); renderAppliances(); document.querySelector('#calculator').scrollIntoView({behavior:'smooth',block:'start'});
    showToast('Appliance usage copied to the bill calculator.');
  });
  $('clearHistory').addEventListener('click', () => {
    storageRemove(STORAGE.history); renderHistory(); showToast('Saved history cleared.'); clearRemoteHistory();
  });
  $('historyList').addEventListener('click', event => {
    const button = event.target.closest('[data-history-delete]');
    if(!button) return;
    const id = button.dataset.historyDelete;
    storageSet(STORAGE.history, JSON.stringify(readHistory().filter(item=>String(item.id)!==id)));
    renderHistory(); showToast('Saved estimate deleted.'); deleteRemoteEstimate(id);
  });
  $('themeToggle').addEventListener('click', () => setTheme(!document.body.classList.contains('light-mode')));
  const savedTheme = storageGet(STORAGE.theme);
  setTheme(savedTheme === 'light');
  updateAppliancePreview(); calculateBill(); renderAppliances(); renderHistory();
  syncRemoteHistory();

  // Highlight the active section in the navigation as the page is explored.
  const sections = ['dashboard','calculator','appliances','savings','history'].map(id=>$(id)).filter(Boolean);
  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          document.querySelectorAll('.navbar .nav-link').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
        }
      });
    }, {rootMargin:'-25% 0px -65% 0px'});
    sections.forEach(section=>observer.observe(section));
  }
});
