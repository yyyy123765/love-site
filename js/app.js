const INITIAL = window.INITIAL;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => 'a' + Date.now() + Math.floor(Math.random()*1000);

/* ---------- 本地存储（回退模式 + 主题/音乐偏好） ---------- */
const store = {
  get(k, d){ try{ const v = localStorage.getItem('love2_'+k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('love2_'+k, JSON.stringify(v)); }catch(e){ alert('浏览器本地存储已满，请删除一些大照片或减小图片尺寸'); } }
};

/* ---------- 后端 Supabase ---------- */
const SC = (window.SUPABASE_CONFIG || {});
let sb = null;
let cloud = false;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('请求超时')), ms))]);
async function q(promise){ const { data, error } = await withTimeout(promise, 10000); if(error) throw error; return data; }

/* ---------- 状态 ---------- */
let state = { nick1:INITIAL.couple.nick1, nick2:INITIAL.couple.nick2, startDate:INITIAL.couple.startDate, match:INITIAL.couple.matchPercent, onboarded:false };
let addedMeetings=[], addedBouquets=[], addedGallery=[], moments=[];
const meetings = () => INITIAL.meetings.concat(addedMeetings);
const bouquets = () => INITIAL.bouquets.concat(addedBouquets);
const gallery = () => INITIAL.gallery.concat(addedGallery);

const fmtDate = d => d ? String(d).replace(/-/g, '.') : '';
const moodByK = k => INITIAL.moods.find(m => m.k === k);
function saveCache(){ try{ localStorage.setItem('love2_cache', JSON.stringify({ nick1:state.nick1, nick2:state.nick2, startDate:state.startDate, match:state.match, addedMeetings, addedBouquets, addedGallery, moments })); }catch(e){} }

/* ---------- 数据加载（本地 / 云端） ---------- */
function loadLocal(){
  state = Object.assign({ nick1:INITIAL.couple.nick1, nick2:INITIAL.couple.nick2, startDate:INITIAL.couple.startDate, match:INITIAL.couple.matchPercent, onboarded:false }, store.get('state', {}));
  addedMeetings = store.get('meetings', []);
  addedBouquets = store.get('bouquets', []);
  addedGallery = store.get('gallery', []);
  moments = store.get('moments', []);
  const cache = store.get('cache', null);
  if(cache){
    state.nick1 = cache.nick1 ?? state.nick1;
    state.nick2 = cache.nick2 ?? state.nick2;
    state.startDate = cache.startDate ?? state.startDate;
    state.match = cache.match ?? state.match;
    if(cache.addedMeetings) addedMeetings = cache.addedMeetings;
    if(cache.addedBouquets) addedBouquets = cache.addedBouquets;
    if(cache.addedGallery) addedGallery = cache.addedGallery;
    if(cache.moments) moments = cache.moments;
  }
}
async function loadCloud(){
  const s = await q(sb.from('site_settings').select('*').eq('id',1).maybeSingle());
  if(s){
    state.nick1 = s.nick1 ?? state.nick1;
    state.nick2 = s.nick2 ?? state.nick2;
    state.startDate = s.start_date ?? state.startDate;
    state.match = s.match_percent ?? state.match;
    state.onboarded = true;
  }
  addedMeetings = (await q(sb.from('meetings').select('*').order('id',{ascending:true})) || []).map(r=>({ id:'a'+r.id, date:r.date, title:r.title, text:r.text, photos:r.photos||[] }));
  addedBouquets = (await q(sb.from('bouquets').select('*').order('id',{ascending:true})) || []).map(r=>({ id:'a'+r.id, date:r.date, note:r.note, photo:r.photo }));
  addedGallery = (await q(sb.from('gallery').select('*').order('id',{ascending:true})) || []).map(r=>({ id:'a'+r.id, src:r.src, caption:r.caption }));
  moments = (await q(sb.from('moments').select('*').order('id',{ascending:true})) || []).map(r=>({ id:'a'+r.id, mood:r.mood, face:r.face, text:r.text, photo:r.photo, time:r.time, by:r.who }));
}
async function tryCloud(){
  if(!(SC.url && SC.anonKey)) return;            // 未配置 → 纯本地模式
  if(!window.supabase) return;                   // SDK 未加载 → 纯本地模式
  sb = window.supabase.createClient(SC.url, SC.anonKey);
  cloud = true;
  try{
    await withTimeout(loadCloud(), 20000);
    console.info('已连接云端 Supabase'); saveCache();
  }catch(e){
    console.warn('云端连接失败，保持本地模式：', e && e.message);
    cloud = false; sb = null;              // 降级本地，避免后续操作卡顿
  }
}

