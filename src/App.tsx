import {useEffect,useState} from 'react'
import {db,seed,getSetting,setSetting,Txn} from './db/db'
import Dashboard from './screens/Dashboard'
import Transactions from './screens/Transactions'
import AddSheet from './screens/AddSheet'
import More from './screens/More'
type Tab='dash'|'txns'|'more'
export default function App(){
 const [tab,setTab]=useState<Tab>('dash')
 const [sheet,setSheet]=useState<{edit?:Txn}|null>(null)
 const [filter,setFilter]=useState<any>(null)
 const [dark,setDark]=useState(false)
 const [offline,setOffline]=useState(false)
 useEffect(()=>{(async()=>{try{await navigator.storage?.persist?.();await seed();setDark(await getSetting('dark',false))}catch(e){alert('Could not open local database: '+e)}})()
  const f=()=>setOffline(true);window.addEventListener('offline-ready',f);return()=>window.removeEventListener('offline-ready',f)},[])
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark])
 const toggleDark=()=>{setDark(!dark);setSetting('dark',!dark)}
 const open=(f:any)=>{setFilter({...f,k:Date.now()});setTab('txns')}
 const T=({id,label,icon}:{id:Tab;label:string;icon:string})=>
  <button onClick={()=>{setFilter(null);setTab(id)}} aria-current={tab===id} className={`flex-1 py-2 text-xs ${tab===id?'font-bold text-brand':'text-slate-500'}`}><div className="text-xl">{icon}</div>{label}</button>
 return <div className="mx-auto flex min-h-screen max-w-md flex-col">
  <header className="flex items-center justify-between px-4 pt-4"><h1 className="text-lg font-bold">Expense Tracker</h1>
   {offline&&<span className="rounded-full bg-brand/10 px-2 py-1 text-xs text-brand">Offline ready</span>}</header>
  <main className="flex-1 px-4 pb-28 pt-3">
   {tab==='dash'&&<Dashboard onOpen={open}/>}
   {tab==='txns'&&<Transactions key={filter?.k||0} initial={filter} onEdit={t=>setSheet({edit:t})}/>}
   {tab==='more'&&<More dark={dark} toggleDark={toggleDark}/>}
  </main>
  <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center border-t border-slate-200 bg-white pb-2 dark:border-slate-700 dark:bg-[#1B2427]">
   <T id="dash" label="Dashboard" icon="📊"/><T id="txns" label="Transactions" icon="🧾"/>
   <button onClick={()=>setSheet({})} aria-label="Add transaction" className="-mt-6 h-14 w-14 rounded-full bg-brand text-3xl text-white shadow-lg">+</button>
   <button className="flex-1 py-2 text-xs text-slate-400" disabled><div className="text-xl">🗓️</div>Upcoming</button>
   <T id="more" label="More" icon="⚙️"/>
  </nav>
  {sheet&&<AddSheet edit={sheet.edit} onClose={()=>setSheet(null)}/>}
 </div>}
