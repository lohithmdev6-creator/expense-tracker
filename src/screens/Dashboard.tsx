import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {PieChart,Pie,Cell,ResponsiveContainer,Tooltip,AreaChart,Area,XAxis} from 'recharts'
import RangePick from '../components/RangePick'
import {db,getSetting} from '../db/db'
import {inr,rangeFor,RANGES,daysBetween,addDays,today,iso} from '../utils/format'
const Kpi=({i,t,v,s,tone,onClick}:any)=><button onClick={onClick} className="card text-left"><div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/10 text-sm">{i}</span>{t}</div><div className={`mt-1 text-xl font-bold ${tone||''}`}>{v}</div>{s&&<div className="text-xs text-slate-500 dark:text-slate-400">{s}</div>}</button>
const Ring=({pct}:{pct:number})=>{const r=34,c=2*Math.PI*r,p=Math.min(Math.max(pct,0),100),col=pct>100?'#FDA4AF':pct>80?'#FDE68A':'#FFFFFF'
 return <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0" role="img" aria-label={`${Math.round(pct)} percent`}><circle cx="42" cy="42" r={r} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="8"/><circle cx="42" cy="42" r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-p/100)} transform="rotate(-90 42 42)"/><text x="42" y="47" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{Math.round(pct)}%</text></svg>}
const Sec=({t,children}:any)=><div className="card"><div className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{t}</div>{children}</div>
export default function Dashboard({onOpen,onBudgets}:{onOpen:(f:any)=>void;onBudgets:()=>void}){
 const [range,setRange]=useState('This month'),[cat,setCat]=useState<number|''>(''),[more,setMore]=useState(false)
 const d=useLiveQuery(async()=>{
  const [from,to]=rangeFor(range),end=to<today()?to:today(),n=Math.max(1,daysBetween(from,end)+1),len=daysBetween(from,to)+1,now=new Date()
  const get=async(a:string,b:string)=>(await db.txns.where('date').between(a,b,true,true).toArray()).filter(t=>!cat||t.categoryId===cat)
  return {n,cur:await get(from,to),prev:await get(addDays(from,-len),addDays(from,-1)),six:await get(iso(new Date(now.getFullYear(),now.getMonth()-5,1)),today()),
   cats:await db.categories.toArray(),types:await db.types.toArray(),budget:await getSetting<number>('budget',0),last:await getSetting<number|null>('lastBackupAt',null),all:await db.txns.count(),rules:await db.rules.toArray(),occ:await db.occ.where('status').equals('pending').toArray()}
 },[range,cat])
 if(!d)return null
 const sum=(a:any[],k:string)=>a.filter(t=>t.kind===k).reduce((s,t)=>s+t.amount,0)
 const spent=sum(d.cur,'expense'),inc=sum(d.cur,'income'),pSpent=sum(d.prev,'expense'),exp=d.cur.filter(t=>t.kind==='expense')
 const [f0,t0]=rangeFor(range),due=d.occ.filter(o=>o.dueDate>=f0&&o.dueDate<=t0).reduce((s,o)=>{const r=d.rules.find(x=>x.id===o.ruleId);return s+(r&&r.kind==='expense'&&(!cat||r.categoryId===cat)?r.amount:0)},0),fixed=exp.filter(t=>t.recurringRuleId).reduce((s,t)=>s+t.amount,0)
 const big=exp.reduce((m,t)=>!m||t.amount>m.amount?t:m,null as any),pct=pSpent?Math.round((spent-pSpent)/pSpent*100):null
 const cn=(id:any)=>d.cats.find(c=>c.id===id)?.name||'Uncategorised',tn=(id:any)=>d.types.find(x=>x.id===id)?.name||'Other'
 const grp=(f:(t:any)=>any)=>{const m:Record<string,number>={};exp.forEach(t=>{const k=String(f(t)??0);m[k]=(m[k]||0)+t.amount});return Object.entries(m).sort((a,b)=>b[1]-a[1])}
 const pie=grp(t=>t.categoryId).map(([k,v])=>({id:k,name:cn(+k||undefined),value:v,fill:d.cats.find(c=>String(c.id)===k)?.colour||'#94A3B8',icon:d.cats.find(c=>String(c.id)===k)?.icon||'📦'}))
 const tops=grp(t=>t.typeId).slice(0,5),topMax=tops[0]?.[1]||1
 const incBy:Record<string,number>={};d.cur.filter(t=>t.kind==='income'&&t.categoryId).forEach(t=>{incBy[t.categoryId!]=(incBy[t.categoryId!]||0)+t.amount})
 const incList=Object.entries(incBy).sort((a,b)=>b[1]-a[1])
 const chips=[...pie.map(p=>({id:p.id,name:p.name,icon:p.icon,spent:p.value,earned:incBy[p.id]||0})),...d.cats.filter(c=>incBy[c.id!]&&!pie.some(p=>p.id===String(c.id))).map(c=>({id:String(c.id),name:c.name,icon:c.icon,spent:0,earned:incBy[c.id!]}))]
 const bud=d.cats.filter(c=>c.budget&&(!cat||c.id===cat)).map(c=>({...c,budget:c.budget!,spent:exp.filter(t=>t.categoryId===c.id).reduce((s,t)=>s+t.amount,0)}))
 const now=new Date(),dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()
 const forecast=due>0?spent+due:null
 const months=[...Array(6)].map((_,i)=>{const m=new Date(now.getFullYear(),now.getMonth()-5+i,1);return {k:`${m.getFullYear()}-${m.getMonth()}`,x:m.toLocaleString('en-IN',{month:'short'}),spent:0,income:0}})
 d.six.forEach(t=>{const m=new Date(t.date+'T00:00:00'),r=months.find(x=>x.k===`${m.getFullYear()}-${m.getMonth()}`);if(r)t.kind==='expense'?r.spent+=t.amount:r.income+=t.amount})
 const useBudget=range==='This month'&&d.budget>0,ring=useBudget?spent/d.budget*100:inc>0?(inc-spent)/inc*100:null
 const vc=d.cats.find(c=>c.isVehicle||c.name==='Vehicle')?.id,vt=exp.filter(t=>t.categoryId===vc),fuel=vt.filter(t=>tn(t.typeId)==='Fuel').reduce((s,t)=>s+t.amount,0)
 const od=vt.filter(t=>t.odometer).sort((a,b)=>a.odometer!-b.odometer!),km=od.length>1?od[od.length-1].odometer!-od[0].odometer!:0
 const lit=od.slice(1).reduce((s,t)=>s+(t.litres||0),0),stale=d.all>0&&(!d.last||Date.now()-d.last>14*864e5)
 const f=(x:any={})=>()=>onOpen({range,cat:cat||undefined,...x})
 return <div className="space-y-3">
  {stale&&<div className="rounded-xl bg-amber-400/15 p-3 text-sm text-amber-600 dark:text-amber-300">{d.last?`Last backup: ${Math.floor((Date.now()-d.last)/864e5)} days ago.`:'No backup yet.'} Back up from More.</div>}
  <div className="flex items-start gap-2"><RangePick value={range} onChange={setRange}/>
   <select aria-label="Category" className="inp" value={cat} onChange={e=>setCat(e.target.value?+e.target.value:'')}><option value="">All categories</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
  {(cat!==''||range!=='This month')&&<button className="text-sm text-brand underline" onClick={()=>{setRange('This month');setCat('')}}>Reset filters</button>}
  {d.cur.length===0?<div className="card text-center text-slate-500">Nothing here yet. Tap + to add your first expense or income.</div>:<>
  <div className="flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-500/20">
   <div><div className="text-sm text-white/75">{inc>0?'Left to spend':'Spent'}</div><div className="text-4xl font-bold">{inr(inc>0?inc-spent-due:spent)}</div>
    <div className="text-xs text-white/75">{inc>0?`${inr(inc)} in − ${inr(spent)} out${due?` − ${inr(due)} upcoming`:''}`:'No income logged in this range'}</div></div>
   {ring!==null&&<div className="text-center"><Ring pct={ring}/><div className="text-xs text-white/75">{useBudget?'of budget':'saved'}</div></div>}</div>
  {pie.length>1&&spent>0&&<div className="rounded-xl bg-indigo-500/10 p-3 text-sm">{pie[0].name} is your biggest cost: {Math.round(pie[0].value/spent*100)}% of spending.</div>}
  {chips.length>0&&<div className="flex gap-2 overflow-x-auto pb-1">{chips.map(p=><button key={p.id} onClick={()=>onOpen({range,cat:+p.id||undefined})} className="card flex shrink-0 items-center gap-2 py-2"><span className="text-2xl">{p.icon}</span><span className="text-left text-sm">{p.name}{p.spent>0&&<div className="font-bold">{inr(p.spent)}</div>}{p.earned>0&&<div className="text-xs font-semibold text-inc">+{inr(p.earned)}</div>}</span></button>)}</div>}
  <div className="grid grid-cols-2 gap-3">
   {spent>0&&<Kpi i="💸" t="Spent" v={inr(spent)} s={pct!==null?`${pct>=0?'▲':'▼'} ${Math.abs(pct)}% vs previous`:undefined} tone="text-out" onClick={f({kind:'expense'})}/>}
   {inc>0&&<Kpi i="💰" t="Income" v={inr(inc)} tone="text-inc" onClick={f({kind:'income'})}/>}
   {inc>0&&<Kpi i="📈" t="Savings rate" v={`${Math.round((inc-spent)/inc*100)}%`} s={`Net ${inr(inc-spent)}`}/>}
   {forecast&&<Kpi i="🔮" t="Forecast" v={inr(forecast)} s={`${inr(spent)} spent + ${inr(due)} upcoming${useBudget?(forecast>d.budget?' · over budget':' · within budget'):''}`}/>}
   {more&&<>
   {spent>0&&<Kpi i="📅" t="Avg per day" v={inr(Math.round(spent/d.n))}/>}
   {fixed>0&&<Kpi i="📌" t="Fixed costs" v={inr(fixed)} s={`${Math.round(fixed/spent*100)}% of spending, rest variable`}/>}
   {big&&<Kpi i="🏆" t="Biggest expense" v={inr(big.amount)} s={big.reason||tn(big.typeId)} onClick={f({kind:'expense'})}/>}
   {pie[0]&&<Kpi i="🧩" t="Top category" v={pie[0].name} s={inr(pie[0].value)} onClick={()=>onOpen({range,cat:+pie[0].id||undefined,kind:'expense'})}/>}
   <Kpi i="🧾" t="Transactions" v={String(d.cur.length)} onClick={f()}/></>}</div>
  <button className="min-h-[44px] w-full text-sm font-medium text-brand" onClick={()=>setMore(!more)}>{more?'Show fewer insights':'Show more insights'}</button>
  {range==='This month'&&!d.cats.some(c=>c.budget)&&<button onClick={onBudgets} className="card w-full text-left text-sm"><span className="font-medium">Set category budgets</span><span className="block text-slate-500 dark:text-slate-400">Track Vehicle, Home and more against a monthly limit.</span></button>}
  {(range==='This month'||range==='Last month')&&bud.length>0&&<Sec t="Category budgets"><div className="space-y-3">{bud.map(b=>{const p=b.spent/b.budget*100,left=b.budget-b.spent;return <div key={b.id}><div className="flex justify-between text-sm"><span>{b.icon} {b.name}</span><span className="text-slate-500 dark:text-slate-400">{inr(b.spent)} / {inr(b.budget)}</span></div>
   <div className="mt-1 h-2 rounded-full bg-slate-500/15"><div className="h-2 rounded-full" style={{width:`${Math.min(p,100)}%`,background:p>100?'#F43F5E':p>80?'#F59E0B':'#6366F1'}}/></div>
   <div className={`mt-0.5 text-xs ${left<0?'text-out':'text-slate-500 dark:text-slate-400'}`}>{left>=0?`${inr(left)} left`:`${inr(-left)} over`}</div></div>})}</div><button className="mt-3 min-h-[44px] text-sm font-medium text-brand" onClick={onBudgets}>Edit budgets</button></Sec>}
  {vt.length>0&&<Sec t="🚗 Vehicle"><div className="grid grid-cols-2 gap-3 text-sm">
   <div>Running cost<div className="text-lg font-bold">{inr(vt.reduce((s,t)=>s+t.amount,0))}</div></div>
   {fuel>0&&<div>Fuel spend<div className="text-lg font-bold">{inr(fuel)}</div></div>}
   {km>0&&<div>Cost per km<div className="text-lg font-bold">{inr(Math.round(vt.reduce((s,t)=>s+t.amount,0)/km*100)/100)}</div></div>}
   {km>0&&lit>0&&<div>Mileage<div className="text-lg font-bold">{(km/lit).toFixed(1)} km/l</div></div>}</div></Sec>}
  <Sec t="Last 6 months"><div className="h-36"><ResponsiveContainer><AreaChart data={months}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366F1" stopOpacity=".5"/><stop offset="1" stopColor="#A5B4FC" stopOpacity="0"/></linearGradient></defs>
   <XAxis dataKey="x" tickLine={false} axisLine={false} stroke="#94A3B8"/><Tooltip formatter={(v:number)=>inr(v)}/><Area dataKey="spent" name="Spent" stroke="#6366F1" strokeWidth={2} fill="url(#g)"/><Area dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fill="none"/></AreaChart></ResponsiveContainer></div></Sec>
  {more&&pie.length>0&&<Sec t="By category"><div className="h-44"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={44} outerRadius={72} stroke="none" onClick={(p:any)=>onOpen({range,cat:+p.id||undefined,kind:'expense'})}>{pie.map(p=><Cell key={p.id} fill={p.fill}/>)}</Pie><Tooltip formatter={(v:number)=>inr(v)}/></PieChart></ResponsiveContainer></div></Sec>}
  {more&&incList.length>0&&<Sec t="Income by category">{incList.map(([k,v])=><div key={k} className="mb-2 text-sm"><div className="flex justify-between"><span>{cn(+k)}</span><span>{inr(v)}</span></div><div className="h-2 rounded-full bg-slate-500/15"><div className="h-2 rounded-full bg-inc" style={{width:`${v/incList[0][1]*100}%`}}/></div></div>)}</Sec>}
  {more&&tops.length>0&&<Sec t="Top types">{tops.map(([k,v])=><div key={k} className="mb-2 text-sm"><div className="flex justify-between"><span>{tn(+k||undefined)}</span><span>{inr(v)}</span></div><div className="h-2 rounded-full bg-slate-500/15"><div className="grad h-2 rounded-full" style={{width:`${v/topMax*100}%`}}/></div></div>)}</Sec>}
  </>}
 </div>}
