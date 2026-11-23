import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {db,Txn} from '../db/db'
import {inr,rangeFor,RANGES,dayLabel} from '../utils/format'
export default function Transactions({initial,onEdit}:{initial:any;onEdit:(t:Txn)=>void}){
 const [range,setRange]=useState(initial?.range||'This month'),[kind,setKind]=useState(initial?.kind||'all'),[cat]=useState<number|undefined>(initial?.cat)
 const [q,setQ]=useState(''),[undo,setUndo]=useState<Txn|null>(null),[timer,setTimer]=useState<any>()
 const d=useLiveQuery(async()=>{const [a,b]=rangeFor(range)
  return {rows:(await db.txns.where('date').between(a,b,true,true).reverse().sortBy('date')),cats:await db.categories.toArray(),types:await db.types.toArray()}},[range])
 if(!d)return null
 const rows=d.rows.filter(t=>(kind==='all'||t.kind===kind)&&(!cat||t.categoryId===cat)&&(!q||`${t.reason||''} ${(t.tags||[]).join(' ')}`.toLowerCase().includes(q.toLowerCase())))
 const total=rows.reduce((s,t)=>s+(t.kind==='expense'?-t.amount:t.amount),0)
 const groups:Record<string,Txn[]>={};rows.forEach(t=>(groups[t.date]??=[]).push(t))
 const label=(t:Txn)=>d.types.find(x=>x.id===t.typeId)?.name||d.cats.find(c=>c.id===t.categoryId)?.name||'Uncategorised'
 const del=async(t:Txn)=>{if(!confirm('Delete this transaction?'))return
  try{await db.txns.delete(t.id!);setUndo(t);clearTimeout(timer);setTimer(setTimeout(()=>setUndo(null),5000))}catch(e){alert('Delete failed: '+e)}}
 return <div className="space-y-3">
  <input className="inp" placeholder="Search reason or tags" aria-label="Search" value={q} onChange={e=>setQ(e.target.value)}/>
  <div className="flex gap-2"><select aria-label="Date range" className="inp" value={range} onChange={e=>setRange(e.target.value)}>{RANGES.map(r=><option key={r}>{r}</option>)}</select>
   <select aria-label="Kind" className="inp" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All</option><option value="expense">Expenses</option><option value="income">Income</option></select></div>
  <div className="text-sm text-slate-500">{rows.length} entries · Net {inr(total)}</div>
  {rows.length===0&&<div className="card text-center text-slate-500">No transactions match. Try another range, or tap + to add one.</div>}
  {Object.entries(groups).map(([day,ts])=><section key={day}>
   <div className="mb-1 flex justify-between text-sm font-semibold"><span>{dayLabel(day)}</span><span className="text-slate-500">{inr(ts.reduce((s,t)=>s+(t.kind==='expense'?-t.amount:t.amount),0))}</span></div>
   <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-700">{ts.map(t=><div key={t.id} className="flex items-center">
    <button onClick={()=>onEdit(t)} className="flex min-h-[56px] flex-1 items-center justify-between px-4 text-left"><span><div>{label(t)}</div>{t.reason&&<div className="text-xs text-slate-500">{t.reason}</div>}</span>
     <span className={t.kind==='expense'?'font-semibold text-out':'font-semibold text-inc'}>{t.kind==='expense'?'−':'+'}{inr(t.amount)}</span></button>
    <button aria-label="Delete" onClick={()=>del(t)} className="h-12 w-12 text-lg">🗑️</button></div>)}</div></section>)}
  {undo&&<div className="fixed bottom-24 left-1/2 flex w-[90%] max-w-sm -translate-x-1/2 items-center justify-between rounded-lg bg-ink p-3 text-white"><span>Transaction deleted</span>
   <button className="font-bold text-teal-300" onClick={async()=>{await db.txns.put(undo);setUndo(null)}}>Undo</button></div>}
 </div>}
