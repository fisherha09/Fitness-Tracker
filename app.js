const STORAGE_KEY = 'forge-fitness-tracker-v1';
const NAV = [
  ['dashboard', 'Dashboard', '⌂'],
  ['workouts', 'Workouts', '✓'],
  ['programs', 'Programs', '▦'],
  ['nutrition', 'Nutrition', '◒'],
  ['weight', 'Weight', '↕'],
  ['dexa', 'Body Composition / DEXA', '◇'],
  ['analytics', 'Analytics', '⌁'],
  ['data', 'Data / Settings', '⚙'],
];

const pageMeta = {
  dashboard: ['Dashboard', 'Your training, nutrition and body composition in one place.'],
  workouts: ['Workouts', 'Log sessions quickly and compare performance over time.'],
  programs: ['Programs', 'Create training blocks, schedule workouts and adapt individual sessions.'],
  nutrition: ['Nutrition', 'Track daily totals or paste natural-language meal descriptions for estimates.'],
  weight: ['Weight', 'Daily weight with trend-focused rolling averages and historical imports.'],
  dexa: ['Body Composition / DEXA', 'Keep measured DEXA data separate from between-scan estimates.'],
  analytics: ['Analytics', 'Connect weight, nutrition, training and body-composition trends.'],
  data: ['Data / Settings', 'Goals, exercise library, backups and application preferences.'],
};

const DEFAULT_EXERCISES = [
  ['Romanian Deadlift','Hamstrings'],['Hip Thrust','Glutes'],['Bulgarian Split Squat','Quads'],['Leg Curl','Hamstrings'],
  ['Shoulder Press','Shoulders'],['Lat Pulldown','Back'],['Lateral Raise','Shoulders'],['Biceps Curl','Biceps'],
  ['Leg Press','Quads'],['Squat','Quads'],['Bench Press','Chest'],['Triceps Pressdown','Triceps'],['Plank','Core'],
  ['Walking','Cardio'],['Running','Cardio'],['Cycling','Cardio'],['Calf Raise','Calves'],['Glute Bridge','Glutes']
];

const FOOD_DB = [
  {keys:['cottage cheese'], per100:{calories:82,protein:11.5,fat:2.3,carbs:4.3,fibre:0}},
  {keys:['greek yogurt','greek yoghurt'], per100:{calories:72,protein:10,fat:0.8,carbs:6.5,fibre:0}},
  {keys:['strawberries','strawberry'], per100:{calories:32,protein:0.7,fat:0.3,carbs:7.7,fibre:2}},
  {keys:['chicken breast'], per100:{calories:165,protein:31,fat:3.6,carbs:0,fibre:0}},
  {keys:['chicken thigh'], per100:{calories:209,protein:26,fat:10.9,carbs:0,fibre:0}},
  {keys:['brisket'], per100:{calories:250,protein:27,fat:16,carbs:0,fibre:0}},
  {keys:['cornbread'], per100:{calories:330,protein:7,fat:12,carbs:49,fibre:2}},
  {keys:['potato salad'], per100:{calories:143,protein:2.7,fat:8.1,carbs:14.9,fibre:1.3}},
  {keys:['baked beans'], per100:{calories:155,protein:5.5,fat:5.5,carbs:21,fibre:5}},
  {keys:['egg whites','egg white'], per100:{calories:52,protein:10.9,fat:0.2,carbs:0.7,fibre:0}},
  {keys:['egg'], per100:{calories:143,protein:12.6,fat:9.5,carbs:0.7,fibre:0}},
  {keys:['sourdough'], per100:{calories:230,protein:9,fat:1.5,carbs:51,fibre:2}},
  {keys:['pb2','powdered peanut butter'], serving:{label:'tbsp',grams:6.5,calories:30,protein:3.5,fat:0.75,carbs:3.5,fibre:1}},
  {keys:['babybel light'], serving:{label:'piece',grams:20,calories:50,protein:5,fat:3,carbs:0,fibre:0}},
  {keys:['milk','2% milk'], per100:{calories:50,protein:3.4,fat:2,carbs:4.8,fibre:0}},
];

function uid(prefix='id') { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function isoDate(d=new Date()) { return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function dateObj(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function fmtDate(s, short=false) { if (!s) return '—'; return dateObj(s).toLocaleDateString(undefined, short ? {month:'short',day:'numeric'} : {year:'numeric',month:'short',day:'numeric'}); }
function n(v, digits=1) { const num = Number(v); return Number.isFinite(num) ? num.toFixed(digits).replace(/\.0$/,'') : '—'; }
function clamp(x,a,b){ return Math.min(b,Math.max(a,x)); }
function sum(xs){ return xs.reduce((a,b)=>a+(Number(b)||0),0); }
function avg(xs){ const clean=xs.map(Number).filter(Number.isFinite); return clean.length?sum(clean)/clean.length:null; }
function daysBetween(a,b){ return Math.max(0, Math.round((dateObj(b)-dateObj(a))/86400000)); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function pct(v){ return Number.isFinite(v) ? `${Math.round(v)}%` : '—'; }
function dl(name, content, type='application/json') { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function blankState(){
  return {
    version:1,
    settings:{theme:'light', weightUnit:'lb', page:'dashboard', userHeightIn:null},
    goals:[{id:uid('goal'),startDate:'2026-10-01',endDate:'',calories:1700,protein:125,targetWeight:118,targetBodyFat:20,weeklyWorkouts:5}],
    weights:[], nutrition:[], dexas:[], programs:[], workouts:[], bodyEstimates:[],
    exercises: DEFAULT_EXERCISES.map(([name,muscleGroup])=>({id:uid('ex'),name,muscleGroup})),
  };
}

function loadState(){
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(saved?.version) return {...blankState(),...saved,settings:{...blankState().settings,...saved.settings}}; }
  catch(e){ console.warn('Could not load saved data',e); }
  return blankState();
}
let state = loadState();

function saveState(message='Saved locally'){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const el=document.getElementById('saveStatus'); if(el){ el.textContent=message; setTimeout(()=>{if(el)el.textContent='Saved locally';},1600); }
}
function toast(msg){ const el=document.getElementById('toast'); el.textContent=msg; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),2200); }
function getGoal(date=isoDate()){
  const candidates=state.goals.filter(g=>g.startDate<=date && (!g.endDate||g.endDate>=date)).sort((a,b)=>b.startDate.localeCompare(a.startDate));
  return candidates[0]||state.goals.slice().sort((a,b)=>b.startDate.localeCompare(a.startDate))[0]||{};
}
function weightsSorted(){ return [...state.weights].sort((a,b)=>a.date.localeCompare(b.date)); }
function nutritionFor(date){ return state.nutrition.filter(x=>x.date===date); }
function nutritionTotals(date){ const rows=nutritionFor(date); return ['calories','protein','fat','carbs','fibre'].reduce((o,k)=>(o[k]=sum(rows.map(r=>r[k])),o),{entries:rows.length}); }
function weightOnOrBefore(date){ return weightsSorted().filter(w=>w.date<=date).at(-1)||null; }
function rollingWeight(endDate=isoDate(), days=7){ const end=dateObj(endDate), start=new Date(end); start.setDate(start.getDate()-(days-1)); const vals=state.weights.filter(w=>{const d=dateObj(w.date); return d>=start&&d<=end;}).map(w=>w.weight); return avg(vals); }
function rollingNutrition(endDate=isoDate(),days=7,key='calories'){
  const end=dateObj(endDate), start=new Date(end); start.setDate(start.getDate()-(days-1));
  const grouped={}; state.nutrition.forEach(r=>{const d=dateObj(r.date); if(d>=start&&d<=end){grouped[r.date]??=[]; grouped[r.date].push(r);}});
  return avg(Object.keys(grouped).map(d=>sum(grouped[d].map(r=>r[key]))));
}
function workoutsInRange(start,end){ return state.workouts.filter(w=>w.date>=start&&w.date<=end); }
function lastNDaysStart(n){ const d=new Date(); d.setDate(d.getDate()-(n-1)); return isoDate(d); }
function workoutsPerWeekSince(start,end=isoDate()) { const days=Math.max(1,daysBetween(start,end)+1); return workoutsInRange(start,end).length/(days/7); }

function exerciseById(id){ return state.exercises.find(e=>e.id===id); }
function programById(id){ return state.programs.find(p=>p.id===id); }
function lastExercisePerformance(exId, before=isoDate()){
  const candidates=state.workouts.filter(w=>w.date<=before&&w.exercises?.some(e=>e.exerciseId===exId)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!candidates.length) return null; const w=candidates[0], ex=w.exercises.find(e=>e.exerciseId===exId); return {date:w.date,sets:ex.sets||[]};
}
function workoutVolume(workout){ return sum((workout.exercises||[]).flatMap(e=>(e.sets||[]).map(s=>(Number(s.weight)||0)*(Number(s.reps)||0)))); }
function recentStrengthTrend(since){
  const sessions=state.workouts.filter(w=>w.date>=since).sort((a,b)=>a.date.localeCompare(b.date));
  if(sessions.length<4) return 0;
  const half=Math.floor(sessions.length/2); const early=avg(sessions.slice(0,half).map(workoutVolume)); const late=avg(sessions.slice(half).map(workoutVolume));
  if(!early||!late) return 0; return clamp((late-early)/early,-.25,.25);
}

function computeBodyEstimate(targetDate=isoDate()){
  const scans=state.dexas.filter(d=>d.date<=targetDate&&Number.isFinite(Number(d.bodyFatPct))).sort((a,b)=>b.date.localeCompare(a.date));
  if(!scans.length) return {available:false,reason:'Add a DEXA scan with body-fat percentage to establish a measured baseline.'};
  const dexa=scans[0]; const baselineWeight=Number(dexa.totalMass)||Number(weightOnOrBefore(dexa.date)?.weight);
  const baselineFat=Number(dexa.fatMass)||baselineWeight*(Number(dexa.bodyFatPct)/100);
  const baselineLean=Number(dexa.leanMass)||Math.max(0,baselineWeight-baselineFat-(Number(dexa.boneMass)||0));
  const current=rollingWeight(targetDate,7) ?? Number(weightOnOrBefore(targetDate)?.weight);
  if(!baselineWeight||!current) return {available:false,reason:'Add weight data near the DEXA scan and a recent weight entry.'};
  const start=dexa.date, delta=current-baselineWeight;
  const protein=rollingNutrition(targetDate,30,'protein'); const goal=getGoal(targetDate); const proteinScore=protein&&goal.protein ? clamp(protein/goal.protein,0,1.2):null;
  const trainRate=workoutsPerWeekSince(start,targetDate); const trainScore=clamp(trainRate/3.5,0,1.2); const strengthTrend=recentStrengthTrend(start);
  let fatShare;
  if(delta<0){
    fatShare=.68 + (proteinScore??.65)*.12 + trainScore*.10 + Math.max(0,strengthTrend)*.08;
    fatShare=clamp(fatShare,.55,.94);
  } else {
    fatShare=.58 - (proteinScore??.65)*.12 - trainScore*.12 - Math.max(0,strengthTrend)*.08;
    fatShare=clamp(fatShare,.22,.65);
  }
  const fatChange=delta*fatShare; const tissueRemainder=delta-fatChange;
  const waterAllowance=Math.min(Math.abs(tissueRemainder)*.35,1.5) * Math.sign(delta||1);
  const leanChange=tissueRemainder-waterAllowance;
  const estFat=Math.max(0,baselineFat+fatChange); const estLean=Math.max(0,baselineLean+leanChange); const bf=estFat/current*100;
  let dataPoints=2; if(protein!=null)dataPoints++; if(trainRate>=0.5)dataPoints++; if(Math.abs(strengthTrend)>.001)dataPoints++; if(state.weights.filter(w=>w.date>=start&&w.date<=targetDate).length>=7)dataPoints++;
  const confidence=dataPoints>=6?'Moderate':dataPoints>=4?'Low–Moderate':'Low';
  const uncertainty=(confidence==='Moderate'?0.9:confidence==='Low–Moderate'?1.4:2.0)+Math.min(1.2,Math.abs(delta)*.04);
  return {
    available:true,date:targetDate,dexa,baselineWeight,currentWeight:current,delta,protein,trainRate,strengthTrend,
    bodyFatPct:bf,rangeLow:Math.max(0,bf-uncertainty),rangeHigh:Math.min(60,bf+uncertainty),confidence,
    fatMass:estFat,leanMass:estLean,fatChange,leanChange,waterAllowance,
    assumptions:[
      `Starts from the ${fmtDate(dexa.date)} DEXA as the measured baseline.`,
      `${Math.abs(delta).toFixed(1)} lb ${delta<0?'loss':'gain'} is partitioned using a heuristic informed by protein intake, training frequency and performance trend.`,
      `Short-term water/glycogen effects are allowed for and the result is shown as a range, not a measurement.`
    ]
  };
}

function recordBodyEstimate(){ const e=computeBodyEstimate(); if(!e.available)return; const item={id:uid('bfe'),date:e.date,bodyFatPct:+e.bodyFatPct.toFixed(1),rangeLow:+e.rangeLow.toFixed(1),rangeHigh:+e.rangeHigh.toFixed(1),confidence:e.confidence,dexaDate:e.dexa.date}; const ix=state.bodyEstimates.findIndex(x=>x.date===item.date); if(ix>=0)state.bodyEstimates[ix]=item; else state.bodyEstimates.push(item); }

function navRender(){ const nav=document.getElementById('nav'); nav.innerHTML=NAV.map(([id,label,icon])=>`<button class="nav-btn ${state.settings.page===id?'active':''}" data-page="${id}"><span class="nav-icon">${icon}</span>${esc(label)}</button>`).join(''); nav.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.settings.page=b.dataset.page;saveState();render();document.getElementById('sidebar').classList.remove('open');}); }

