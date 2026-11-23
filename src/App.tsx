import {useEffect,useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {generate} from './db/recur'
import {today} from './utils/format'
import Upcoming from './screens/Upcoming'
import {db,seed,getSetting,setSetting,Txn} from './db/db'
import Dashboard from './screens/Dashboard'
import Transactions from './screens/Transactions'
import AddSheet from './screens/AddSheet'
import More from './screens/More'
type Tab='dash'|'txns'|'up'|'more'
export default function App(){
 const [tab,setTab]=useState<Tab>('dash')
 const [sheet,setSheet]=useState<{edit?:Txn;title?:string;onSaved?:(id:number)=>any}|null>(null)
 const [filter,setFilter]=useState<any>(null)
 const [dark,setDark]=useState(false)
 const [offline,setOffline]=useState(true)
 useEffect(()=>{(async()=>{try{await navigator.storage?.persist?.();await seed();await generate();setDark(await getSetting('dark',matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){alert('Could not open local database: '+e)}})()
  const f=()=>setOffline(true);window.addEventListener('offline-ready',f);return()=>window.removeEventListener('offline-ready',f)},[])
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark])
 const badge=useLiveQuery(async()=>(await db.occ.where('status').equals('pending').toArray()).filter(o=>o.dueDate<=today()).length,[])
 const toggleDark=()=>{setDark(!dark);setSetting('dark',!dark)}
 const open=(f:any)=>{setFilter({...f,k:Date.now()});setTab('txns')}
 const T=({id,label,icon,badge}:{id:Tab;label:string;icon:string;badge?:number})=>
  <button onClick={()=>{setFilter(null);setTab(id)}} aria-current={tab===id} className={`flex-1 py-2 text-xs ${tab===id?'font-bold text-brand':'text-slate-500'}`}><div className="relative text-xl">{icon}{!!badge&&<span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{badge}</span>}</div>{label}</button>
 return <div className="mx-auto flex min-h-screen max-w-md flex-col">
  <header className="flex items-center justify-between px-4 pt-4"><h1 className="text-xl font-bold tracking-tight">Expense Tracker</h1>
   {offline&&<span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-500">Offline ready</span>}</header>
  <main className="flex-1 px-4 pb-28 pt-3">
   {tab==='dash'&&<Dashboard onOpen={open}/>}
   {tab==='txns'&&<Transactions key={filter?.k||0} initial={filter} onEdit={t=>setSheet({edit:t})}/>}
   {tab==='up'&&<Upcoming onConfirm={(o,r)=>setSheet({title:'Confirm payment',edit:{kind:r.kind,amount:r.amount,date:o.dueDate,categoryId:r.categoryId,typeId:r.typeId,vehicleId:r.vehicleId,driverId:r.driverId,reason:r.title,recurringRuleId:r.id,createdAt:0,updatedAt:0} as Txn,onSaved:id=>db.occ.update(o.id!,{status:'paid',txnId:id})})}/>}
   {tab==='more'&&<More dark={dark} toggleDark={toggleDark}/>}
  </main>
  <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-[#171A21]/95">
   <T id="dash" label="Dashboard" icon="📊"/><T id="txns" label="Transactions" icon="🧾"/>
   <button onClick={()=>setSheet({})} aria-label="Add transaction" className="grad glow -mt-6 h-14 w-14 rounded-full text-3xl text-white">+</button>
   <T id="up" label="Upcoming" icon="🗓️" badge={badge||0}/>
   <T id="more" label="More" icon="⚙️"/>
  </nav>
  {sheet&&<AddSheet edit={sheet.edit} title={sheet.title} onSaved={sheet.onSaved} onClose={()=>setSheet(null)}/>}
 </div>}
