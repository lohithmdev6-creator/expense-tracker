import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {db,Txn,Kind,getSetting,setSetting} from '../db/db'
import {today} from '../utils/format'
export default function AddSheet({edit,onClose}:{edit?:Txn;onClose:()=>void}){
 const [kind,setKind]=useState<Kind>(edit?.kind||'expense'),[amount,setAmount]=useState(edit?String(edit.amount):'')
 const [date,setDate]=useState(edit?.date||today()),[categoryId,setCat]=useState<number|undefined>(edit?.categoryId),[typeId,setType]=useState<number|undefined>(edit?.typeId)
 const [vehicleId,setVeh]=useState<number|undefined>(edit?.vehicleId),[driverId,setDrv]=useState<number|undefined>(edit?.driverId)
 const [odometer,setOdo]=useState(edit?.odometer?String(edit.odometer):''),[litres,setLit]=useState(edit?.litres?String(edit.litres):'')
 const [reason,setReason]=useState(edit?.reason||''),[pay,setPay]=useState(edit?.paymentMode||''),[tags,setTags]=useState((edit?.tags||[]).join(', '))
 const [err,setErr]=useState('')
 const d=useLiveQuery(async()=>({cats:await db.categories.toArray(),types:await db.types.toArray(),veh:await db.vehicles.toArray(),drv:await db.drivers.toArray(),last:await getSetting<number|null>('lastCat',null)}),[])
 if(!d)return null
 const isVeh=kind==='expense'&&d.cats.find(c=>c.id===categoryId)?.name==='Vehicle'
 const types=d.types.filter(t=>kind==='income'?t.kind==='income':t.kind==='expense'&&t.categoryId===categoryId)
 const addType=async()=>{const name=prompt('New type name')?.trim();if(!name)return;const id=await db.types.add({name,kind,categoryId:kind==='expense'?categoryId:undefined});setType(id as number)}
 const addDriver=async()=>{const name=prompt('Driver name')?.trim();if(!name)return;setDrv(await db.drivers.add({name}) as number)}
 const reset=()=>{setAmount('');setReason('');setTags('');setOdo('');setLit('');setType(undefined)}
 const save=async(another:boolean)=>{
  const a=parseFloat(amount);if(!(a>0)){setErr('Enter an amount greater than 0.');return}
  const n=Date.now(),row:Txn={...(edit||{}),kind,amount:a,date,categoryId:kind==='expense'?categoryId:undefined,typeId,reason:reason.trim()||undefined,paymentMode:pay||undefined,
   tags:tags.split(',').map(s=>s.trim()).filter(Boolean),vehicleId:isVeh?vehicleId:undefined,driverId:isVeh?driverId:undefined,
   odometer:isVeh&&odometer?+odometer:undefined,litres:isVeh&&litres?+litres:undefined,createdAt:edit?.createdAt||n,updatedAt:n}
  try{await db.txns.put(row);if(categoryId)await setSetting('lastCat',categoryId);another?(reset(),setErr('')):onClose()}catch(e){setErr('Could not save: '+e)}}
 return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-paper dark:bg-[#12191B]"><div className="mx-auto max-w-md space-y-3 p-4 pb-10">
  <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{edit?'Edit transaction':'Add transaction'}</h2><button onClick={onClose} className="h-12 w-12 text-xl" aria-label="Close">✕</button></div>
  <div className="grid grid-cols-2 gap-2">{(['expense','income'] as Kind[]).map(k=><button key={k} onClick={()=>{setKind(k);setType(undefined)}} className={`btn ${kind===k?'bg-brand text-white':'bg-white dark:bg-[#1B2427]'}`}>{k==='expense'?'Expense':'Income'}</button>)}</div>
  <label className="block text-sm">Amount (₹)<input autoFocus inputMode="decimal" className="inp text-3xl font-bold" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0"/></label>
  <label className="block text-sm">Date<input type="date" className="inp" value={date} onChange={e=>setDate(e.target.value)}/></label>
  {kind==='expense'&&<label className="block text-sm">Category<select className="inp" value={categoryId??''} onChange={e=>{setCat(e.target.value?+e.target.value:undefined);setType(undefined)}}><option value="">None</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}{c.id===d.last?' (last used)':''}</option>)}</select></label>}
  {(kind==='income'||categoryId)&&<label className="block text-sm">Type<div className="flex gap-2"><select className="inp" value={typeId??''} onChange={e=>setType(e.target.value?+e.target.value:undefined)}><option value="">None</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button type="button" onClick={addType} className="btn bg-white dark:bg-[#1B2427]">+ New</button></div></label>}
  {isVeh&&<details className="card" open><summary className="font-semibold">Vehicle details</summary><div className="mt-2 space-y-2">
   <select aria-label="Vehicle" className="inp" value={vehicleId??''} onChange={e=>setVeh(e.target.value?+e.target.value:undefined)}><option value="">Vehicle</option>{d.veh.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>
   <div className="flex gap-2"><select aria-label="Driver" className="inp" value={driverId??''} onChange={e=>setDrv(e.target.value?+e.target.value:undefined)}><option value="">Driver</option>{d.drv.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" onClick={addDriver} className="btn bg-white dark:bg-[#1B2427]">+ New</button></div>
   <input aria-label="Odometer" inputMode="numeric" className="inp" placeholder="Odometer (km)" value={odometer} onChange={e=>setOdo(e.target.value)}/>
   <input aria-label="Litres" inputMode="decimal" className="inp" placeholder="Litres" value={litres} onChange={e=>setLit(e.target.value)}/></div></details>}
  <input aria-label="Reason" className="inp" placeholder="Reason (optional)" value={reason} onChange={e=>setReason(e.target.value)}/>
  <select aria-label="Payment mode" className="inp" value={pay} onChange={e=>setPay(e.target.value)}><option value="">Payment mode</option>{['Cash','UPI','Card','Bank'].map(p=><option key={p}>{p}</option>)}</select>
  <input aria-label="Tags" className="inp" placeholder="Tags, comma separated" value={tags} onChange={e=>setTags(e.target.value)}/>
  {err&&<p role="alert" className="text-sm text-red-600">{err}</p>}
  <div className="grid grid-cols-2 gap-2"><button onClick={()=>save(false)} className="btn bg-brand text-white">Save</button>{!edit&&<button onClick={()=>save(true)} className="btn bg-white dark:bg-[#1B2427]">Save & add another</button>}</div>
 </div></div>}
