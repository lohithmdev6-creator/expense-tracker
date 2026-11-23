import {useEffect,useState} from 'react'
import {deliver} from '../utils/share'
import {exportCsv} from '../utils/export'
import Manage from './Manage'
import {db,loadSample,setSetting,getSetting} from '../db/db'
const T=['categories','types','vehicles','drivers','txns','settings','rules','occ'] as const
export default function More({dark,toggleDark}:{dark:boolean;toggleDark:()=>void}){
 const [info,setInfo]=useState('');const [msg,setMsg]=useState('');const [budget,setBudget]=useState('');const [manage,setManage]=useState(false)
 useEffect(()=>{getSetting<number>('budget',0).then(b=>setBudget(b?String(b):''))},[])
 useEffect(()=>{(async()=>{const p=await navigator.storage?.persisted?.(),e=await navigator.storage?.estimate?.()
  setInfo(`Persistent storage: ${p?'granted':'not granted'} · Using about ${((e?.usage||0)/1024).toFixed(0)} KB`)})()},[])
 const run=async(f:()=>Promise<void>)=>{try{await f()}catch(e){setMsg('Something went wrong: '+e)}}
 const backup=()=>run(async()=>{const data:any={app:'expense-tracker',version:1,exportedAt:Date.now()}
  for(const t of T)data[t]=await (db as any)[t].toArray()
  await deliver(`expense-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json',JSON.stringify(data))
  await setSetting('lastBackupAt',Date.now());setMsg('Backup saved.')})
 const restore=(e:any)=>run(async()=>{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text())
  if(data.app!=='expense-tracker')throw new Error('Not an Expense Tracker backup')
  const replace=confirm('OK = Replace all current data with this backup.\nCancel = Merge into current data.')
  if(replace){await db.transaction('rw',T.map(t=>(db as any)[t]),async()=>{for(const t of T){await (db as any)[t].clear();await (db as any)[t].bulkPut(data[t]||[])}})}
  else{const cm:any={};for(const c of data.categories||[]){const ex=await db.categories.where('name').equals(c.name).first();cm[c.id]=ex?.id??await db.categories.add({...c,id:undefined})}
   const tm:any={};for(const t of data.types||[]){const ex=(await db.types.toArray()).find(x=>x.name===t.name&&x.kind===t.kind&&x.categoryId===cm[t.categoryId]);tm[t.id]=ex?.id??await db.types.add({...t,id:undefined,categoryId:cm[t.categoryId]})}
   await db.txns.bulkAdd((data.txns||[]).map((t:any)=>({...t,id:undefined,categoryId:cm[t.categoryId],typeId:tm[t.typeId],vehicleId:undefined,driverId:undefined})))}
  setMsg('Restore complete.');e.target.value=''})
 const csv=()=>run(async()=>{await exportCsv(await db.txns.orderBy('date').toArray(),{cats:await db.categories.toArray(),types:await db.types.toArray(),veh:await db.vehicles.toArray(),drv:await db.drivers.toArray()},'transactions')})
 const Row=({l,on,children}:any)=><button onClick={on} className="btn w-full bg-white text-left dark:bg-white/10">{l}{children}</button>
 if(manage)return <Manage onBack={()=>setManage(false)}/>
 return <div className="space-y-3">
  <Row l="🗂️ Categories, types & budgets" on={()=>setManage(true)}/>
  <label className="card block text-sm">Monthly budget (₹)<input inputMode="numeric" className="inp mt-1" placeholder="e.g. 60000" value={budget} onChange={e=>setBudget(e.target.value.replace(/\D/g,''))} onBlur={()=>setSetting('budget',+budget||0)}/></label>
  <Row l={dark?'Switch to light mode':'Switch to dark mode'} on={toggleDark}/>
  <Row l="Back up all data (JSON)" on={backup}/>
  <label className="btn flex w-full items-center bg-white dark:bg-white/10">Restore from backup<input type="file" accept="application/json" className="sr-only" onChange={restore}/></label>
  <Row l="Export transactions (CSV)" on={csv}/>
  <Row l="Load sample data" on={()=>run(async()=>{await loadSample();setMsg('Sample data added.')})}/>
  {msg&&<p role="status" className="text-sm text-brand">{msg}</p>}
  <p className="text-xs text-slate-500">{info}</p>
 </div>}
