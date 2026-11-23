import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {PieChart,Pie,Cell,ResponsiveContainer,Tooltip,BarChart,Bar,XAxis} from 'recharts'
import {db,getSetting} from '../db/db'
import {inr,rangeFor,RANGES,daysBetween,addDays,today} from '../utils/format'
const Card=({t,v,s,onClick}:{t:string;v:string;s?:string;onClick?:()=>void})=>
 <button onClick={onClick} className="card text-left"><div className="text-sm text-slate-500">{t}</div><div className="text-xl font-bold">{v}</div>{s&&<div className="text-xs text-slate-500">{s}</div>}</button>
export default function Dashboard({onOpen}:{onOpen:(f:any)=>void}){
 const [range,setRange]=useState('This month'),[cat,setCat]=useState<number|''>('')
 const d=useLiveQuery(async()=>{
  const [from,to]=rangeFor(range),end=to<today()?to:today(),n=Math.max(1,daysBetween(from,end)+1),len=daysBetween(from,to)+1
  const get=async(a:string,b:string)=>(await db.txns.where('date').between(a,b,true,true).toArray()).filter(t=>!cat||t.categoryId===cat)
  return {from,to,n,len,cur:await get(from,to),prev:await get(addDays(from,-len),addDays(from,-1)),cats:await db.categories.toArray(),last:await getSetting<number|null>('lastBackupAt',null),all:await db.txns.count()}
 },[range,cat])
 if(!d)return null
 const sum=(a:any[],k:string)=>a.filter(t=>t.kind===k).reduce((s,t)=>s+t.amount,0)
 const spent=sum(d.cur,'expense'),inc=sum(d.cur,'income'),pSpent=sum(d.prev,'expense')
 const exp=d.cur.filter(t=>t.kind==='expense'),big=exp.reduce((m,t)=>!m||t.amount>m.amount?t:m,null as any)
 const by:Record<string,number>={};exp.forEach(t=>{const k=String(t.categoryId??0);by[k]=(by[k]||0)+t.amount})
 const name=(id:string)=>d.cats.find(c=>String(c.id)===id)?.name||'Uncategorised'
 const pie=Object.entries(by).map(([k,v])=>({name:name(k),value:v,id:k,fill:d.cats.find(c=>String(c.id)===k)?.colour||'#94A3B8'})).sort((a,b)=>b.value-a.value)
 const pct=pSpent?Math.round((spent-pSpent)/pSpent*100):null
 const wk=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>({x,v:0}));exp.forEach(t=>{wk[(new Date(t.date+'T00:00:00').getDay()+6)%7].v+=t.amount})
 const days=daysBetween(today(),'2100-01-01')&&new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()
 const forecast=range==='This month'&&spent>0?Math.round(spent/d.n*days):null
 const stale=d.all>0&&(!d.last||Date.now()-d.last>14*864e5)
 const f=(extra:any={})=>()=>onOpen({range,cat:cat||undefined,...extra})
 return <div className="space-y-3">
  {stale&&<div className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">{d.last?`Last backup: ${Math.floor((Date.now()-d.last)/864e5)} days ago.`:'No backup yet.'} Back up from More.</div>}
  <div className="flex gap-2"><select aria-label="Date range" className="inp" value={range} onChange={e=>setRange(e.target.value)}>{RANGES.map(r=><option key={r}>{r}</option>)}</select>
   <select aria-label="Category" className="inp" value={cat} onChange={e=>setCat(e.target.value?+e.target.value:'')}><option value="">All categories</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
  {(cat!==''||range!=='This month')&&<button className="text-sm text-brand underline" onClick={()=>{setRange('This month');setCat('')}}>Reset filters</button>}
  {d.cur.length===0?<div className="card text-center text-slate-500">Nothing here yet. Tap + to add your first expense or income.</div>:<>
  {inc>0&&<div className="card bg-brand text-white dark:bg-brand"><div className="text-sm opacity-80">Left to spend</div><div className="text-3xl font-bold">{inr(inc-spent)}</div><div className="text-xs opacity-80">{inr(inc)} income − {inr(spent)} spent</div></div>}
  <div className="grid grid-cols-2 gap-3">
   {spent>0&&<Card t="Spent" v={inr(spent)} s={pct!==null?`${pct>=0?'▲':'▼'} ${Math.abs(pct)}% vs previous period`:undefined} onClick={f({kind:'expense'})}/>}
   {inc>0&&<Card t="Income" v={inr(inc)} onClick={f({kind:'income'})}/>}
   {inc>0&&<Card t="Savings rate" v={`${Math.round((inc-spent)/inc*100)}%`} s={`Net ${inr(inc-spent)}`}/>}
   {forecast&&<Card t="Month-end forecast" v={inr(forecast)} s="At your daily average"/>}
   {spent>0&&<Card t="Avg per day" v={inr(Math.round(spent/d.n))}/>}
   {big&&<Card t="Biggest expense" v={inr(big.amount)} s={big.reason||name(String(big.categoryId??0))} onClick={f({kind:'expense'})}/>}
   {pie[0]&&<Card t="Biggest category" v={name(pie[0].id)} s={inr(pie[0].value)} onClick={()=>onOpen({range,cat:+pie[0].id||undefined,kind:'expense'})}/>}
  </div>
  {pie.length>1&&spent>0&&<p className="text-sm text-slate-600 dark:text-slate-300">{pie[0].name} is your biggest cost: {Math.round(pie[0].value/spent*100)}%</p>}
  {pie.length>0&&<div className="card"><div className="mb-1 text-sm text-slate-500">By category</div><div className="h-48"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={45} outerRadius={75} onClick={(p:any)=>onOpen({range,cat:+p.id||undefined,kind:'expense'})}>{pie.map(p=><Cell key={p.id} fill={p.fill}/>)}</Pie><Tooltip formatter={(v:number)=>inr(v)}/></PieChart></ResponsiveContainer></div></div>}
  {spent>0&&<div className="card"><div className="mb-1 text-sm text-slate-500">By weekday</div><div className="h-32"><ResponsiveContainer><BarChart data={wk}><XAxis dataKey="x" tickLine={false} axisLine={false}/><Tooltip formatter={(v:number)=>inr(v)}/><Bar dataKey="v" fill="#0F766E" radius={4}/></BarChart></ResponsiveContainer></div></div>}
  </>}
 </div>}
