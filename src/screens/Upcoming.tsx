import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {db,Rule,Occ} from '../db/db'
import {generate} from '../db/recur'
import {inr,today,addDays,daysBetween,dayLabel} from '../utils/format'
import {deliver} from '../utils/share'
const freq=(r:Rule)=>r.frequency==='custom'?`Every ${r.every||1} ${r.unit||'days'}`:r.frequency[0].toUpperCase()+r.frequency.slice(1)
const ics=(r:Rule)=>{const y=(s:string)=>s.replace(/-/g,''),n=r.every||1
 const rr=r.frequency==='weekly'?'FREQ=WEEKLY':r.frequency==='yearly'?'FREQ=YEARLY':r.frequency==='monthly'?'FREQ=MONTHLY':r.unit==='months'?`FREQ=MONTHLY;INTERVAL=${n}`:`FREQ=DAILY;INTERVAL=${n}`
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Expense Tracker//EN','BEGIN:VEVENT',`UID:rule-${r.id}@expense-tracker`,`DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g,'')}`,`DTSTART;VALUE=DATE:${y(r.startDate)}`,`SUMMARY:${r.title} - Rs. ${r.amount}`,`RRULE:${rr}${r.endDate?`;UNTIL=${y(r.endDate)}`:''}`,'END:VEVENT','END:VCALENDAR'].join('\r\n')}
function Editor({rule,cats,run,err,onClose}:any){
 const [r,setR]=useState<Rule>(rule),set=(k:string,v:any)=>setR({...r,[k]:v})
 const save=()=>run(async()=>{if(!r.title.trim()||!(r.amount>0))throw new Error('Enter a title and an amount above 0')
  const id=r.id?(await db.rules.put(r),r.id):await db.rules.add(r) as number
  await db.occ.where('ruleId').equals(id).filter((o:Occ)=>o.status==='pending').delete();await generate();onClose()})
 const del=()=>run(async()=>{if(!confirm('Delete this rule and its pending dues? Past transactions stay.'))return
  await db.occ.where('ruleId').equals(r.id!).filter((o:Occ)=>o.status==='pending').delete();await db.rules.delete(r.id!);onClose()})
 return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-paper dark:bg-[#0F1115]"><div className="mx-auto max-w-md space-y-3 p-4 pb-10">
  <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{r.id?'Edit rule':'New recurring rule'}</h2><button onClick={onClose} aria-label="Close" className="h-12 w-12 text-xl">✕</button></div>
  <select aria-label="Kind" className="inp" value={r.kind} onChange={e=>set('kind',e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select>
  <input aria-label="Title" className="inp" placeholder="Title (e.g. Rent, Car insurance)" value={r.title} onChange={e=>set('title',e.target.value)}/>
  <input aria-label="Amount" inputMode="decimal" className="inp text-xl font-bold" placeholder="Amount (₹)" value={r.amount||''} onChange={e=>set('amount',parseFloat(e.target.value.replace(/[^0-9.]/g,''))||0)}/>
  <select aria-label="Category" className="inp" value={r.categoryId??''} onChange={e=>set('categoryId',e.target.value?+e.target.value:undefined)}><option value="">No category</option>{cats.map((c:any)=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
  <select aria-label="Frequency" className="inp" value={r.frequency} onChange={e=>set('frequency',e.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="custom">Custom interval</option></select>
  {r.frequency==='custom'&&<div className="flex gap-2"><input aria-label="Every" inputMode="numeric" className="inp" placeholder="Every N" value={r.every||''} onChange={e=>set('every',+e.target.value.replace(/\D/g,'')||undefined)}/><select aria-label="Unit" className="inp" value={r.unit||'days'} onChange={e=>set('unit',e.target.value)}><option value="days">days</option><option value="months">months</option></select></div>}
  <label className="block text-sm">First due date<input type="date" className="inp mt-1" value={r.startDate} onChange={e=>e.target.value&&set('startDate',e.target.value)}/></label>
  <label className="block text-sm">End date (optional)<input type="date" className="inp mt-1" value={r.endDate||''} onChange={e=>set('endDate',e.target.value||undefined)}/></label>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!r.paused} onChange={e=>set('paused',e.target.checked)}/>Paused</label>
  <p className="text-xs text-slate-500">Saving changes this rule's pending dues from now on. Nothing is posted automatically; you confirm each one.</p>
  {err&&<p role="alert" className="text-sm text-red-500">{err}</p>}
  <div className="grid grid-cols-2 gap-2"><button onClick={save} className="btn grad text-white">Save</button>{r.id?<button onClick={del} className="btn bg-red-600 text-white">Delete</button>:<button onClick={onClose} className="btn bg-slate-100 dark:bg-white/10">Cancel</button>}</div></div></div>}
export default function Upcoming({onConfirm}:{onConfirm:(o:Occ,r:Rule)=>void}){
 const d=useLiveQuery(async()=>({rules:await db.rules.toArray(),occ:(await db.occ.where('status').equals('pending').toArray()).sort((a,b)=>a.dueDate<b.dueDate?-1:1),cats:await db.categories.toArray()}),[])
 const [edit,setEdit]=useState<Rule|null>(null),[err,setErr]=useState('')
 if(!d)return null
 const run=async(f:()=>Promise<any>)=>{try{setErr('');await f()}catch(e:any){setErr(e?.message||String(e))}}
 const icon=(r:Rule)=>d.cats.find(c=>c.id===r.categoryId)?.icon||'🔁'
 const list=d.occ.filter(o=>o.dueDate<=addDays(today(),90)).map(o=>({o,r:d.rules.find(x=>x.id===o.ruleId)!})).filter(x=>x.r)
 const B='btn !min-h-[44px] bg-slate-100 text-sm dark:bg-white/10'
 return <div className="space-y-3">
  <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Upcoming</h2><button onClick={()=>{setErr('');setEdit({title:'',kind:'expense',amount:0,frequency:'monthly',startDate:today()})}} className="btn !min-h-[40px] grad text-sm text-white">+ New rule</button></div>
  {err&&!edit&&<p role="alert" className="text-sm text-red-500">{err}</p>}
  {list.length===0&&<div className="card text-center text-slate-500">Nothing due in the next 90 days. Add a bill that repeats (rent, EMI, insurance) with + New rule, or choose Repeat when adding a transaction.</div>}
  {list.map(({o,r})=>{const n=daysBetween(today(),o.dueDate),late=n<0;return <div key={o.id} className="card space-y-3">
   <div className="flex items-start justify-between gap-3"><div><div className="font-medium">{icon(r)} {r.title}</div>
    <div className={`text-xs ${late?'text-out':'text-slate-500 dark:text-slate-400'}`}>{dayLabel(o.dueDate)} · {late?`overdue ${-n} day${n===-1?'':'s'}`:n===0?'due today':`in ${n} day${n===1?'':'s'}`}</div></div>
    <div className={`font-semibold ${r.kind==='expense'?'text-out':'text-inc'}`}>{inr(r.amount)}</div></div>
   <div className="grid grid-cols-3 gap-2"><button onClick={()=>onConfirm(o,r)} className="btn !min-h-[44px] grad text-sm text-white">{r.kind==='income'?'✓ Received':'✓ Paid'}</button>
    <button onClick={()=>run(()=>db.occ.update(o.id!,{status:'skipped'}))} className={B}>Skip</button><button onClick={()=>{setErr('');setEdit(r)}} className={B}>Edit rule</button></div></div>})}
  {d.rules.length>0&&<><h3 className="pt-2 text-sm font-semibold text-slate-500">Recurring rules</h3>
   {d.rules.map(r=><div key={r.id} className="card flex items-center justify-between gap-2"><div className="min-w-0"><div className="truncate font-medium">{icon(r)} {r.title}</div><div className="text-xs text-slate-500">{freq(r)} · {inr(r.amount)}{r.paused?' · paused':''}</div></div>
    <div className="flex shrink-0"><button aria-label={r.paused?'Resume':'Pause'} className="h-11 w-11" onClick={()=>run(async()=>{await db.rules.update(r.id!,{paused:!r.paused});await generate()})}>{r.paused?'▶️':'⏸️'}</button>
     <button aria-label="Add to calendar" className="h-11 w-11" onClick={()=>run(()=>deliver(`${r.title.replace(/\W+/g,'-')}.ics`,'text/calendar',ics(r)))}>📅</button>
     <button aria-label="Edit rule" className="h-11 w-11" onClick={()=>{setErr('');setEdit(r)}}>✏️</button></div></div>)}</>}
  {edit&&<Editor key={edit.id||'new'} rule={edit} cats={d.cats} run={run} err={err} onClose={()=>{setEdit(null);setErr('')}}/>}
 </div>}