function setTheme(){ document.documentElement.dataset.theme=state.settings.theme==='dark'?'dark':'light'; }
function render(){
  setTheme(); navRender(); const page=state.settings.page||'dashboard'; const [title,sub]=pageMeta[page]; document.getElementById('pageTitle').textContent=title; document.getElementById('pageSubtitle').textContent=sub;
  document.getElementById('view').innerHTML=pageRenderers[page]();
  bindCommon(); pageBinders[page]?.(); requestAnimationFrame(()=>pageAfterRender[page]?.());
}
function bindCommon(){ document.querySelectorAll('[data-action="delete"]')?.forEach(b=>b.onclick=()=>{ if(confirm('Delete this item?')){ const [collection,id]=b.dataset.target.split(':'); state[collection]=state[collection].filter(x=>x.id!==id); saveState(); render(); }}); }

function goalProgress(value,goal){ if(!goal||!Number.isFinite(Number(value)))return 0; return clamp(Number(value)/Number(goal)*100,0,140); }
function deltaText(cur,prev,unit=''){ if(cur==null||prev==null)return '—'; const d=cur-prev; return `${d>=0?'+':''}${n(d)}${unit}`; }

function dashboardPage(){
  const today=isoDate(), nt=nutritionTotals(today), goal=getGoal(today), weight=Number(weightOnOrBefore(today)?.weight), w7=rollingWeight(today,7), w7prev=rollingWeight(lastNDaysStart(7),7), w30prev=rollingWeight(lastNDaysStart(30),7);
  const bf=computeBodyEstimate(today), active=state.programs.find(p=>p.startDate<=today&&p.endDate>=today); const workoutsWeek=workoutsInRange(lastNDaysStart(7),today).length;
  const lastDexa=[...state.dexas].sort((a,b)=>b.date.localeCompare(a.date))[0];
  let nextName='No active program'; if(active){const completed=state.workouts.filter(w=>w.programId===active.id).sort((a,b)=>b.date.localeCompare(a.date))[0]; const ix=active.days.findIndex(d=>d.id===completed?.programDayId); nextName=active.days[(ix+1+active.days.length)%active.days.length]?.name||active.days[0]?.name||'Program workout';}
  return `
    <div class="grid cols-4">
      ${metricCard('7-day weight',w7?`${n(w7)} lb`:'—',w7prev?`${deltaText(w7,w7prev,' lb')} vs prior 7d`:'Add recent weights')}
      ${metricCard('7-day calories',rollingNutrition(today,7,'calories')?`${n(rollingNutrition(today,7,'calories'),0)} kcal`:'—',goal.calories?`Goal ${goal.calories} kcal`:'No active goal')}
      ${metricCard('7-day protein',rollingNutrition(today,7,'protein')?`${n(rollingNutrition(today,7,'protein'),0)} g`:'—',goal.protein?`Goal ${goal.protein} g`:'No active goal')}
      ${metricCard('Workouts this week',workoutsWeek,goal.weeklyWorkouts?`${workoutsWeek}/${goal.weeklyWorkouts} weekly goal`:'Tracked sessions')}
    </div>

    <div class="section-title"><div><h2>Today</h2><p>Fast entry with the most-used actions up front.</p></div><button id="dashQuickLog">+ Log today</button></div>
    <div class="grid cols-3">
      <div class="card"><div class="card-head"><div><h3>Nutrition</h3><p>${fmtDate(today)}</p></div><span class="badge ${nt.protein>=goal.protein?'good':''}">${nt.entries} entries</span></div>
        <div class="grid cols-2"><div class="metric"><span class="label">Calories</span><span class="value">${n(nt.calories,0)}</span><span class="sub">${goal.calories?`${n(goal.calories-nt.calories,0)} remaining`:''}</span></div><div class="metric"><span class="label">Protein</span><span class="value">${n(nt.protein,0)} g</span><span class="sub">${goal.protein?`${n(goal.protein-nt.protein,0)} g remaining`:''}</span></div></div>
        <div class="divider"></div><div class="progress"><span style="width:${Math.min(100,goalProgress(nt.protein,goal.protein))}%"></span></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>Bodyweight</h3><p>Trend emphasized over daily noise.</p></div><span class="badge">7-day avg</span></div>
        <div class="metric"><span class="label">Latest</span><span class="value">${weight?`${n(weight)} lb`:'—'}</span><span class="sub">${w7?`7-day average ${n(w7)} lb`: 'Log a weight to start a trend'}</span></div>
        <div class="divider"></div><span class="muted">30-day trend: ${w7&&w30prev?deltaText(w7,w30prev,' lb'):'—'}</span>
      </div>
      <div class="card"><div class="card-head"><div><h3>Workout</h3><p>${active?esc(active.name):'No active program'}</p></div><span class="badge">Next</span></div>
        <div class="metric"><span class="label">Suggested</span><span class="value" style="font-size:21px">${esc(nextName)}</span><span class="sub">${active?`${fmtDate(active.startDate)} – ${fmtDate(active.endDate)}`:'Create a program or log an ad-hoc workout'}</span></div>
        <div class="divider"></div><button class="secondary small" id="startSuggested">Start workout</button>
      </div>
    </div>

    <div class="section-title"><div><h2>Current body composition</h2><p>Measured DEXA data is always shown separately from modelled estimates.</p></div></div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><div><h3>Latest measured</h3><p>DEXA</p></div><span class="badge good">Measured</span></div>
        ${lastDexa?`<div class="metric"><span class="label">Body fat</span><span class="value">${n(lastDexa.bodyFatPct)}%</span><span class="sub">${fmtDate(lastDexa.date)}${lastDexa.fatMass?` · ${n(lastDexa.fatMass)} lb fat mass`:''}</span></div>`:`<div class="empty-state">Add a DEXA scan to establish a measured baseline.</div>`}
      </div>
      <div class="card"><div class="card-head"><div><h3>Current estimate</h3><p>Between-scan model</p></div><span class="badge warn">Estimated</span></div>
        ${bf.available?`<div class="metric"><span class="label">Estimated body fat</span><span class="value">${n(bf.bodyFatPct)}%</span><span class="sub">Range ${n(bf.rangeLow)}–${n(bf.rangeHigh)}% · ${bf.confidence} confidence</span></div><div class="divider"></div><div class="note">Based on ${n(Math.abs(bf.delta))} lb ${bf.delta<0?'loss':'gain'} since the latest DEXA, ${bf.protein?`${n(bf.protein,0)} g/day recent protein, `:''}${n(bf.trainRate)} workouts/week and recent training performance. <button class="ghost small" id="estimateDetails">View assumptions</button></div>`:`<div class="empty-state">${esc(bf.reason)}</div>`}
      </div>
    </div>
    <div class="section-title"><div><h2>Recent trends</h2><p>Last 12 weeks.</p></div></div>
    <div class="card"><canvas class="chart" id="dashboardWeightChart"></canvas></div>
  `;
}

