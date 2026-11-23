import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import RangePick from '../components/RangePick'
import {db,Txn} from '../db/db'
import {inr,rangeFor,dayLabel} from '../utils/format'
import {exportCsv,exportPdf} from '../utils/export'
export default function Transactions({initial,onEdit}:{initial:any;onEdit:(t:Txn)=>void}){
 const [range,setRange]=useState(initial?.range||'This month'),[kind,setKind]=useState(initial?.kind||'all'),[cat,setCat]=useState<number|''>(initial?.cat||'')
 const [q,setQ]=useState(''),[undo,setUndo]=useState<Txn|null>(null),[timer,setTimer]=useState<any>(),[view,setView]=useState<string|null>(null),[msg,setMsg]=useState('')
 const d=useLiveQuery(async()=>{const [a,b]=rangeFor(range)
  return {rows:await db.txns.where('date').between(a,b,true,true).reverse().sortBy('date'),cats:await db.categories.toArray(),types:await db.types.toArray(),veh:await db.vehicles.toArray(),drv:await db.drivers.toArray()}},[range])
 if(!d)return null
 const meta=(t:Txn)=>{const c=d.cats.find(x=>x.id===t.categoryId),ty=d.types.find(x=>x.id===t.typeId)
  return {icon:c?.icon||(t.kind==='income'?'💰':'🧾'),title:ty?.name||c?.name||(t.kind==='income'?'Income':'Uncategorised'),
   sub:[ty&&c?c.name:'',t.paymentMode,d.veh.find(x=>x.id===t.vehicleId)?.name,d.drv.find(x=>x.id===t.driverId)?.name,t.litres?`${t.litres} L`:''].filter(Boolean).join(' · ')}}
 const rows=d.rows.filter(t=>{const m=meta(t);return (kind==='all'||t.kind===kind)&&(!cat||t.categoryId===cat)&&(!q||`${t.reason||''} ${(t.tags||[]).join(' ')} ${m.title} ${m.sub}`.toLowerCase().includes(q.toLowerCase()))})
 const net=(a:Txn[])=>a.reduce((s,t)=>s+(t.kind==='expense'?-t.amount:t.amount),0)
 const groups:Record<string,Txn[]>={};rows.forEach(t=>(groups[t.date]??=[]).push(t))
 const [a,b]=rangeFor(range),ctx={cats:d.cats,types:d.types,veh:d.veh,drv:d.drv},file=`transactions-${a}_to_${b}`
 const filt=`Period: ${a} to ${b}${kind!=='all'?` | ${kind==='expense'?'Expenses':'Income'} only`:''}${cat?` | Category: ${d.cats.find(c=>c.id===cat)?.name}`:''}${q?` | Search: "${q}"`:''} | ${rows.length} transactions`
 const out=async(f:()=>Promise<any>)=>{try{setMsg('');await f()}catch(e){setMsg('Export failed: '+e)}}
 const del=async(t:Txn)=>{if(!confirm('Delete this transaction?'))return
  try{await db.txns.delete(t.id!);setUndo(t);clearTimeout(timer);setTimer(setTimeout(()=>setUndo(null),5000))}catch(e){alert('Delete failed: '+e)}}
 return <div className="space-y-3">
  <input className="inp" placeholder="Search reason, tags, category or type" aria-label="Search" value={q} onChange={e=>setQ(e.target.value)}/>
  <div className="flex items-start gap-2"><RangePick value={range} onChange={setRange}/>
   <select aria-label="Kind" className="inp" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All</option><option value="expense">Expenses</option><option value="income">Income</option></select></div>
  <select aria-label="Category" className="inp" value={cat} onChange={e=>setCat(e.target.value?+e.target.value:'')}><option value="">All categories</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
  <div className="flex items-center justify-between gap-2"><div className="text-sm text-slate-500">{rows.length} entries · Net {inr(net(rows))}</div>
   <div className="flex gap-2"><button disabled={!rows.length} onClick={()=>out(()=>exportCsv(rows,ctx,file))} className="btn bg-white !min-h-[40px] text-sm disabled:opacity-40 dark:bg-white/10">⬇️ CSV</button>
    <button disabled={!rows.length} onClick={()=>out(()=>exportPdf(rows,ctx,filt,file))} className="btn bg-white !min-h-[40px] text-sm disabled:opacity-40 dark:bg-white/10">📄 PDF</button></div></div>
  {msg&&<p role="alert" className="text-sm text-red-500">{msg}</p>}
  {rows.length===0&&<div className="card text-center text-slate-500">No transactions match. Try another range, or tap + to add one.</div>}
  {Object.entries(groups).map(([day,ts])=><section key={day}>
   <div className="mb-1 flex justify-between text-sm font-semibold"><span>{dayLabel(day)}</span><span className="text-slate-500">{inr(net(ts))}</span></div>
   <div className="card divide-y divide-slate-100 p-0 dark:divide-white/10">{ts.map(t=>{const m=meta(t);return <div key={t.id} className="flex items-center">
    <button onClick={()=>onEdit(t)} className="flex min-h-[64px] min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2 text-left">
     <span className="min-w-0"><div className="font-medium">{m.icon} {m.title}</div>
      {m.sub&&<div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.sub}</div>}
      {t.reason&&<div className="truncate text-xs">{t.reason}</div>}
      {!!t.tags?.length&&<div className="truncate text-xs text-brand">{t.tags.map(x=>'#'+x).join(' ')}</div>}</span>
     <span className={`shrink-0 font-semibold ${t.kind==='expense'?'text-out':'text-inc'}`}>{t.kind==='expense'?'−':'+'}{inr(t.amount)}</span></button>
    {t.receipt&&<button aria-label="View receipt" onClick={()=>setView(t.receipt!)} className="shrink-0"><img src={t.receipt} alt="Receipt thumbnail" className="h-11 w-11 rounded-md object-cover"/></button>}
    <button aria-label="Delete" onClick={()=>del(t)} className="h-12 w-12 shrink-0 text-lg">🗑️</button></div>})}</div></section>)}
  {undo&&<div className="fixed bottom-24 left-1/2 z-40 flex w-[90%] max-w-sm -translate-x-1/2 items-center justify-between rounded-lg bg-ink p-3 text-white"><span>Transaction deleted</span>
   <button className="font-bold text-teal-300" onClick={async()=>{await db.txns.put(undo);setUndo(null)}}>Undo</button></div>}
  {view&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={()=>setView(null)}><button aria-label="Close" className="absolute right-3 top-3 h-12 w-12 text-2xl text-white">✕</button><img src={view} alt="Receipt" className="max-h-full max-w-full"/></div>}
 </div>}
