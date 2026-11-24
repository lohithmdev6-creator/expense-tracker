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
const svg=(c:any)=><svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{c}</svg>
const ICONS:Record<string,any>={dash:svg(<path d="M5 20V12M12 20V5M19 20V9"/>),txns:svg(<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>),
 up:svg(<><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></>),more:svg(<path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3"/>)}
type Tab='dash'|'txns'|'up'|'more'
export default function App(){
 const [tab,setTab]=useState<Tab>('dash')
 const [sheet,setSheet]=useState<{edit?:Txn;title?:string;onSaved?:(id:number)=>any}|null>(null)
 const [filter,setFilter]=useState<any>(null),[moreView,setMoreView]=useState('')
 const [dark,setDark]=useState(false)
 const [offline,setOffline]=useState(true)
 useEffect(()=>{(async()=>{try{await navigator.storage?.persist?.();await seed();await generate();setDark(await getSetting('dark',matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){alert('Could not open local database: '+e)}})()
  const f=()=>setOffline(true);window.addEventListener('offline-ready',f);return()=>window.removeEventListener('offline-ready',f)},[])
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark])
 const badge=useLiveQuery(async()=>(await db.occ.where('status').equals('pending').toArray()).filter(o=>o.dueDate<=today()).length,[])
 const toggleDark=()=>{setDark(!dark);setSetting('dark',!dark)}
 const open=(f:any)=>{setFilter({...f,k:Date.now()});setTab('txns')}
 const T=({id,label,icon,badge}:{id:Tab;label:string;icon:string;badge?:number})=>
  <button onClick={()=>{setFilter(null);setMoreView('');setTab(id)}} aria-current={tab===id} className={`flex-1 py-2 text-[11px] ${tab===id?'font-semibold text-brand':'text-slate-500 dark:text-slate-400'}`}><div className="relative">{ICONS[icon]}{!!badge&&<span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{badge}</span>}</div>{label}</button>
 return <div className="mx-auto flex min-h-screen max-w-md flex-col">
  <header className="flex items-center justify-between px-4 pb-1 pt-6"><h1 className="text-3xl font-bold tracking-tight">{{dash:'Overview',txns:'Transactions',up:'Upcoming',more:'More'}[tab]}</h1>
   {offline&&<span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-500">Offline ready</span>}</header>
  <main className="flex-1 px-4 pb-28 pt-3">
   {tab==='dash'&&<Dashboard onOpen={open} onBudgets={()=>{setMoreView('budgets');setTab('more')}}/>}
   {tab==='txns'&&<Transactions key={filter?.k||0} initial={filter} onEdit={t=>setSheet({edit:t})} onBudgets={()=>{setMoreView('budgets');setTab('more')}}/>}
   {tab==='up'&&<Upcoming onConfirm={(o,r)=>setSheet({title:'Confirm payment',edit:{kind:r.kind,amount:r.amount,date:o.dueDate,categoryId:r.categoryId,typeId:r.typeId,vehicleId:r.vehicleId,driverId:r.driverId,reason:r.title,recurringRuleId:r.id,createdAt:0,updatedAt:0} as Txn,onSaved:id=>db.occ.update(o.id!,{status:'paid',txnId:id})})}/>}
   {tab==='more'&&<More key={moreView} start={moreView} dark={dark} toggleDark={toggleDark}/>}
  </main>
  <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-[#171A21]/95">
   <T id="dash" label="Overview" icon="dash"/><T id="txns" label="Transactions" icon="txns"/>
   <button onClick={()=>setSheet({})} aria-label="Add transaction" className="grad glow -mt-6 h-14 w-14 rounded-full text-3xl text-white">+</button>
   <T id="up" label="Upcoming" icon="up" badge={badge||0}/>
   <T id="more" label="More" icon="more"/>
  </nav>
  {sheet&&<AddSheet edit={sheet.edit} title={sheet.title} onSaved={sheet.onSaved} onClose={()=>setSheet(null)}/>}
 </div>}