function metricCard(label,value,sub){ return `<div class="card"><div class="metric"><span class="label">${esc(label)}</span><span class="value">${esc(String(value))}</span><span class="sub">${esc(sub||'')}</span></div></div>`; }

function dashboardBind(){
  document.getElementById('dashQuickLog').onclick=openQuickLog;
  document.getElementById('startSuggested').onclick=()=>openWorkoutLogger();
  document.getElementById('estimateDetails')?.addEventListener('click',()=>{const e=computeBodyEstimate(); openModal('Estimated body composition','A heuristic estimate—not a measurement.',`<div class="stack">${e.assumptions.map(a=>`<div class="note">${esc(a)}</div>`).join('')}<div class="table-wrap"><table><tbody><tr><th>DEXA baseline</th><td>${n(e.dexa.bodyFatPct)}% on ${fmtDate(e.dexa.date)}</td></tr><tr><th>Current weight trend</th><td>${n(e.currentWeight)} lb</td></tr><tr><th>Estimated fat mass</th><td>${n(e.fatMass)} lb (${deltaText(e.fatMass,Number(e.dexa.fatMass)||e.baselineWeight*Number(e.dexa.bodyFatPct)/100,' lb')})</td></tr><tr><th>Estimated lean mass</th><td>${n(e.leanMass)} lb</td></tr><tr><th>Confidence</th><td>${esc(e.confidence)}</td></tr></tbody></table></div></div>`);});
}
function dashboardAfter(){ const data=weightsSorted().filter(w=>w.date>=lastNDaysStart(84)); drawLineChart('dashboardWeightChart',[{name:'Weight',points:data.map(w=>({x:w.date,y:Number(w.weight)}))}],{unit:'lb'}); }

