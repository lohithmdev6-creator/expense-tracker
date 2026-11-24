import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import RangePick from '../components/RangePick'
import {db,getSetting,Txn} from '../db/db'
import {inr,rangeFor,dayLabel,prorate,today,addDays} from '../utils/format'
import {exportCsv,exportPdf} from '../utils/export'
const fmt=(s:string)=>new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})
const lbl=(day:string)=>day===today()?'Today':day===addDays(today(),-1)?'Yesterday':dayLabel(day)
const Stat=({l,v,c}:{l:string;v:string;c?:string})=><div><div className="text-xs text-slate-500 dark:text-slate-400">{l}</div><div className={`text-lg font-bold ${c||''}`}>{v}</div></div>
export default function Transactions({initial,onEdit,onBudgets}:{initial:any;onEdit:(t:Txn)=>void;onBudgets:()=>void}){
 const [range,setRange]=useState(initial?.range||'This month'),[kind,setKind]=useState(initial?.kind||'all'),[cat,setCat]=useState<number|''>(initial?.cat||'')
 const [q,setQ]=useState(''),[undo,setUndo]=useState<Txn|null>(null),[timer,setTimer]=useState<any>(),[view,setView]=useState<string|null>(null),[msg,setMsg]=useState('')
 const d=useLiveQuery(async()=>{const [a,b]=rangeFor(range)
  return {rows:await db.txns.where('date').between(a,b,true,true).reverse().sortBy('date'),cats:await db.categories.toArray(),types:await db.types.toArray(),veh:await db.vehicles.toArray(),drv:await db.drivers.toArray(),
   rules:await db.rules.toArray(),occ:await db.occ.where('status').equals('pending').toArray(),budget:await getSetting<number>('budget',0)}},[range])
 if(!d)return null
 const [a,b]=rangeFor(range)
 const meta=(t:Txn)=>{const c=d.cats.find(x=>x.id===t.categoryId),ty=d.types.find(x=>x.id===t.typeId)
  return {icon:c?.icon||(t.kind==='income'?'💰':'🧾'),title:ty?.name||c?.name||(t.kind==='income'?'Income':'Uncategorised'),
   sub:[ty&&c?c.name:'',t.paymentMode,d.veh.find(x=>x.id===t.vehicleId)?.name,d.drv.find(x=>x.id===t.driverId)?.name,t.litres?`${t.litres} L`:''].filter(Boolean).join(' · ')}}
 const rows=d.rows.filter(t=>{const m=meta(t);return (kind==='all'||t.kind===kind)&&(!cat||t.categoryId===cat)&&(!q||`${t.reason||''} ${(t.tags||[]).join(' ')} ${m.title} ${m.sub}`.toLowerCase().includes(q.toLowerCase()))})
 const net=(x:Txn[])=>x.reduce((s,t)=>s+(t.kind==='expense'?-t.amount:t.amount),0)
 const groups:Record<string,Txn[]>={};rows.forEach(t=>(groups[t.date]??=[]).push(t))
 const catRows=d.rows.filter(t=>!cat||t.categoryId===cat),sum=(k:string)=>catRows.filter(t=>t.kind===k).reduce((s,t)=>s+t.amount,0)
 const spent=sum('expense'),income=sum('income'),monthly=cat?(d.cats.find(c=>c.id===cat)?.budget||0):d.budget,pr=monthly?prorate(monthly,a,b):null,left=pr?pr.amount-spent:0,pct=pr?spent/pr.amount*100:0
 const dues=d.occ.filter(o=>o.dueDate>=a&&o.dueDate<=b).reduce((s,o)=>{const r=d.rules.find(x=>x.id===o.ruleId);return s+(r&&r.kind==='expense'&&(!cat||r.categoryId===cat)?r.amount:0)},0)
 const stats:[string,string,string?][]=pr?[['Budget',inr(pr.amount)],['Spent',inr(spent)],[left>=0?'Remaining':'Over by',inr(Math.abs(left)),left<0?'text-out':'text-inc']]:[['Spent',inr(spent)],...(income>0?[['Income',inr(income),'text-inc'],['Net',inr(income-spent)]] as [string,string,string?][]:[])]
 const ctx={cats:d.cats,types:d.types,veh:d.veh,drv:d.drv},file=`transactions-${a}_to_${b}`,filtered=kind!=='all'||!!cat||!!q
 const clear=()=>{setKind('all');setCat('');setQ('')}
 const filt=`Period: ${a} to ${b}${kind!=='all'?` | ${kind==='expense'?'Expenses':'Income'} only`:''}${cat?` | Category: ${d.cats.find(c=>c.id===cat)?.name}`:''}${q?` | Search: "${q}"`:''} | ${rows.length} transactions`
 const out=async(f:()=>Promise<any>)=>{try{setMsg('');await f()}catch(e){setMsg('Export failed: '+e)}}
 const del=async(t:Txn)=>{if(!confirm('Delete this transaction?'))return
  try{await db.txns.delete(t.id!);setUndo(t);clearTimeout(timer);setTimer(setTimeout(()=>setUndo(null),5000))}catch(e){alert('Delete failed: '+e)}}
 return <div className="space-y-3">
  {kind!=='income'&&(spent>0||income>0||pr)&&<div className="card space-y-3">
   <div className="flex items-baseline justify-between"><div className="font-semibold">{cat?`${d.cats.find(c=>c.id===cat)?.icon||''} ${d.cats.find(c=>c.id===cat)?.name}`:'Spending'}</div><div className="text-xs text-slate-500 dark:text-slate-400">{range.startsWith('custom:')?'':range+' · '}{fmt(a)} – {fmt(b)}</div></div>
   <div className="grid gap-2 text-center" style={{gridTemplateColumns:`repeat(${stats.length},1fr)`}}>{stats.map(([l,v,c])=><Stat key={l} l={l} v={v} c={c}/>)}</div>
   {pr&&<div className="h-2 rounded-full bg-slate-500/15"><div className="h-2 rounded-full" style={{width:`${Math.min(pct,100)}%`,background:pct>100?'#F43F5E':pct>80?'#F59E0B':'#6366F1'}}/></div>}
   {pr&&dues>0&&<p className="text-xs text-slate-500 dark:text-slate-400">{inr(dues)} of upcoming bills still to pay in this period{left-dues>=0?`, leaving ${inr(left-dues)}.`:`, which would put you ${inr(dues-left)} over budget.`}</p>}
   {pr&&income>0&&<p className="text-xs text-slate-500 dark:text-slate-400">Income {inr(income)} · Net {inr(income-spent)}</p>}
   {pr?.partial&&<p className="text-xs text-slate-500 dark:text-slate-400">Budget is prorated for this period.</p>}
   {!pr&&<button onClick={onBudgets} className="min-h-[44px] text-left text-sm font-medium text-brand">Set a budget to see what's remaining</button>}</div>}
  <input className="inp" placeholder="Search reason, tags, category or type" aria-label="Search" value={q} onChange={e=>setQ(e.target.value)}/>
  <div role="tablist" className="grid grid-cols-3 rounded-xl bg-slate-200/70 p-1 text-sm dark:bg-white/10">{[['all','All'],['expense','Expenses'],['income','Income']].map(([k,l])=><button key={k} role="tab" aria-selected={kind===k} onClick={()=>setKind(k)} className={`min-h-[40px] rounded-lg font-medium ${kind===k?'bg-white shadow-sm dark:bg-white/20':'text-slate-500 dark:text-slate-400'}`}>{l}</button>)}</div>
  <div className="flex items-start gap-2"><RangePick value={range} onChange={setRange}/>
   <select aria-label="Category" className="inp flex-1" value={cat} onChange={e=>setCat(e.target.value?+e.target.value:'')}><option value="">All categories</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
  <div className="flex items-center justify-between gap-2"><div className="text-sm text-slate-500 dark:text-slate-400">{rows.length} entries{filtered&&<button onClick={clear} className="ml-2 min-h-[40px] text-brand">Clear filters</button>}</div>
   <div className="flex gap-2"><button disabled={!rows.length} onClick={()=>out(()=>exportCsv(rows,ctx,file))} className="btn bg-white !min-h-[40px] text-sm disabled:opacity-40 dark:bg-white/10">CSV</button>
    <button disabled={!rows.length} onClick={()=>out(()=>exportPdf(rows,ctx,filt,file))} className="btn bg-white !min-h-[40px] text-sm disabled:opacity-40 dark:bg-white/10">PDF</button></div></div>
  {msg&&<p role="alert" className="text-sm text-red-500">{msg}</p>}
  {rows.length===0&&<div className="card space-y-2 text-center text-slate-500">{filtered?'Nothing matches these filters.':'No transactions in this period. Tap + to add one.'}{filtered&&<div><button onClick={clear} className="min-h-[44px] font-medium text-brand">Clear filters</button></div>}</div>}
  {Object.entries(groups).map(([day,ts])=><section key={day}>
   <div className="mb-1 flex justify-between text-sm font-semibold"><span>{lbl(day)}</span><span className="text-slate-500">{inr(net(ts))}</span></div>
   <div className="card divide-y divide-slate-100 p-0 dark:divide-white/10">{ts.map(t=>{const m=meta(t);return <div key={t.id} className="flex items-center">
    <button onClick={()=>onEdit(t)} className="flex min-h-[64px] min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2 text-left">
     <span className="min-w-0"><div className="font-medium">{m.icon} {m.title}</div>
      {m.sub&&<div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.sub}</div>}
      {t.reason&&<div className="truncate text-xs">{t.reason}</div>}
      {!!t.tags?.length&&<div className="truncate text-xs text-brand">{t.tags.map(x=>'#'+x).join(' ')}</div>}</span>
     <span className={`shrink-0 font-semibold ${t.kind==='expense'?'text-out':'text-inc'}`}>{t.kind==='expense'?'−':'+'}{inr(t.amount)}</span></button>
    {t.receipt&&<button aria-label="View receipt" onClick={()=>setView(t.receipt!)} className="shrink-0"><img src={t.receipt} alt="Receipt thumbnail" className="h-11 w-11 rounded-md object-cover"/></button>}
    <button aria-label="Delete" onClick={()=>del(t)} className="h-12 w-12 shrink-0 text-lg opacity-40">🗑️</button></div>})}</div></section>)}
  {undo&&<div className="fixed bottom-24 left-1/2 z-40 flex w-[90%] max-w-sm -translate-x-1/2 items-center justify-between rounded-lg bg-ink p-3 text-white"><span>Transaction deleted</span>
   <button className="font-bold text-indigo-300" onClick={async()=>{await db.txns.put(undo);setUndo(null)}}>Undo</button></div>}
  {view&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={()=>setView(null)}><button aria-label="Close" className="absolute right-3 top-3 h-12 w-12 text-2xl text-white">✕</button><img src={view} alt="Receipt" className="max-h-full max-w-full"/></div>}
 </div>}