/* ---------- 持久化（云端 / 本地） ---------- */
async function persistSettings(){
  if(cloud){ await q(sb.from('site_settings').upsert({ id:1, nick1:state.nick1, nick2:state.nick2, start_date:state.startDate, match_percent:state.match })); }
  else { store.set('state', { nick1:state.nick1, nick2:state.nick2, startDate:state.startDate, match:state.match, onboarded:state.onboarded }); }
}
async function addMeeting(item){
  if(cloud){ const r = await q(sb.from('meetings').insert({ date:item.date, title:item.title, text:item.text, photos:item.photos }).select().single()); item.id = 'a'+r.id; addedMeetings.push(item); }
  else { item.id = uid(); addedMeetings.push(item); store.set('meetings', addedMeetings); }
}
async function removeMeeting(id){
  if(cloud){ await q(sb.from('meetings').delete().eq('id', Number(id.slice(1)))); }
  addedMeetings = addedMeetings.filter(x => x.id !== id);
  if(!cloud) store.set('meetings', addedMeetings);
}
async function addBouquet(item){
  if(cloud){ const r = await q(sb.from('bouquets').insert({ date:item.date, note:item.note, photo:item.photo }).select().single()); item.id = 'a'+r.id; addedBouquets.push(item); }
  else { item.id = uid(); addedBouquets.push(item); store.set('bouquets', addedBouquets); }
}
async function removeBouquet(id){
  if(cloud){ await q(sb.from('bouquets').delete().eq('id', Number(id.slice(1)))); }
  addedBouquets = addedBouquets.filter(x => x.id !== id);
  if(!cloud) store.set('bouquets', addedBouquets);
}
async function addGalleryItem(item){
  if(cloud){ const r = await q(sb.from('gallery').insert({ src:item.src, caption:item.caption }).select().single()); item.id = 'a'+r.id; addedGallery.push(item); }
  else { item.id = uid(); addedGallery.push(item); store.set('gallery', addedGallery); }
}
async function removeGalleryItem(id){
  if(cloud){ await q(sb.from('gallery').delete().eq('id', Number(id.slice(1)))); }
  addedGallery = addedGallery.filter(x => x.id !== id);
  if(!cloud) store.set('gallery', addedGallery);
}
async function updateGalleryNote(id, caption){
  const g = addedGallery.find(x => x.id === id); if(!g) return;
  if(cloud){ await q(sb.from('gallery').update({ caption }).eq('id', Number(id.slice(1)))); }
  g.caption = caption;
  if(!cloud) store.set('gallery', addedGallery);
}
async function addMoment(item){
  if(cloud){ const r = await q(sb.from('moments').insert({ mood:item.mood, face:item.face, text:item.text, photo:item.photo, who:item.by, time:item.time }).select().single()); item.id = 'a'+r.id; moments.push(item); }
  else { item.id = uid(); moments.push(item); store.set('moments', moments); }
}
async function removeMoment(id){
  if(cloud){ await q(sb.from('moments').delete().eq('id', Number(id.slice(1)))); }
  moments = moments.filter(x => x.id !== id);
  if(!cloud) store.set('moments', moments);
}