function workoutsPage(){
  const rows=[...state.workouts].sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="section-title"><div><h2>Workout log</h2><p>Start from a program or create an ad-hoc session.</p></div><div class="actions"><button id="startWorkout">+ Start workout</button></div></div>
    <div class="grid cols-4">${metricCard('Last 7 days',workoutsInRange(lastNDaysStart(7),isoDate()).length,'workouts')}${metricCard('Last 30 days',workoutsInRange(lastNDaysStart(30),isoDate()).length,'workouts')}${metricCard('Weekly average',n(workoutsPerWeekSince(lastNDaysStart(90))), 'last 90 days')}${metricCard('Total sessions',state.workouts.length,'all time')}</div>
    <div class="section-title"><div><h2>History</h2></div></div>
    <div class="card flat">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Workout</th><th>Program</th><th>Exercises</th><th>Volume</th><th></th></tr></thead><tbody>${rows.map(w=>`<tr><td>${fmtDate(w.date)}</td><td><strong>${esc(w.name||'Workout')}</strong></td><td>${esc(programById(w.programId)?.name||'Ad hoc')}</td><td>${(w.exercises||[]).map(e=>esc(exerciseById(e.exerciseId)?.name||'Exercise')).join(', ')}</td><td>${n(workoutVolume(w),0)}</td><td><button class="danger small" data-action="delete" data-target="workouts:${w.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state">No workouts yet. Start one from an active program or log an ad-hoc session.</div>`}</div>`;
}
function workoutsBind(){ document.getElementById('startWorkout').onclick=()=>openWorkoutLogger(); }

function programsPage(){
  const today=isoDate(); const programs=[...state.programs].sort((a,b)=>b.startDate.localeCompare(a.startDate));
  return `<div class="section-title"><div><h2>Training programs</h2><p>Program templates are separate from completed workouts, so day-of changes do not rewrite history.</p></div><button id="newProgram">+ New program</button></div>
  <div class="grid cols-2">${programs.length?programs.map(p=>{const completed=state.workouts.filter(w=>w.programId===p.id).length; const weeks=Math.max(1,(daysBetween(p.startDate,p.endDate)+1)/7); const planned=p.days.length*Math.max(1,Math.floor(weeks)); return `<div class="card"><div class="card-head"><div><h3>${esc(p.name)}</h3><p>${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}</p></div><span class="badge ${p.startDate<=today&&p.endDate>=today?'good':''}">${p.startDate<=today&&p.endDate>=today?'Active':'Program'}</span></div><div class="split"><span>${p.days.length} workout days</span><span class="muted">${completed} completed</span></div><div class="divider"></div>${p.days.map(d=>`<div class="program-day"><strong>${esc(d.name)}</strong><div class="muted" style="margin-top:5px">${d.exercises.map(x=>esc(exerciseById(x.exerciseId)?.name||'Exercise')).join(' · ')||'No exercises'}</div></div>`).join('')}<div class="actions" style="margin-top:14px"><button class="secondary small" data-start-program="${p.id}">Start workout</button><button class="secondary small" data-edit-program="${p.id}">Edit</button><button class="danger small" data-action="delete" data-target="programs:${p.id}">Delete</button></div></div>`}).join(''):`<div class="card"><div class="empty-state">Create a program with a defined date range and reusable workout days.</div></div>`}</div>`;
}
function programsBind(){ document.getElementById('newProgram').onclick=()=>openProgramBuilder(); document.querySelectorAll('[data-start-program]').forEach(b=>b.onclick=()=>openWorkoutLogger(b.dataset.startProgram)); document.querySelectorAll('[data-edit-program]').forEach(b=>b.onclick=()=>openProgramBuilder(b.dataset.editProgram)); }

function nutritionPage(){
  const today=isoDate(), totals=nutritionTotals(today), g=getGoal(today); const last30=Object.keys(groupBy(state.nutrition.filter(r=>r.date>=lastNDaysStart(30)),'date')).map(d=>nutritionTotals(d));
  return `<div class="grid cols-4">${metricCard('Today calories',`${n(totals.calories,0)} kcal`,g.calories?`${n(g.calories-totals.calories,0)} from goal`:'')}${metricCard('Today protein',`${n(totals.protein,0)} g`,g.protein?`${n(g.protein-totals.protein,0)} g from goal`:'')}${metricCard('30d avg calories',avg(last30.map(x=>x.calories))?`${n(avg(last30.map(x=>x.calories)),0)} kcal`:'—','tracked days only')}${metricCard('30d avg protein',avg(last30.map(x=>x.protein))?`${n(avg(last30.map(x=>x.protein)),0)} g`:'—','tracked days only')}</div>
  <div class="section-title"><div><h2>Add nutrition</h2><p>Enter known totals, or paste a meal / ChatGPT summary and estimate what is missing.</p></div></div>
  <div class="card"><div class="form-grid">
    <div class="field span-3"><label>Date</label><input type="date" id="nutDate" value="${today}"></div>
    <div class="field span-3"><label>Meal</label><select id="nutMeal"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option>Drink</option><option>Other</option></select></div>
    <div class="field span-6"><label>Description / pasted summary</label><textarea id="nutDesc" placeholder="e.g. 200 g cottage cheese, 100 g Greek yogurt, 1 tbsp PB2 and 205 g strawberries"></textarea></div>
    <div class="field span-3"><label>Calories</label><input type="number" min="0" id="nutCalories"></div>
    <div class="field span-3"><label>Protein (g)</label><input type="number" min="0" step="0.1" id="nutProtein"></div>
    <div class="field span-2"><label>Fat (g)</label><input type="number" min="0" step="0.1" id="nutFat"></div>
    <div class="field span-2"><label>Carbs (g)</label><input type="number" min="0" step="0.1" id="nutCarbs"></div>
    <div class="field span-2"><label>Fibre (g)</label><input type="number" min="0" step="0.1" id="nutFibre"></div>
  </div><div class="actions" style="margin-top:14px"><button id="estimateNutrition">Estimate calories & protein</button><button class="secondary" id="saveNutrition">Save entry</button><span id="aiStatus" class="help"></span></div><div id="estimateBox" style="margin-top:12px"></div></div>
  <div class="section-title"><div><h2>Recent entries</h2></div></div><div class="card flat">${nutritionTable(state.nutrition.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,80))}</div>`;
}
function nutritionTable(rows){ return rows.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Meal</th><th>Description</th><th>Calories</th><th>Protein</th><th>Source</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(r.meal)}</td><td>${esc(r.description)}</td><td>${n(r.calories,0)}</td><td>${n(r.protein)} g</td><td><span class="badge ${r.source==='AI estimated'?'warn':''}">${esc(r.source||'Direct')}</span></td><td><button class="danger small" data-action="delete" data-target="nutrition:${r.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state">No nutrition entries yet.</div>`; }
function nutritionBind(){
  let estimateMeta=null;
  document.getElementById('estimateNutrition').onclick=async()=>{
    const desc=document.getElementById('nutDesc').value.trim(); if(!desc)return toast('Add a food description first.');
    const status=document.getElementById('aiStatus'); status.textContent='Estimating…';
    let result=null, source='Local estimate';
    try { const r=await fetch('/api/nutrition-estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:desc})}); if(r.ok){result=await r.json();source='AI estimated';} }
    catch{}
    if(!result) result=estimateNutritionLocal(desc);
    ['calories','protein','fat','carbs','fibre'].forEach(k=>{const id='nut'+k[0].toUpperCase()+k.slice(1); const el=document.getElementById(id); if(el&&result[k]!=null)el.value=Math.round(result[k]*10)/10;});
    estimateMeta={source,confidence:result.confidence||'Low',assumptions:result.assumptions||[]}; status.textContent=`${source} · ${estimateMeta.confidence} confidence`;
    document.getElementById('estimateBox').innerHTML=`<div class="note"><strong>Estimate ready.</strong> Review and edit before saving.${estimateMeta.assumptions.length?`<br><span class="muted">${estimateMeta.assumptions.map(esc).join(' ')}</span>`:''}</div>`;
  };
  document.getElementById('saveNutrition').onclick=()=>{
    const calories=numVal('nutCalories'),protein=numVal('nutProtein'); if(calories<0||protein<0)return toast('Calories and protein cannot be negative.');
    state.nutrition.push({id:uid('nut'),date:val('nutDate'),meal:val('nutMeal'),description:val('nutDesc'),calories:calories||0,protein:protein||0,fat:numVal('nutFat')||0,carbs:numVal('nutCarbs')||0,fibre:numVal('nutFibre')||0,source:estimateMeta?.source||'Direct entry',confidence:estimateMeta?.confidence||null,createdAt:new Date().toISOString()}); recordBodyEstimate(); saveState(); toast('Nutrition saved.'); render();
  };
}

function estimateNutritionLocal(text){
  const explicit=parseExplicitNutrition(text); if(explicit.calories!=null||explicit.protein!=null){return {...explicit,confidence:'High',assumptions:['Used nutrition values explicitly stated in the pasted text.']};}
  const result={calories:0,protein:0,fat:0,carbs:0,fibre:0,confidence:'Low',assumptions:[],items:[]}; let matched=0;
  const chunks=text.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);
  for(const chunk of chunks){ const lower=chunk.toLowerCase(); const food=FOOD_DB.find(f=>f.keys.some(k=>lower.includes(k))); if(!food)continue; let calc=null; const gm=lower.match(/(\d+(?:\.\d+)?)\s*g\b/); const tb=lower.match(/(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoon)/); const piece=lower.match(/(\d+(?:\.\d+)?)\s*(?:piece|babybel)/);
    if(food.per100&&gm){const mult=Number(gm[1])/100;calc=Object.fromEntries(Object.entries(food.per100).map(([k,v])=>[k,v*mult]));}
    else if(food.serving&&(tb||piece)){const qty=Number((tb||piece)[1]||1); calc={calories:food.serving.calories*qty,protein:food.serving.protein*qty,fat:food.serving.fat*qty,carbs:food.serving.carbs*qty,fibre:food.serving.fibre*qty};}
    if(calc){matched++; Object.keys(result).filter(k=>['calories','protein','fat','carbs','fibre'].includes(k)).forEach(k=>result[k]+=calc[k]||0); result.items.push({description:chunk,calories:calc.calories,protein:calc.protein});}
  }
  if(matched){ result.confidence=matched===chunks.length?'Moderate':'Low–Moderate'; result.assumptions.push(`Matched ${matched} of ${chunks.length} food lines against the built-in reference list.`); if(matched<chunks.length)result.assumptions.push('Unmatched foods are not included; edit the result before saving.'); }
  else result.assumptions.push('No explicit totals or recognized quantity/food combinations were found. Enter totals manually or configure AI estimation.');
  return result;
}
function parseExplicitNutrition(text){
  const get=(patterns)=>{for(const p of patterns){const m=text.match(p);if(m)return Number(m[1]);}return null;};
  return { calories:get([/(?:total|estimated total)?[^\d]{0,15}(\d+(?:\.\d+)?)\s*(?:cal|calories|kcal)/i,/(\d+(?:\.\d+)?)\s*(?:cal|calories|kcal)/i]), protein:get([/(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:of\s*)?protein/i,/protein[^\d]{0,10}(\d+(?:\.\d+)?)/i]), fat:get([/fat[^\d]{0,10}(\d+(?:\.\d+)?)/i]), carbs:get([/carb(?:ohydrate)?s?[^\d]{0,10}(\d+(?:\.\d+)?)/i]), fibre:get([/fib(?:re|er)[^\d]{0,10}(\d+(?:\.\d+)?)/i]) };
}

function weightPage(){
  const today=isoDate(), latest=weightOnOrBefore(today), w7=rollingWeight(today,7), w14=rollingWeight(today,14), rows=[...state.weights].sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="grid cols-4">${metricCard('Latest',latest?`${n(latest.weight)} lb`:'—',latest?fmtDate(latest.date):'')}${metricCard('7-day average',w7?`${n(w7)} lb`:'—','primary trend')}${metricCard('14-day average',w14?`${n(w14)} lb`:'—','smoother trend')}${metricCard('30-day change',w7&&rollingWeight(lastNDaysStart(30),7)?deltaText(w7,rollingWeight(lastNDaysStart(30),7),' lb'):'—','7-day avg vs 30 days ago')}</div>
  <div class="section-title"><div><h2>Log weight</h2></div></div><div class="card"><div class="form-grid"><div class="field span-4"><label>Date</label><input type="date" id="weightDate" value="${today}"></div><div class="field span-4"><label>Weight (lb)</label><input type="number" step="0.1" min="1" id="weightValue"></div><div class="field span-4"><label>Notes</label><input id="weightNotes" placeholder="Optional"></div></div><div class="actions" style="margin-top:12px"><button id="saveWeight">Save weight</button><button class="secondary" id="pasteWeights">Paste historical table</button></div></div>
  <div class="section-title"><div><h2>Trend</h2></div></div><div class="card"><canvas class="chart" id="weightChart"></canvas></div>
  <div class="section-title"><div><h2>Historical weight table</h2><p>Edit rows directly; one entry per date.</p></div><button class="secondary small" id="exportWeightCsv">Export CSV</button></div><div class="card flat">${weightTable(rows)}</div>`;
}
function weightTable(rows){return rows.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Notes</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><input class="inline-edit" type="date" value="${r.date}" data-weight-date="${r.id}"></td><td><input class="inline-edit" type="number" step="0.1" value="${r.weight}" data-weight-value="${r.id}"></td><td><input class="inline-edit" value="${esc(r.notes||'')}" data-weight-notes="${r.id}"></td><td><button class="danger small" data-action="delete" data-target="weights:${r.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state">No weight entries yet.</div>`;}
function weightBind(){
  document.getElementById('saveWeight').onclick=()=>{const date=val('weightDate'),weight=numVal('weightValue'); if(!(weight>0))return toast('Enter a positive weight.'); const existing=state.weights.find(w=>w.date===date); if(existing){ if(!confirm('A weight already exists for this date. Replace it?'))return; existing.weight=weight; existing.notes=val('weightNotes'); } else state.weights.push({id:uid('wt'),date,weight,notes:val('weightNotes')}); recordBodyEstimate();saveState();render();};
  document.querySelectorAll('[data-weight-date]').forEach(el=>el.onchange=()=>updateWeightInline(el.dataset.weightDate,'date',el.value)); document.querySelectorAll('[data-weight-value]').forEach(el=>el.onchange=()=>updateWeightInline(el.dataset.weightValue,'weight',Number(el.value))); document.querySelectorAll('[data-weight-notes]').forEach(el=>el.onchange=()=>updateWeightInline(el.dataset.weightNotes,'notes',el.value));
  document.getElementById('pasteWeights').onclick=openWeightImporter;
  document.getElementById('exportWeightCsv').onclick=()=>dl('weight-data.csv','date,weight,notes\n'+weightsSorted().map(w=>`${w.date},${w.weight},"${String(w.notes||'').replaceAll('"','""')}"`).join('\n'),'text/csv');
}
function updateWeightInline(id,key,value){ const w=state.weights.find(x=>x.id===id); if(!w)return; if(key==='date'&&state.weights.some(x=>x.id!==id&&x.date===value)){toast('That date already has an entry.');render();return;} w[key]=value;recordBodyEstimate();saveState('Updated'); }
function weightAfter(){ const rows=weightsSorted(); const rolling=rows.map(r=>({x:r.date,y:rollingWeight(r.date,7)})).filter(p=>p.y!=null); drawLineChart('weightChart',[{name:'Daily',points:rows.map(r=>({x:r.date,y:+r.weight})),alpha:.35},{name:'7-day average',points:rolling}],{unit:'lb'}); }

function dexaPage(){
  const rows=[...state.dexas].sort((a,b)=>b.date.localeCompare(a.date)); const est=computeBodyEstimate();
  return `<div class="grid cols-3">${metricCard('Latest DEXA',rows[0]?`${n(rows[0].bodyFatPct)}%`:'—',rows[0]?fmtDate(rows[0].date):'No scans')}${metricCard('Estimated current',est.available?`${n(est.bodyFatPct)}%`:'—',est.available?`${n(est.rangeLow)}–${n(est.rangeHigh)}% range`:est.reason)}${metricCard('Lean mass',est.available?`${n(est.leanMass)} lb`:(rows[0]?.leanMass?`${n(rows[0].leanMass)} lb`:'—'),est.available?'estimated current':'latest measured')}</div>
  <div class="section-title"><div><h2>Add DEXA scan</h2><p>Only the fields available on your report are required.</p></div></div><div class="card"><div class="form-grid">
    <div class="field span-3"><label>Scan date</label><input type="date" id="dexaDate" value="${isoDate()}"></div><div class="field span-3"><label>Total mass (lb)</label><input type="number" step="0.1" id="dexaMass"></div><div class="field span-3"><label>Body fat %</label><input type="number" step="0.1" id="dexaBf"></div><div class="field span-3"><label>Fat mass (lb)</label><input type="number" step="0.1" id="dexaFat"></div><div class="field span-3"><label>Lean mass (lb)</label><input type="number" step="0.1" id="dexaLean"></div><div class="field span-3"><label>Bone mass (lb)</label><input type="number" step="0.1" id="dexaBone"></div><div class="field span-3"><label>BF% excluding bone</label><input type="number" step="0.1" id="dexaNoBone"></div><div class="field span-3"><label>Provider / location</label><input id="dexaProvider"></div><div class="field"><label>Notes</label><input id="dexaNotes"></div></div><button id="saveDexa" style="margin-top:12px">Save DEXA</button></div>
  <div class="section-title"><div><h2>Body composition trend</h2></div></div><div class="card"><canvas class="chart" id="dexaChart"></canvas><div class="chart-legend"><span class="legend-key"><span class="legend-dot"></span>Measured DEXA</span><span class="legend-key"><span class="legend-dot secondary"></span>Estimated between scans</span></div></div>
  <div class="section-title"><div><h2>DEXA history</h2></div></div><div class="card flat">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Total</th><th>BF%</th><th>Fat mass</th><th>Lean mass</th><th>Bone</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${n(r.totalMass)} lb</td><td><strong>${n(r.bodyFatPct)}%</strong></td><td>${r.fatMass?n(r.fatMass)+' lb':'—'}</td><td>${r.leanMass?n(r.leanMass)+' lb':'—'}</td><td>${r.boneMass?n(r.boneMass)+' lb':'—'}</td><td><button class="danger small" data-action="delete" data-target="dexas:${r.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state">No DEXA scans yet.</div>`}</div>`;
}
function dexaBind(){document.getElementById('saveDexa').onclick=()=>{const bf=numVal('dexaBf'); if(bf!=null&&(bf<1||bf>70))return toast('Check the body-fat percentage.'); state.dexas.push({id:uid('dexa'),date:val('dexaDate'),totalMass:numVal('dexaMass'),bodyFatPct:bf,fatMass:numVal('dexaFat'),leanMass:numVal('dexaLean'),boneMass:numVal('dexaBone'),bodyFatNoBone:numVal('dexaNoBone'),provider:val('dexaProvider'),notes:val('dexaNotes')});recordBodyEstimate();saveState();render();};}
function dexaAfter(){ const measured=[...state.dexas].filter(x=>x.bodyFatPct!=null).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({x:x.date,y:+x.bodyFatPct})); const estimated=[...state.bodyEstimates].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({x:x.date,y:+x.bodyFatPct})); const current=computeBodyEstimate(); if(current.available&&!estimated.some(x=>x.x===current.date))estimated.push({x:current.date,y:current.bodyFatPct}); drawLineChart('dexaChart',[{name:'Measured',points:measured},{name:'Estimated',points:estimated,alpha:.45,dashed:true}],{unit:'%'}); }

function analyticsPage(){
  const today=isoDate(), start=lastNDaysStart(90); const trackedDays=Object.keys(groupBy(state.nutrition.filter(r=>r.date>=start),'date')); const g=getGoal(today); const avgCal=avg(trackedDays.map(d=>nutritionTotals(d).calories)),avgPro=avg(trackedDays.map(d=>nutritionTotals(d).protein)); const proteinCompliance=trackedDays.length?trackedDays.filter(d=>nutritionTotals(d).protein>=Number(getGoal(d).protein||Infinity)).length/trackedDays.length*100:null;
  return `<div class="grid cols-4">${metricCard('90d avg calories',avgCal?`${n(avgCal,0)} kcal`:'—','tracked days')}${metricCard('90d avg protein',avgPro?`${n(avgPro,0)} g`:'—','tracked days')}${metricCard('Protein goal hit',proteinCompliance!=null?pct(proteinCompliance):'—','tracked nutrition days')}${metricCard('Training frequency',`${n(workoutsPerWeekSince(start))}/wk`,'last 90 days')}</div>
  <div class="section-title"><div><h2>Weight & calories</h2><p>7-day averages help compare energy intake with weight trend.</p></div></div><div class="card"><canvas class="chart" id="calWeightChart"></canvas></div>
  <div class="section-title"><div><h2>Protein</h2></div></div><div class="card"><canvas class="chart" id="proteinChart"></canvas></div>
  <div class="section-title"><div><h2>Training frequency</h2></div></div><div class="card"><canvas class="chart" id="trainingChart"></canvas></div>
  <div class="section-title"><div><h2>Exercise progression</h2><p>Select an exercise to compare session volume.</p></div></div><div class="card"><div class="field" style="max-width:360px"><label>Exercise</label><select id="analyticsExercise"><option value="">Choose exercise</option>${state.exercises.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><canvas class="chart" id="exerciseChart"></canvas></div>`;
}
function analyticsBind(){document.getElementById('analyticsExercise').onchange=()=>drawExerciseProgress(document.getElementById('analyticsExercise').value);}
function analyticsAfter(){
  const start=lastNDaysStart(90); const wr=weightsSorted().filter(w=>w.date>=start); const weightRoll=wr.map(w=>({x:w.date,y:rollingWeight(w.date,7)})).filter(x=>x.y!=null);
  const nd=Object.keys(groupBy(state.nutrition.filter(r=>r.date>=start),'date')).sort(); const cal=nd.map(d=>({x:d,y:rollingNutrition(d,7,'calories')})).filter(x=>x.y!=null); drawDualChart('calWeightChart',weightRoll,cal,'lb','kcal');
  const protein=nd.map(d=>({x:d,y:rollingNutrition(d,7,'protein')})).filter(x=>x.y!=null); drawLineChart('proteinChart',[{name:'7-day protein',points:protein}],{unit:'g'});
  const weeks={}; state.workouts.filter(w=>w.date>=start).forEach(w=>{const d=dateObj(w.date); const first=new Date(d); first.setDate(d.getDate()-((d.getDay()+6)%7)); const k=isoDate(first); weeks[k]=(weeks[k]||0)+1;}); drawLineChart('trainingChart',[{name:'Workouts/week',points:Object.entries(weeks).sort().map(([x,y])=>({x,y}))}],{unit:''});
  drawExerciseProgress('');
}
function drawExerciseProgress(id){ if(!id){clearCanvas('exerciseChart','Select an exercise to view progression.');return;} const pts=state.workouts.slice().sort((a,b)=>a.date.localeCompare(b.date)).flatMap(w=>{const e=w.exercises?.find(x=>x.exerciseId===id); if(!e)return[]; return [{x:w.date,y:sum((e.sets||[]).map(s=>(Number(s.weight)||0)*(Number(s.reps)||0)))}];}); drawLineChart('exerciseChart',[{name:'Session volume',points:pts}],{unit:''}); }

function dataPage(){
  const goals=[...state.goals].sort((a,b)=>b.startDate.localeCompare(a.startDate));
  return `<div class="grid cols-2"><div class="card"><div class="card-head"><div><h3>Goals</h3><p>Effective-dated so old records use the goal that applied at the time.</p></div><button class="secondary small" id="addGoal">+ Goal</button></div>${goals.map(g=>`<div class="program-day"><div class="split"><strong>${fmtDate(g.startDate)}${g.endDate?` – ${fmtDate(g.endDate)}`:' onward'}</strong><button class="danger small" data-action="delete" data-target="goals:${g.id}">Delete</button></div><div class="muted">${g.calories||'—'} kcal · ${g.protein||'—'} g protein · ${g.weeklyWorkouts||'—'} workouts/week · target ${g.targetWeight||'—'} lb / ${g.targetBodyFat||'—'}% BF</div></div>`).join('')}</div>
  <div class="card"><div class="card-head"><div><h3>Preferences</h3><p>Stored only in this browser.</p></div></div><div class="form-grid"><div class="field span-6"><label>Weight unit</label><select id="weightUnit"><option value="lb" ${state.settings.weightUnit==='lb'?'selected':''}>lb</option><option value="kg" ${state.settings.weightUnit==='kg'?'selected':''}>kg</option></select></div><div class="field span-6"><label>Theme</label><select id="themeSelect"><option value="light" ${state.settings.theme==='light'?'selected':''}>Light</option><option value="dark" ${state.settings.theme==='dark'?'selected':''}>Dark</option></select></div></div></div></div>
  <div class="section-title"><div><h2>Exercise library</h2></div><button class="secondary small" id="addExercise">+ Exercise</button></div><div class="card flat"><div class="table-wrap"><table><thead><tr><th>Exercise</th><th>Muscle group</th><th></th></tr></thead><tbody>${state.exercises.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.muscleGroup)}</td><td><button class="danger small" data-action="delete" data-target="exercises:${e.id}">Delete</button></td></tr>`).join('')}</tbody></table></div></div>
  <div class="section-title"><div><h2>Data portability</h2><p>Full JSON backup plus individual CSV exports.</p></div></div><div class="card"><div class="actions"><button id="exportJson">Export full JSON</button><button class="secondary" id="importJson">Import / restore JSON</button><button class="secondary" id="exportNutrition">Nutrition CSV</button><button class="secondary" id="exportWorkouts">Workouts CSV</button><button class="secondary" id="loadSample">Load sample data</button><button class="danger" id="clearAll">Clear all data</button></div><input type="file" id="jsonFile" accept="application/json" class="hidden"></div>
  <div class="section-title"><div><h2>AI nutrition estimation</h2></div></div><div class="card"><p>The app always supports direct entry and local parsing. For broader natural-language estimation, run the included Node server with an <code>OPENAI_API_KEY</code> environment variable; the key remains server-side.</p><div id="aiConfigStatus" class="note">Checking configuration…</div></div>`;
}
function dataBind(){
  document.getElementById('weightUnit').onchange=e=>{state.settings.weightUnit=e.target.value;saveState();}; document.getElementById('themeSelect').onchange=e=>{state.settings.theme=e.target.value;saveState();render();};
  document.getElementById('addGoal').onclick=openGoalModal; document.getElementById('addExercise').onclick=openExerciseModal;
  document.getElementById('exportJson').onclick=()=>dl(`forge-backup-${isoDate()}.json`,JSON.stringify(state,null,2)); document.getElementById('importJson').onclick=()=>document.getElementById('jsonFile').click();
  document.getElementById('jsonFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const parsed=JSON.parse(await f.text()); if(!parsed.version)throw new Error(); if(confirm('Replace current data with this backup?')){state=parsed;saveState();render();}}catch{toast('That file is not a valid Forge backup.');}};
  document.getElementById('exportNutrition').onclick=()=>dl('nutrition.csv','date,meal,description,calories,protein,fat,carbs,fibre,source\n'+state.nutrition.map(r=>`${r.date},${csv(r.meal)},${csv(r.description)},${r.calories||0},${r.protein||0},${r.fat||0},${r.carbs||0},${r.fibre||0},${csv(r.source||'')}`).join('\n'),'text/csv');
  document.getElementById('exportWorkouts').onclick=()=>{const lines=['date,workout,program,exercise,set,weight,reps']; state.workouts.forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach((s,i)=>lines.push([w.date,csv(w.name),csv(programById(w.programId)?.name||''),csv(exerciseById(e.exerciseId)?.name||''),i+1,s.weight||'',s.reps||''].join(',')))));dl('workouts.csv',lines.join('\n'),'text/csv');};
  document.getElementById('loadSample').onclick=()=>{if(confirm('Load sample records into your current data?')){loadSampleData();saveState();render();}};
  document.getElementById('clearAll').onclick=()=>{if(confirm('Delete all tracker data in this browser? This cannot be undone unless you exported a backup.')){state=blankState();saveState();render();}};
  fetch('/api/status').then(r=>r.json()).then(x=>document.getElementById('aiConfigStatus').textContent=x.aiConfigured?`AI estimation is configured${x.model?` (${x.model})`:''}.`:'AI estimation is not configured. Local parsing and manual entry remain available.').catch(()=>document.getElementById('aiConfigStatus').textContent='AI status unavailable. Local parsing and manual entry remain available.');
}