/* ---------- 主题 ---------- */
function applyTheme(t){ document.documentElement.dataset.theme = t; $('#themeBtn').textContent = t==='dark' ? '☀️' : '🌙'; store.set('theme', t); const m = document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content', t==='dark' ? '#14111d' : '#fff6f7'); }
$('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme==='dark' ? 'light' : 'dark'));
applyTheme(store.get('theme','dark'));

/* ---------- 昵称 ---------- */
function fillNames(){
  $('#nick1').textContent = state.nick1;
  $('#nick2').textContent = state.nick2;
  $$('.who-a').forEach(e => e.textContent = state.nick1);
  $$('.who-b').forEach(e => e.textContent = state.nick2);
  $('#momentWho').innerHTML = `<option value="0">我是 ${esc(state.nick1)}</option><option value="1">我是 ${esc(state.nick2)}</option>`;
}

/* ---------- 计时器 ---------- */
function tick(){
  const start = new Date(state.startDate).getTime();
  let diff = Math.max(0, Date.now() - start);
  const d = Math.floor(diff/86400000); diff -= d*86400000;
  const h = Math.floor(diff/3600000); diff -= h*3600000;
  const m = Math.floor(diff/60000); diff -= m*60000;
  const s = Math.floor(diff/1000);
  $('#tD').textContent = d; $('#tH').textContent = String(h).padStart(2,'0');
  $('#tM').textContent = String(m).padStart(2,'0'); $('#tS').textContent = String(s).padStart(2,'0');
  $('#totalDays').textContent = d;
}

/* ---------- 爱心 + 花瓣 ---------- */
const cvs = $('#hearts'), ctx = cvs.getContext('2d');
const DPR = Math.min(devicePixelRatio||1, 2);
let HW=0, HH=0, hearts=[], petals=[];
function canvasResize(){
  const hero = cvs.parentElement;
  const w = hero ? hero.clientWidth : 0;
  const h = hero ? hero.clientHeight : 0;
  HW = Math.max(1, w || window.innerWidth);
  HH = Math.max(1, h || window.innerHeight);
  cvs.width = Math.floor(HW * DPR);
  cvs.height = Math.floor(HH * DPR);
  cvs.style.width = '100%';
  cvs.style.height = '100%';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function makeHeart(init){ const s=7+Math.random()*16; return { x:Math.random()*HW, y: init?Math.random()*HH : -s-Math.random()*HH*.5, s, vy:.35+Math.random()*.8, sway:.5+Math.random(), ph:Math.random()*Math.PI*2, a:.2+Math.random()*.5, rot:(Math.random()-.5)*.6, c:Math.random()<.7?'#e75480':'#ff8fb3' }; }
function makePetal(init){ const s=4+Math.random()*6; return { x:Math.random()*HW, y: init?Math.random()*HH : -s-Math.random()*HH*.5, s, vy:.4+Math.random()*.9, sway:.7+Math.random()*1.2, ph:Math.random()*Math.PI*2, a:.25+Math.random()*.5, rot:Math.random()*Math.PI, vr:(Math.random()-.5)*.02, c:'#ffc7d6' }; }
function drawHeart(x,y,s,c,a,rot){ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.globalAlpha=a; ctx.fillStyle=c; ctx.beginPath();
  ctx.moveTo(0,s*.3); ctx.bezierCurveTo(0,0,-s*.5,0,-s*.5,-s*.35); ctx.bezierCurveTo(-s*.5,-s*.6,-s*.15,-s*.75,0,-s*.45);
  ctx.bezierCurveTo(s*.15,-s*.75,s*.5,-s*.6,s*.5,-s*.35); ctx.bezierCurveTo(s*.5,0,0,0,0,s*.3); ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawPetal(x,y,s,c,a,rot){ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.globalAlpha=a; ctx.fillStyle=c; ctx.beginPath(); ctx.ellipse(0,0,s,s*.55,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
function particlesInit(){ canvasResize(); hearts=[]; petals=[]; for(let i=0;i<32;i++) hearts.push(makeHeart(true)); for(let i=0;i<44;i++) petals.push(makePetal(true)); }
function particlesLoop(){ ctx.clearRect(0,0,HW,HH); const t=Date.now()/1000;
  for(const p of hearts){ p.y+=p.vy; p.x+=Math.sin(t*p.sway+p.ph)*.5; if(p.y>HH+p.s) Object.assign(p, makeHeart(false)); drawHeart(p.x,p.y,p.s,p.c,p.a,p.rot); }
  for(const p of petals){ p.y+=p.vy; p.x+=Math.sin(t*p.sway+p.ph)*.6; p.rot+=p.vr; if(p.y>HH+p.s) Object.assign(p, makePetal(false)); drawPetal(p.x,p.y,p.s,p.c,p.a,p.rot); }
  requestAnimationFrame(particlesLoop); }
particlesInit(); particlesLoop();
window.addEventListener('resize', particlesInit);
window.addEventListener('orientationchange', particlesInit);
window.addEventListener('load', particlesInit);
setTimeout(particlesInit, 400);
window.addEventListener('pagehide', () => { if(cloud) saveCache(); });
window.addEventListener('beforeunload', () => { if(cloud) saveCache(); });

/* ---------- 图片压缩 ---------- */
function fileToDataURL(file, maxW, q){
  return new Promise((res, rej)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => { URL.revokeObjectURL(url); rej(new Error('处理超时，请重试')); }, 20000);
    img.onload = () => {
      clearTimeout(timer);
      try{
        const sc = Math.min(1, maxW/img.width);
        const w = Math.max(1, Math.round(img.width*sc));
        const h = Math.max(1, Math.round(img.height*sc));
        const c = document.createElement('canvas'); c.width=w; c.height=h;
        const cx = c.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0,0,w,h);
        cx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', q));
      }catch(err){
        URL.revokeObjectURL(url);
        rej(new Error('图片处理失败'));
      }
    };
    img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); rej(new Error('无法读取该图片（格式不支持或文件损坏）')); };
    img.src = url;
  });
}
async function filesToDataURLs(files, maxW, q, onProgress){
  const ok = [], failed = [];
  for(let i=0;i<files.length;i++){
    if(onProgress) onProgress(i+1, files.length);
    try{ ok.push(await fileToDataURL(files[i], maxW, q)); }
    catch(e){ failed.push(files[i].name || ('第'+(i+1)+'张')); }
  }
  return { ok, failed };
}

/* ---------- 灯箱 ---------- */
let lbList=[], lbIdx=0;
function openLightbox(list, i){ lbList=list||[]; if(!lbList.length) return; lbIdx=Math.min(Math.max(0,i), lbList.length-1); renderLb(); $('#lightbox').classList.add('show'); }
function renderLb(){ const it=lbList[lbIdx]; $('#lbImg').src=it.src; $('#lbCap').textContent=it.caption||''; }
$('#lbClose').onclick = () => $('#lightbox').classList.remove('show');
$('#lbPrev').onclick = () => { lbIdx=(lbIdx-1+lbList.length)%lbList.length; renderLb(); };
$('#lbNext').onclick = () => { lbIdx=(lbIdx+1)%lbList.length; renderLb(); };
$('#lightbox').addEventListener('click', e => { if(e.target.id==='lightbox') $('#lightbox').classList.remove('show'); });

/* ---------- 相遇日记 ---------- */
function renderMeetings(){
  const box = $('#meetingList'); box.innerHTML='';
  meetings().forEach(m => {
    const el = document.createElement('div'); el.className='card mt-card';
    const isAdd = m.id && m.id.startsWith('a');
    const photos = m.photos || [];
    el.innerHTML = `${m.date ? `<span class="mt-date">${esc(fmtDate(m.date))}</span>` : ''}
      ${isAdd ? '<button class="del-x">×</button>' : ''}
      <h3 class="display">${esc(m.title)}</h3>
      <p>${esc(m.text)}</p>
      ${photos.length ? '<div class="mt-photos">' + photos.map((p,i)=>`<img src="${p}" data-i="${i}" alt="">`).join('') + '</div>' : ''}`;
    if(isAdd) el.querySelector('.del-x').onclick = async () => { try{ await removeMeeting(m.id); renderMeetings(); }catch(e){ alert('删除失败，请检查网络'); } };
    el.querySelectorAll('.mt-photos img').forEach(img => { img.onclick = () => openLightbox(photos.map(p=>({src:p, caption:m.title})), +img.dataset.i); });
    box.appendChild(el);
  });
}
const meetingPhotos = [];
$('#addMeetingBtn').onclick = () => { meetingPhotos.length=0; $('#mHint').textContent=''; $('#meetingMask').classList.add('show'); };
$('#mCancel').onclick = () => $('#meetingMask').classList.remove('show');
$('#mPhotos').addEventListener('change', async e => {
  const files=[...e.target.files]; if(!files.length) return;
  const { ok, failed } = await filesToDataURLs(files,1280,.8,(i,n)=> $('#mHint').textContent='正在处理 '+i+'/'+n+'…');
  meetingPhotos.push(...ok);
  let msg = '已选 '+meetingPhotos.length+' 张';
  if(failed.length) msg += '（'+failed.length+' 张失败）';
  $('#mHint').textContent = msg;
  if(failed.length) alert('有 '+failed.length+' 张无法读取，已跳过：\n'+failed.join('\n'));
  e.target.value='';
});
$('#mSave').onclick = async () => {
  const date=$('#mDate').value, title=$('#mTitle').value.trim(), text=$('#mText').value.trim();
  if(!date && !title && !text && !meetingPhotos.length) return;
  try{
    await addMeeting({ date, title: title||'见面记录', text, photos: meetingPhotos.slice() });
    $('#mDate').value=''; $('#mTitle').value=''; $('#mText').value=''; meetingPhotos.length=0; $('#mHint').textContent='';
    $('#meetingMask').classList.remove('show'); renderMeetings();
  }catch(e){ alert('保存失败，请检查网络'); }
};

/* ---------- 送你的花 ---------- */
function renderBouquets(){
  const box = $('#bouquetList'); box.innerHTML='';
  bouquets().forEach(b => {
    const el = document.createElement('div'); el.className='bq';
    const isAdd = b.id && b.id.startsWith('a');
    el.innerHTML = `<img src="${b.photo}" alt="${esc(b.note||'')}">
      ${isAdd ? '<button class="del-x">×</button>' : ''}
      <div class="info"><div class="note">${esc(b.note||'')}</div>${b.date ? `<div class="date">${esc(fmtDate(b.date))}</div>` : ''}</div>`;
    el.querySelector('img').onclick = () => openLightbox([{src:b.photo, caption:b.note||''}], 0);
    if(isAdd) el.querySelector('.del-x').onclick = async () => { try{ await removeBouquet(b.id); renderBouquets(); }catch(e){ alert('删除失败，请检查网络'); } };
    box.appendChild(el);
  });
}
let bouquetPhotoData = null;
$('#addBouquetBtn').onclick = () => { bouquetPhotoData=null; $('#bPreview').style.display='none'; $('#bPreview').src=''; $('#bHint').textContent=''; $('#bouquetMask').classList.add('show'); };
$('#bCancel').onclick = () => $('#bouquetMask').classList.remove('show');
$('#bPhoto').addEventListener('change', async e => {
  const f=e.target.files[0]; if(!f) return;
  $('#bHint').textContent='处理中…';
  try{
    bouquetPhotoData = await fileToDataURL(f,1280,.82);
    $('#bPreview').src = bouquetPhotoData;
    $('#bPreview').style.display = 'block';
    $('#bHint').textContent='已选择照片 ✓';
  }catch(err){
    $('#bHint').textContent='';
    alert(err.message || '图片处理失败');
  }
  e.target.value='';
});
$('#bSave').onclick = async () => {
  if(!bouquetPhotoData){ alert('请先选择花的照片'); return; }
  try{
    await addBouquet({ date:$('#bDate').value, note:$('#bNote').value.trim()||'一束花', photo:bouquetPhotoData });
    $('#bDate').value=''; $('#bNote').value=''; bouquetPhotoData=null; $('#bPreview').style.display='none'; $('#bHint').textContent='';
    $('#bouquetMask').classList.remove('show'); renderBouquets();
  }catch(e){ alert('保存失败，请检查网络'); }
};

/* ---------- 有趣的瞬间（照片 + 备注） ---------- */
function renderGallery(){
  const box = $('#galleryGrid'); box.innerHTML='';
  gallery().forEach((g,i) => {
    const isAdd = g.id && g.id.startsWith('a');
    const el = document.createElement('div'); el.className='gal';
    el.innerHTML = `<img src="${g.src}" alt="">
      <div class="cap">${esc(g.caption||'')}${isAdd ? ' <button class="edit-note" style="border:none;background:rgba(0,0,0,.35);color:#fff;border-radius:8px;font-size:.7rem;padding:2px 6px;cursor:pointer;margin-left:4px">✎</button>' : ''}</div>
      ${isAdd ? '<button class="del-x">×</button>' : ''}`;
    el.querySelector('img').onclick = () => openLightbox(gallery().map(x => ({src:x.src, caption:x.caption})), i);
    if(isAdd){
      el.querySelector('.del-x').onclick = async e => { e.stopPropagation(); try{ await removeGalleryItem(g.id); renderGallery(); }catch(err){ alert('删除失败'); } };
      el.querySelector('.edit-note').onclick = async e => { e.stopPropagation(); const n = prompt('备注：', g.caption||''); if(n!=null){ try{ await updateGalleryNote(g.id, n); renderGallery(); }catch(err){ alert('保存失败'); } } };
    }
    box.appendChild(el);
  });
}
let galleryPhotoData = null;
$('#addPhotoBtn').onclick = () => { galleryPhotoData=null; $('#gPreview').style.display='none'; $('#gPreview').src=''; $('#gHint').textContent=''; $('#galleryMask').classList.add('show'); };
$('#gCancel').onclick = () => $('#galleryMask').classList.remove('show');
$('#gPhoto').addEventListener('change', async e => {
  const f=e.target.files[0]; if(!f) return;
  $('#gHint').textContent='处理中…';
  try{
    galleryPhotoData = await fileToDataURL(f,1280,.82);
    $('#gPreview').src = galleryPhotoData;
    $('#gPreview').style.display = 'block';
    $('#gHint').textContent='已选择照片 ✓';
  }catch(err){
    $('#gHint').textContent='';
    alert(err.message || '图片处理失败');
  }
  e.target.value='';
});
$('#gSave').onclick = async () => {
  if(!galleryPhotoData){ alert('请先选择照片'); return; }
  try{
    await addGalleryItem({ src:galleryPhotoData, caption:$('#gNote').value.trim() });
    galleryPhotoData=null; $('#gNote').value=''; $('#gPreview').style.display='none'; $('#gHint').textContent='';
    $('#galleryMask').classList.remove('show'); renderGallery();
  }catch(e){ alert('保存失败，请检查网络'); }
};

/* ---------- 心情广场（颜文字） ---------- */
let selMood = INITIAL.moods[0].k, selFace = 0, momentPhoto = null;
function renderMoodPicker(){
  const row = $('#moodRow'); row.innerHTML='';
  INITIAL.moods.forEach(m => {
    const b = document.createElement('button'); b.className='mood-chip'+(m.k===selMood?' on':''); b.textContent=m.label;
    b.onclick = () => { selMood=m.k; selFace=0; renderMoodPicker(); };
    row.appendChild(b);
  });
  const fr = $('#faceRow'); fr.innerHTML='';
  moodByK(selMood).faces.forEach((f,i) => {
    const b = document.createElement('button'); b.className='face'+(i===selFace?' on':''); b.textContent=f;
    b.onclick = () => { selFace=i; renderMoodPicker(); };
    fr.appendChild(b);
  });
}
function renderMoments(){
  const box = $('#momentList'); box.innerHTML='';
  if(!moments.length){ box.innerHTML='<div class="mom-empty">还没有动态，发第一条心情吧 💌</div>'; return; }
  [...moments].reverse().forEach(mm => {
    const m = moodByK(mm.mood); const label = m ? m.label : '';
    const face = mm.face || (m ? m.faces[0] : '');
    const who = mm.by===1 ? state.nick2 : state.nick1;
    const el = document.createElement('div'); el.className='mom';
    el.innerHTML = `<div class="head"><span class="face">${esc(face)}</span> ${esc(label)} · ${esc(who)}<time>${esc(mm.time)}</time></div>
      ${mm.text ? `<div class="txt">${esc(mm.text)}</div>` : ''}
      ${mm.photo ? `<img src="${mm.photo}" alt="">` : ''}
      <button class="del-x">×</button>`;
    if(mm.photo) el.querySelector('img').onclick = () => openLightbox([{src:mm.photo, caption:label}], 0);
    el.querySelector('.del-x').onclick = async () => { try{ await removeMoment(mm.id); renderMoments(); }catch(e){ alert('删除失败'); } };
    box.appendChild(el);
  });
}
$('#momentPhotoBtn').onclick = () => $('#momentFile').click();
$('#momentFile').addEventListener('change', async e => { const f=e.target.files[0]; if(!f) return; try{ momentPhoto = await fileToDataURL(f,1280,.8); $('#momentPhotoBtn').textContent='📷 已加照片 ✓'; }catch(err){ alert(err.message || '图片处理失败'); } e.target.value=''; });
$('#momentSend').onclick = async () => {
  const m = moodByK(selMood);
  try{
    await addMoment({ mood:selMood, face:m.faces[selFace], text:$('#momentText').value.trim(), photo:momentPhoto, by:+$('#momentWho').value, time:new Date().toLocaleString('zh-CN') });
    $('#momentText').value=''; momentPhoto=null; $('#momentPhotoBtn').textContent='📷 加照片';
    renderMoments();
  }catch(e){ alert('发布失败，请检查网络'); }
};

/* ---------- 情话库 ---------- */
function showWord(){ const el=$('#wordBox'); el.classList.add('fade'); setTimeout(()=>{ el.textContent = INITIAL.words[Math.floor(Math.random()*INITIAL.words.length)]; el.classList.remove('fade'); }, 250); }
$('#wordBtn').onclick = showWord; showWord();

/* ---------- 匹配度 ---------- */
let matchObs = null;
function renderMatch(){
  const pct = Math.max(0, Math.min(100, +state.match||0));
  const tag = pct>=100?'命中注定':pct>=95?'天生一对':pct>=85?'非常合拍':pct>=70?'蛮有缘分':'慢慢靠近';
  $('#matchTag').textContent = tag;
  const arc=$('#matchArc'), C=326.73;
  if(matchObs) matchObs.disconnect();
  matchObs = new IntersectionObserver(es => { if(es[0].isIntersecting){ const t0=performance.now();
    (function a(t){ const k=Math.min(1,(t-t0)/1400), e=1-Math.pow(1-k,3), v=Math.round(pct*e);
      arc.style.strokeDashoffset = C*(1-v/100); $('#matchPct').textContent = v+'%'; if(k<1) requestAnimationFrame(a); })(t0);
    matchObs.disconnect(); } }, {threshold:.4});
  matchObs.observe($('#match'));
}

/* ---------- 音乐 ---------- */
let audioCtx=null, master=null, ambientTimer=null, musicOn=false, audioEl=null;
function ensureAudio(){ if(!audioCtx){ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); master=audioCtx.createGain(); master.gain.value=0; master.connect(audioCtx.destination); } }
function note(f,t,d,v,type){ const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type=type; o.frequency.value=f; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.5); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g); g.connect(master); o.start(t); o.stop(t+d+.1); }
const PENTA=[261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25];
function ambientLoop(){ if(!musicOn) return; const t=audioCtx.currentTime+.1; for(let i=0;i<4;i++){ const f=PENTA[Math.floor(Math.random()*PENTA.length)]; note(f,t+i*.55,2.6,.045,'triangle'); note(f*2,t+i*.55,2.8,.018,'sine'); } ambientTimer=setTimeout(ambientLoop,3200); }
function startMusic(){ if(INITIAL.couple.musicUrl){ if(!audioEl){ audioEl=new Audio(INITIAL.couple.musicUrl); audioEl.loop=true; } audioEl.play().catch(()=>{}); } else { ensureAudio(); audioCtx.resume(); master.gain.linearRampToValueAtTime(.5,1.5); ambientLoop(); } musicOn=true; $('#musicBtn').classList.remove('off'); }
function stopMusic(){ if(audioEl) audioEl.pause(); if(audioCtx&&master){ master.gain.linearRampToValueAtTime(0,.6); clearTimeout(ambientTimer); } musicOn=false; $('#musicBtn').classList.add('off'); }
$('#musicBtn').onclick = () => musicOn ? stopMusic() : startMusic();
if(store.get('music','on')==='off'){ $('#musicBtn').classList.add('off'); }
else { const once = () => { if(!musicOn) startMusic(); ['pointerdown','touchstart','click'].forEach(ev => document.removeEventListener(ev, once)); }; ['pointerdown','touchstart','click'].forEach(ev => document.addEventListener(ev, once)); }