function openModal(title,subtitle,html){ document.getElementById('modalTitle').textContent=title; document.getElementById('modalSubtitle').textContent=subtitle||''; document.getElementById('modalBody').innerHTML=html; document.getElementById('modalBackdrop').classList.remove('hidden'); }
function closeModal(){document.getElementById('modalBackdrop').classList.add('hidden');}

function openQuickLog(){
  const today=isoDate(), nt=nutritionTotals(today), w=state.weights.find(x=>x.date===today); openModal('Quick log','Weight, daily totals and workout access in one place.',`<div class="form-grid"><div class="field span-4"><label>Date</label><input id="quickDate" type="date" value="${today}"></div><div class="field span-4"><label>Weight (lb)</label><input id="quickWeight" type="number" step="0.1" value="${w?.weight||''}"></div><div class="field span-4"><label>Calories</label><input id="quickCalories" type="number" value="${nt.calories||''}"></div><div class="field span-4"><label>Protein (g)</label><input id="quickProtein" type="number" step="0.1" value="${nt.protein||''}"></div><div class="field span-8"><label>Food / meal description (optional)</label><input id="quickDesc" placeholder="Paste a short meal summary"></div></div><div class="actions" style="margin-top:14px"><button id="quickSave">Save</button><button class="secondary" id="quickWorkout">Start workout</button></div>`);
  document.getElementById('quickSave').onclick=()=>{const date=val('quickDate'),weight=numVal('quickWeight'),cal=numVal('quickCalories'),pro=numVal('quickProtein'),desc=val('quickDesc'); if(weight){const existing=state.weights.find(x=>x.date===date); if(existing)existing.weight=weight;else state.weights.push({id:uid('wt'),date,weight,notes:''});} const existingDaily=state.nutrition.find(x=>x.date===date&&x.meal==='Daily total'); if(cal!=null||pro!=null){const row={id:existingDaily?.id||uid('nut'),date,meal:'Daily total',description:desc||'Direct daily total',calories:cal||0,protein:pro||0,fat:0,carbs:0,fibre:0,source:'Direct entry'}; if(existingDaily)Object.assign(existingDaily,row); else state.nutrition.push(row);} recordBodyEstimate();saveState();closeModal();render();};
  document.getElementById('quickWorkout').onclick=()=>{closeModal();openWorkoutLogger();};
}