/* ---------- 恋爱ID ---------- */
function coupleId(){ const custom = (INITIAL.couple.loveId || '').trim(); if(custom) return custom; const s=(state.nick1+state.nick2+state.startDate).replace(/\s/g,''); let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))>>>0; return 'LOVE-'+h.toString(36).toUpperCase().padStart(6,'0'); }

/* ---------- 设置 / 首次引导 ---------- */
function openSettings(){ $('#inNick1').value=state.nick1; $('#inNick2').value=state.nick2; $('#inDate').value=(state.startDate||'').slice(0,16); $('#inMatch').value=state.match; $('#mask').classList.add('show'); }
$('#setBtn').onclick = openSettings;
$('#mask').addEventListener('click', e => { if(e.target.id==='mask') $('#mask').classList.remove('show'); });
$('#cancelBtn').onclick = () => { state.onboarded = true; $('#mask').classList.remove('show'); persistSettings().catch(()=>{}); };
$('#saveBtn').onclick = () => {
  state.nick1 = $('#inNick1').value.trim() || state.nick1;
  state.nick2 = $('#inNick2').value.trim() || state.nick2;
  if($('#inDate').value) state.startDate = $('#inDate').value;
  state.match = +$('#inMatch').value || 0;
  state.onboarded = true;
  fillNames(); tick(); renderMatch(); renderMoments();
  $('#coupleId').textContent = coupleId();
  $('#mask').classList.remove('show');
  persistSettings().catch(() => alert('设置未能同步到云端，请检查网络'));
};

/* ---------- 滚动进场 ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.12});
function observeReveals(){ $$('.reveal').forEach(el => io.observe(el)); }

/* ---------- 渲染汇总 ---------- */
function renderAll(){
  fillNames();
  renderMeetings(); renderBouquets(); renderGallery(); renderMoodPicker(); renderMoments(); renderMatch();
  $('#coupleId').textContent = coupleId();
}

/* ---------- 初始化（非阻塞） ---------- */
async function init(){
  loadLocal();                 // 1) 立即用本地数据渲染，保证页面秒开、可点击
  renderAll();
  tick(); setInterval(tick, 1000);
  observeReveals();
  await tryCloud();            // 2) 后台尝试连云端，成功则刷新为云端数据
  renderAll();
  tick();
  if(!state.onboarded){ $('#setTitle').textContent = '先认识一下你们吧'; setTimeout(openSettings, 700); }
}
init();