function openProgramBuilder(programId=null){
  const existing=programId?structuredClone(programById(programId)):null; const draft=existing||{id:uid('prog'),name:'',startDate:isoDate(),endDate:isoDate(new Date(Date.now()+90*86400000)),scheduling:'flexible',notes:'',days:[]};
  const renderBuilder=()=>{openModal(existing?'Edit program':'New program','Create reusable workout days for a defined period.',`<div class="form-grid"><div class="field span-6"><label>Program name</label><input id="progName" value="${esc(draft.name)}"></div><div class="field span-3"><label>Start date</label><input id="progStart" type="date" value="${draft.startDate}"></div><div class="field span-3"><label>End date</label><input id="progEnd" type="date" value="${draft.endDate}"></div><div class="field span-6"><label>Scheduling</label><select id="progScheduling"><option value="flexible" ${draft.scheduling==='flexible'?'selected':''}>Flexible sequence</option><option value="weekday" ${draft.scheduling==='weekday'?'selected':''}>Weekday-based</option></select></div><div class="field span-6"><label>Program notes</label><input id="progNotes" value="${esc(draft.notes||'')}"></div></div><div class="section-title"><div><h2>Workout days</h2></div><button class="secondary small" id="addProgramDay">+ Workout day</button></div><div id="draftDays">${draft.days.map((d,di)=>programDayEditor(d,di)).join('')||'<div class="empty-state">Add your first workout day.</div>'}</div><div class="actions" style="margin-top:16px"><button id="saveProgram">Save program</button></div>`); bindProgramDraft();};
  const syncHeader=()=>{draft.name=val('progName');draft.startDate=val('progStart');draft.endDate=val('progEnd');draft.scheduling=val('progScheduling');draft.notes=val('progNotes');};
  const bindProgramDraft=()=>{
    document.getElementById('addProgramDay').onclick=()=>{syncHeader();draft.days.push({id:uid('pday'),name:`Day ${draft.days.length+1}`,weekday:'',exercises:[]});renderBuilder();};
    document.querySelectorAll('[data-day-name]').forEach(e=>e.onchange=()=>draft.days[+e.dataset.dayName].name=e.value);
    document.querySelectorAll('[data-day-weekday]').forEach(e=>e.onchange=()=>draft.days[+e.dataset.dayWeekday].weekday=e.value);
    document.querySelectorAll('[data-add-prog-ex]').forEach(b=>b.onclick=()=>{syncHeader();draft.days[+b.dataset.addProgEx].exercises.push({id:uid('pex'),exerciseId:state.exercises[0]?.id||'',sets:3,repMin:8,repMax:10,targetWeight:null,rpe:'',notes:''});renderBuilder();});
    document.querySelectorAll('[data-remove-day]').forEach(b=>b.onclick=()=>{syncHeader();draft.days.splice(+b.dataset.removeDay,1);renderBuilder();});
    document.querySelectorAll('[data-pex]').forEach(e=>e.onchange=()=>{const [di,ei,key]=e.dataset.pex.split(':');let v=e.value;if(['sets','repMin','repMax','targetWeight'].includes(key))v=e.value===''?null:Number(e.value);draft.days[+di].exercises[+ei][key]=v;});
    document.querySelectorAll('[data-remove-pex]').forEach(b=>b.onclick=()=>{syncHeader();const [di,ei]=b.dataset.removePex.split(':');draft.days[+di].exercises.splice(+ei,1);renderBuilder();});
    document.getElementById('saveProgram').onclick=()=>{syncHeader();if(!draft.name.trim())return toast('Give the program a name.');if(draft.endDate<draft.startDate)return toast('End date must be after start date.');if(!draft.days.length)return toast('Add at least one workout day.'); if(existing){const ix=state.programs.findIndex(p=>p.id===existing.id);state.programs[ix]=draft;}else state.programs.push(draft);saveState();closeModal();render();};
  };
  renderBuilder();
}
function programDayEditor(d,di){return `<div class="program-day"><div class="form-grid"><div class="field span-6"><label>Workout name</label><input data-day-name="${di}" value="${esc(d.name)}"></div><div class="field span-4"><label>Weekday (optional)</label><select data-day-weekday="${di}"><option value="">Flexible</option>${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(x=>`<option ${d.weekday===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field span-2"><label>&nbsp;</label><button class="danger small" data-remove-day="${di}">Remove</button></div></div><div class="stack" style="margin-top:10px">${d.exercises.map((x,ei)=>`<div class="form-grid"><div class="field span-4"><label>Exercise</label><select data-pex="${di}:${ei}:exerciseId">${exerciseOptions(x.exerciseId)}</select></div><div class="field span-2"><label>Sets</label><input type="number" min="1" data-pex="${di}:${ei}:sets" value="${x.sets??3}"></div><div class="field span-2"><label>Rep min</label><input type="number" min="0" data-pex="${di}:${ei}:repMin" value="${x.repMin??8}"></div><div class="field span-2"><label>Rep max</label><input type="number" min="0" data-pex="${di}:${ei}:repMax" value="${x.repMax??10}"></div><div class="field span-2"><label>Target wt</label><input type="number" step="0.5" data-pex="${di}:${ei}:targetWeight" value="${x.targetWeight??''}"></div><div class="field span-8"><label>Notes / RPE</label><input data-pex="${di}:${ei}:notes" value="${esc(x.notes||'')}"></div><div class="field span-4"><label>&nbsp;</label><button class="danger small" data-remove-pex="${di}:${ei}">Remove exercise</button></div></div>`).join('')}</div><button class="secondary small" data-add-prog-ex="${di}" style="margin-top:10px">+ Exercise</button></div>`;}
function exerciseOptions(selected=''){return state.exercises.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(e=>`<option value="${e.id}" ${e.id===selected?'selected':''}>${esc(e.name)} — ${esc(e.muscleGroup)}</option>`).join('');}

function openWorkoutLogger(programId=null){
  const today=isoDate(); const active=programId?programById(programId):state.programs.find(p=>p.startDate<=today&&p.endDate>=today);
  if(active&&!programId){openModal('Start workout','Choose a workout from the active program or log an ad-hoc session.',`<div class="stack">${active.days.map(d=>`<button class="secondary" data-pick-day="${d.id}">${esc(d.name)}</button>`).join('')}<button class="secondary" data-pick-day="adhoc">Ad-hoc workout</button></div>`);document.querySelectorAll('[data-pick-day]').forEach(b=>b.onclick=()=>{const id=b.dataset.pickDay;closeModal();openWorkoutSession(active,id==='adhoc'?null:id);});return;}
  openWorkoutSession(active,null);
}
function openWorkoutSession(program,dayId){
  const day=program?.days.find(d=>d.id===dayId); const draft={id:uid('wo'),date:isoDate(),programId:program?.id||null,programDayId:day?.id||null,name:day?.name||'Workout',notes:'',exercises:(day?.exercises||[]).map(p=>({id:uid('wex'),exerciseId:p.exerciseId,originalExerciseId:p.exerciseId,planned:{sets:p.sets,repMin:p.repMin,repMax:p.repMax},updateProgram:false,sets:Array.from({length:p.sets||1},()=>({weight:p.targetWeight||'',reps:p.repMin||''}))}))};
  const renderSession=()=>{openModal('Log workout',program?`${program.name} · ${day?.name||'Ad hoc'}`:'Ad-hoc session',`<div class="form-grid"><div class="field span-4"><label>Date</label><input id="workoutDate" type="date" value="${draft.date}"></div><div class="field span-8"><label>Workout name</label><input id="workoutName" value="${esc(draft.name)}"></div></div><div class="stack" style="margin-top:14px">${draft.exercises.map((e,ei)=>workoutExerciseEditor(e,ei)).join('')||'<div class="empty-state">Add an exercise.</div>'}</div><div class="actions" style="margin-top:14px"><button class="secondary" id="addWorkoutExercise">+ Exercise</button><button id="saveWorkout">Save workout</button></div>`); bindSession();};
  const syncHead=()=>{draft.date=val('workoutDate');draft.name=val('workoutName');};
  const bindSession=()=>{document.getElementById('addWorkoutExercise').onclick=()=>{syncHead();draft.exercises.push({id:uid('wex'),exerciseId:state.exercises[0]?.id||'',originalExerciseId:null,planned:null,updateProgram:false,sets:[{weight:'',reps:''}]});renderSession();}; document.querySelectorAll('[data-wex-select]').forEach(el=>el.onchange=()=>{draft.exercises[+el.dataset.wexSelect].exerciseId=el.value;}); document.querySelectorAll('[data-wex-update]').forEach(el=>el.onchange=()=>draft.exercises[+el.dataset.wexUpdate].updateProgram=el.checked);
    document.querySelectorAll('[data-set-weight]').forEach(el=>el.oninput=()=>{const [ei,si]=el.dataset.setWeight.split(':');draft.exercises[+ei].sets[+si].weight=el.value;}); document.querySelectorAll('[data-set-reps]').forEach(el=>el.oninput=()=>{const [ei,si]=el.dataset.setReps.split(':');draft.exercises[+ei].sets[+si].reps=el.value;}); document.querySelectorAll('[data-add-set]').forEach(b=>b.onclick=()=>{syncHead();const ei=+b.dataset.addSet,last=draft.exercises[ei].sets.at(-1)||{weight:'',reps:''};draft.exercises[ei].sets.push({...last});renderSession();}); document.querySelectorAll('[data-remove-wex]').forEach(b=>b.onclick=()=>{syncHead();draft.exercises.splice(+b.dataset.removeWex,1);renderSession();}); document.querySelectorAll('[data-remove-set]').forEach(b=>b.onclick=()=>{syncHead();const [ei,si]=b.dataset.removeSet.split(':');draft.exercises[+ei].sets.splice(+si,1);renderSession();});
    document.getElementById('saveWorkout').onclick=()=>{syncHead(); if(!draft.exercises.length)return toast('Add at least one exercise.'); draft.exercises.forEach(e=>{e.sets=e.sets.map(s=>({weight:s.weight===''?null:Number(s.weight),reps:s.reps===''?null:Number(s.reps)})); if(e.updateProgram&&program&&day){const pex=day.exercises.find(x=>x.exerciseId===e.originalExerciseId);if(pex)pex.exerciseId=e.exerciseId;}}); state.workouts.push(draft);recordBodyEstimate();saveState();closeModal();render();}; };
  renderSession();
}
function workoutExerciseEditor(e,ei){const last=lastExercisePerformance(e.exerciseId);return `<div class="workout-exercise"><div class="form-grid"><div class="field span-6"><label>Exercise</label><select data-wex-select="${ei}">${exerciseOptions(e.exerciseId)}</select></div><div class="field span-4"><label>Plan / previous</label><div class="help" style="padding:10px 0">${e.planned?`${e.planned.sets} × ${e.planned.repMin}${e.planned.repMax!==e.planned.repMin?`–${e.planned.repMax}`:''}`:'Ad hoc'}${last?` · last ${last.sets.map(s=>`${s.weight||'BW'}×${s.reps}`).join(', ')}`:''}</div></div><div class="field span-2"><label>&nbsp;</label><button class="danger small" data-remove-wex="${ei}">Remove</button></div></div>${e.sets.map((s,si)=>`<div class="set-row"><span>Set ${si+1}</span><input type="number" step="0.5" placeholder="Weight" value="${s.weight??''}" data-set-weight="${ei}:${si}"><input type="number" min="0" placeholder="Reps" value="${s.reps??''}" data-set-reps="${ei}:${si}"><button class="ghost small" data-remove-set="${ei}:${si}">×</button></div>`).join('')}<div class="actions"><button class="ghost small" data-add-set="${ei}">+ Set</button>${e.originalExerciseId&&e.exerciseId!==e.originalExerciseId?`<label class="help"><input type="checkbox" data-wex-update="${ei}" ${e.updateProgram?'checked':''}> Update program going forward</label>`:''}</div></div>`;}

function openWeightImporter(){openModal('Paste historical weight','Paste rows such as “2026-09-01, 121.4” or tab-separated data.',`<div class="field"><label>Weight data</label><textarea id="weightPaste" placeholder="2026-09-01,121.4\n2026-09-02,120.9"></textarea></div><button id="importWeights" style="margin-top:12px">Import rows</button>`);document.getElementById('importWeights').onclick=()=>{const lines=val('weightPaste').split(/\n+/).filter(Boolean);let count=0,dupes=0;for(const line of lines){const parts=line.split(/[\t,]+/).map(x=>x.trim());const date=normalizeDate(parts[0]),weight=Number(parts[1]);if(!date||!(weight>0))continue;const ex=state.weights.find(w=>w.date===date);if(ex){dupes++;ex.weight=weight;ex.notes=parts.slice(2).join(' ');}else state.weights.push({id:uid('wt'),date,weight,notes:parts.slice(2).join(' ')});count++;}recordBodyEstimate();saveState();closeModal();toast(`Imported ${count} rows${dupes?` (${dupes} replaced)`:''}.`);render();};}
function normalizeDate(s){if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const d=new Date(s);return Number.isNaN(d.getTime())?null:isoDate(d);}
function openGoalModal(){openModal('Add goal period','Goals apply only during their effective dates.',`<div class="form-grid"><div class="field span-4"><label>Start date</label><input id="goalStart" type="date" value="${isoDate()}"></div><div class="field span-4"><label>End date (optional)</label><input id="goalEnd" type="date"></div><div class="field span-4"><label>Calories</label><input id="goalCalories" type="number"></div><div class="field span-4"><label>Protein (g)</label><input id="goalProtein" type="number"></div><div class="field span-4"><label>Target weight</label><input id="goalWeight" type="number" step="0.1"></div><div class="field span-4"><label>Target body fat %</label><input id="goalBf" type="number" step="0.1"></div><div class="field span-4"><label>Weekly workouts</label><input id="goalWorkouts" type="number"></div></div><button id="saveGoal" style="margin-top:12px">Save goal</button>`);document.getElementById('saveGoal').onclick=()=>{state.goals.push({id:uid('goal'),startDate:val('goalStart'),endDate:val('goalEnd'),calories:numVal('goalCalories'),protein:numVal('goalProtein'),targetWeight:numVal('goalWeight'),targetBodyFat:numVal('goalBf'),weeklyWorkouts:numVal('goalWorkouts')});saveState();closeModal();render();};}
function openExerciseModal(){openModal('Add exercise','Create an exercise for the reusable library.',`<div class="form-grid"><div class="field span-6"><label>Name</label><input id="exName"></div><div class="field span-6"><label>Muscle group</label><select id="exGroup">${['Glutes','Hamstrings','Quads','Calves','Back','Chest','Shoulders','Biceps','Triceps','Core','Full body','Cardio','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div></div><button id="saveExercise" style="margin-top:12px">Save exercise</button>`);document.getElementById('saveExercise').onclick=()=>{if(!val('exName').trim())return toast('Exercise name cannot be blank.');state.exercises.push({id:uid('ex'),name:val('exName').trim(),muscleGroup:val('exGroup')});saveState();closeModal();render();};}

function loadSampleData(){
  const ex=(name)=>state.exercises.find(e=>e.name===name)?.id; const start=new Date(); start.setDate(start.getDate()-70); let weight=125.4;
  for(let i=0;i<=70;i+=3){const d=new Date(start);d.setDate(start.getDate()+i);weight-=.025*3;state.weights.push({id:uid('wt'),date:isoDate(d),weight:+(weight+(Math.sin(i)*.45)).toFixed(1),notes:'Sample'});}
  state.dexas.push({id:uid('dexa'),date:'2025-11-14',totalMass:125.4,bodyFatPct:21.6,fatMass:27,leanMass:93.4,boneMass:5,bodyFatNoBone:21.6,provider:'Sample',notes:'Sample DEXA baseline'});
  const p={id:uid('prog'),name:'Sample Strength Block',startDate:lastNDaysStart(60),endDate:isoDate(new Date(Date.now()+35*86400000)),scheduling:'flexible',notes:'Sample program',days:[{id:uid('pday'),name:'Lower A',weekday:'',exercises:[{id:uid('pex'),exerciseId:ex('Romanian Deadlift'),sets:3,repMin:8,repMax:10},{id:uid('pex'),exerciseId:ex('Hip Thrust'),sets:4,repMin:8,repMax:10}]},{id:uid('pday'),name:'Upper A',weekday:'',exercises:[{id:uid('pex'),exerciseId:ex('Shoulder Press'),sets:3,repMin:8,repMax:10},{id:uid('pex'),exerciseId:ex('Lat Pulldown'),sets:3,repMin:10,repMax:12}]}]}; state.programs.push(p);
  for(let i=0;i<8;i++){const d=new Date();d.setDate(d.getDate()-(i*5+2));const day=p.days[i%2];state.workouts.push({id:uid('wo'),date:isoDate(d),programId:p.id,programDayId:day.id,name:day.name,exercises:day.exercises.map((x,j)=>({exerciseId:x.exerciseId,originalExerciseId:x.exerciseId,sets:Array.from({length:x.sets},(_,s)=>({weight:80+i*3+j*20,reps:8+(s%2)}))}))});}
  for(let i=0;i<24;i++){const d=new Date();d.setDate(d.getDate()-i);state.nutrition.push({id:uid('nut'),date:isoDate(d),meal:'Daily total',description:'Sample daily nutrition',calories:1650+(i%5)*35,protein:122+(i%4)*4,fat:55,carbs:160,fibre:22,source:'Sample'});}
  recordBodyEstimate();
}

function groupBy(arr,key){return arr.reduce((o,x)=>{const k=x[key];(o[k]??=[]).push(x);return o;},{});}
function val(id){return document.getElementById(id)?.value??'';}
function numVal(id){const v=val(id);return v===''?null:Number(v);}
function csv(s){return `"${String(s??'').replaceAll('"','""')}"`;}

function clearCanvas(id,msg){const c=document.getElementById(id);if(!c)return;setupCanvas(c);const ctx=c.getContext('2d');ctx.fillStyle=cssVar('--muted');ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(msg,c.width/2,c.height/2);}
function setupCanvas(c){const rect=c.getBoundingClientRect();const ratio=window.devicePixelRatio||1;c.width=Math.max(300,rect.width)*ratio;c.height=250*ratio;c.style.height='250px';const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);return {ctx,w:Math.max(300,rect.width),h:250};}
function drawLineChart(id,series,opts={}){
  const c=document.getElementById(id);if(!c)return; const nonempty=series.filter(s=>s.points?.length); if(!nonempty.length)return clearCanvas(id,'Not enough data yet.'); const {ctx,w,h}=setupCanvas(c); const pad={l:48,r:18,t:18,b:35}; const all=nonempty.flatMap(s=>s.points); const xs=all.map(p=>dateObj(p.x).getTime()),ys=all.map(p=>Number(p.y)).filter(Number.isFinite); if(!ys.length)return clearCanvas(id,'Not enough data yet.'); const xmin=Math.min(...xs),xmax=Math.max(...xs), ymin=Math.min(...ys),ymax=Math.max(...ys); const yr=(ymax-ymin)||1; const x=(v)=>pad.l+(dateObj(v).getTime()-xmin)/((xmax-xmin)||1)*(w-pad.l-pad.r); const y=(v)=>h-pad.b-(Number(v)-(ymin-yr*.12))/((ymax-ymin)+yr*.24)*(h-pad.t-pad.b);
  ctx.clearRect(0,0,w,h);ctx.strokeStyle=cssVar('--border');ctx.lineWidth=1;ctx.fillStyle=cssVar('--muted');ctx.font='11px system-ui';ctx.textAlign='right'; for(let i=0;i<4;i++){const v=ymin+(yr*i/3);const py=y(v);ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(w-pad.r,py);ctx.stroke();ctx.fillText(`${n(v)}${opts.unit||''}`,pad.l-7,py+4);} ctx.textAlign='center'; const dates=[xmin,xmin+(xmax-xmin)/2,xmax];dates.forEach(ms=>ctx.fillText(new Date(ms).toLocaleDateString(undefined,{month:'short',day:'numeric'}),pad.l+(ms-xmin)/((xmax-xmin)||1)*(w-pad.l-pad.r),h-10));
  nonempty.forEach((s,idx)=>{ctx.save();ctx.strokeStyle=cssVar('--accent-strong');ctx.globalAlpha=s.alpha??(idx===0?1:.5);ctx.lineWidth=idx===0?2.4:2;if(s.dashed)ctx.setLineDash([6,5]);ctx.beginPath();s.points.sort((a,b)=>a.x.localeCompare(b.x)).forEach((p,i)=>{const px=x(p.x),py=y(p.y);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.stroke();ctx.restore();});
}
function drawDualChart(id,left,right,leftUnit,rightUnit){
  const c=document.getElementById(id);if(!c)return;if(!left.length&&!right.length)return clearCanvas(id,'Not enough overlapping data yet.'); const {ctx,w,h}=setupCanvas(c),pad={l:48,r:52,t:18,b:35}; const allDates=[...left,...right].map(p=>dateObj(p.x).getTime());const xmin=Math.min(...allDates),xmax=Math.max(...allDates); const scale=(pts,side)=>{if(!pts.length)return null;const ys=pts.map(p=>+p.y),min=Math.min(...ys),max=Math.max(...ys),r=(max-min)||1;return {min,max,r,y:v=>h-pad.b-(+v-(min-r*.1))/((max-min)+r*.2)*(h-pad.t-pad.b),side};};const ls=scale(left,'left'),rs=scale(right,'right'); ctx.clearRect(0,0,w,h);ctx.strokeStyle=cssVar('--border');ctx.fillStyle=cssVar('--muted');ctx.font='11px system-ui';for(let i=0;i<4;i++){const py=pad.t+(h-pad.t-pad.b)*i/3;ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(w-pad.r,py);ctx.stroke();if(ls){const v=ls.max-(ls.max-ls.min)*i/3;ctx.textAlign='right';ctx.fillText(`${n(v)}${leftUnit}`,pad.l-6,py+4);}if(rs){const v=rs.max-(rs.max-rs.min)*i/3;ctx.textAlign='left';ctx.fillText(`${n(v,0)}${rightUnit}`,w-pad.r+6,py+4);}} const x=v=>pad.l+(dateObj(v).getTime()-xmin)/((xmax-xmin)||1)*(w-pad.l-pad.r); [[left,ls,1],[right,rs,.45]].forEach(([pts,s,alpha])=>{if(!s)return;ctx.save();ctx.strokeStyle=cssVar('--accent-strong');ctx.globalAlpha=alpha;ctx.lineWidth=2.2;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(x(p.x),s.y(p.y)):ctx.moveTo(x(p.x),s.y(p.y)));ctx.stroke();ctx.restore();});ctx.textAlign='center';[xmin,xmax].forEach(ms=>ctx.fillText(new Date(ms).toLocaleDateString(undefined,{month:'short',day:'numeric'}),x(isoDate(new Date(ms))),h-10));
}

const pageRenderers={dashboard:dashboardPage,workouts:workoutsPage,programs:programsPage,nutrition:nutritionPage,weight:weightPage,dexa:dexaPage,analytics:analyticsPage,data:dataPage};
const pageBinders={dashboard:dashboardBind,workouts:workoutsBind,programs:programsBind,nutrition:nutritionBind,weight:weightBind,dexa:dexaBind,analytics:analyticsBind,data:dataBind};
const pageAfterRender={dashboard:dashboardAfter,weight:weightAfter,dexa:dexaAfter,analytics:analyticsAfter};

// Global shell events
setTheme();
document.getElementById('modalClose').onclick=closeModal;
document.getElementById('modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal();};
document.getElementById('quickLogBtn').onclick=openQuickLog;
document.getElementById('themeToggle').onclick=()=>{state.settings.theme=state.settings.theme==='dark'?'light':'dark';saveState();render();};
document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
window.addEventListener('resize',()=>pageAfterRender[state.settings.page]?.());
render();
