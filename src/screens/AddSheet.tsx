import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {nth,generate} from '../db/recur'
import {db,Txn,Rule,Kind,getSetting,setSetting} from '../db/db'
import {today} from '../utils/format'
export default function AddSheet({edit,onClose,title,onSaved}:{edit?:Txn;onClose:()=>void;title?:string;onSaved?:(id:number)=>any}){
 const [kind,setKind]=useState<Kind>(edit?.kind||'expense'),[amount,setAmount]=useState(edit?String(edit.amount):'')
 const [date,setDate]=useState(edit?.date||today()),[categoryId,setCat]=useState<number|undefined>(edit?.categoryId),[typeId,setType]=useState<number|undefined>(edit?.typeId)
 const [vehicleId,setVeh]=useState<number|undefined>(edit?.vehicleId),[driverId,setDrv]=useState<number|undefined>(edit?.driverId)
 const [odometer,setOdo]=useState(edit?.odometer?String(edit.odometer):''),[litres,setLit]=useState(edit?.litres?String(edit.litres):'')
 const [reason,setReason]=useState(edit?.reason||''),[pay,setPay]=useState(edit?.paymentMode||''),[tags,setTags]=useState((edit?.tags||[]).join(', '))
 const [rep,setRep]=useState(''),[err,setErr]=useState(''),[receipt,setReceipt]=useState<string|undefined>(edit?.receipt),[big,setBig]=useState(false)
 const d=useLiveQuery(async()=>({cats:await db.categories.toArray(),types:await db.types.toArray(),veh:await db.vehicles.toArray(),drv:await db.drivers.toArray(),last:await getSetting<number|null>('lastCat',null)}),[])
 if(!d)return null
 const isVeh=kind==='expense'&&(c=>!!(c?.isVehicle||c?.name==='Vehicle'))(d.cats.find(c=>c.id===categoryId))
 const types=d.types.filter(t=>kind==='income'?t.kind==='income'&&(!t.categoryId||t.categoryId===categoryId):t.kind==='expense'&&t.categoryId===categoryId)
 const addType=async()=>{const name=prompt('New type name')?.trim();if(!name)return;const id=await db.types.add({name,kind,categoryId});setType(id as number)}
 const addDriver=async()=>{const name=prompt('Driver name')?.trim();if(!name)return;setDrv(await db.drivers.add({name}) as number)}
 const reset=()=>{setRep('');setReceipt(undefined);setAmount('');setReason('');setTags('');setOdo('');setLit('');setType(undefined)}
 const pick=async(e:any)=>{const f=e.target.files?.[0];e.target.value='';if(!f)return
  try{const b=await createImageBitmap(f);let s=Math.min(1,1280/Math.max(b.width,b.height)),q=.8,url=''
   for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d')!.drawImage(b,0,0,c.width,c.height);url=c.toDataURL('image/jpeg',q);if(url.length*.75<=200*1024)break;if(q>.5)q-=.1;else s*=.8}
   setReceipt(url);setErr('')}catch(x){setErr('Could not read that image. Try another photo.')}}
 const save=async(another:boolean)=>{
  const a=parseFloat(amount);if(!(a>0)){setErr('Enter an amount greater than 0.');return}
  const n=Date.now(),row:Txn={...(edit||{}),kind,amount:a,date,categoryId,typeId,reason:reason.trim()||undefined,receipt:kind==='expense'?receipt:undefined,paymentMode:pay||undefined,
   tags:tags.split(',').map(s=>s.trim()).filter(Boolean),vehicleId:isVeh?vehicleId:undefined,driverId:isVeh?driverId:undefined,
   odometer:isVeh&&odometer?+odometer:undefined,litres:isVeh&&litres?+litres:undefined,createdAt:edit?.createdAt||n,updatedAt:n}
  try{if(rep&&!edit){const rule:Rule={title:row.reason||d.types.find(x=>x.id===typeId)?.name||d.cats.find(c=>c.id===categoryId)?.name||'Recurring',kind,amount:a,categoryId:row.categoryId,typeId,vehicleId:row.vehicleId,driverId:row.driverId,frequency:rep as any,startDate:date}
   rule.startDate=nth(rule,1);row.recurringRuleId=await db.rules.add(rule) as number;await generate()}
   const id=await db.txns.put(row) as number;await onSaved?.(id);if(categoryId)await setSetting('lastCat',categoryId);another?(reset(),setErr('')):onClose()}catch(e){setErr('Could not save: '+e)}}
 return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-paper dark:bg-[#0F1115]"><div className="mx-auto max-w-md space-y-3 p-4 pb-10">
  <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title||(edit?'Edit transaction':'Add transaction')}</h2><button onClick={onClose} className="h-12 w-12 text-xl" aria-label="Close">✕</button></div>
  <div className="grid grid-cols-2 gap-2">{(['expense','income'] as Kind[]).map(k=><button key={k} onClick={()=>{setKind(k);setType(undefined)}} className={`btn ${kind===k?'bg-brand text-white':'bg-white dark:bg-white/10'}`}>{k==='expense'?'Expense':'Income'}</button>)}</div>
  <label className="block text-sm">Amount (₹)<input autoFocus inputMode="decimal" className="inp text-3xl font-bold" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0"/></label>
  <label className="block text-sm">Date<input type="date" className="inp" value={date} onChange={e=>setDate(e.target.value)}/></label>
  <label className="block text-sm">Category<select className="inp" value={categoryId??''} onChange={e=>{setCat(e.target.value?+e.target.value:undefined);setType(undefined)}}><option value="">None</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}{c.id===d.last?' (last used)':''}</option>)}</select></label>
  {(kind==='income'||categoryId)&&<label className="block text-sm">Type<div className="flex gap-2"><select className="inp" value={typeId??''} onChange={e=>setType(e.target.value?+e.target.value:undefined)}><option value="">None</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button type="button" onClick={addType} className="btn bg-white dark:bg-white/10">+ New</button></div></label>}
  {isVeh&&<details className="card" open><summary className="font-semibold">Vehicle details</summary><div className="mt-2 space-y-2">
   <select aria-label="Vehicle" className="inp" value={vehicleId??''} onChange={e=>setVeh(e.target.value?+e.target.value:undefined)}><option value="">Vehicle</option>{d.veh.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>
   <div className="flex gap-2"><select aria-label="Driver" className="inp" value={driverId??''} onChange={e=>setDrv(e.target.value?+e.target.value:undefined)}><option value="">Driver</option>{d.drv.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" onClick={addDriver} className="btn bg-white dark:bg-white/10">+ New</button></div>
   <input aria-label="Odometer" inputMode="numeric" className="inp" placeholder="Odometer (km)" value={odometer} onChange={e=>setOdo(e.target.value)}/>
   <input aria-label="Litres" inputMode="decimal" className="inp" placeholder="Litres" value={litres} onChange={e=>setLit(e.target.value)}/></div></details>}
  <details className="card" open={!!(edit&&(edit.reason||edit.paymentMode||edit.tags?.length||edit.receipt))}><summary className="cursor-pointer select-none font-semibold">More details <span className="text-xs font-normal text-slate-500">reason, payment, tags, receipt, repeat</span></summary><div className="mt-3 space-y-3">
  <input aria-label="Reason" className="inp" placeholder="Reason (optional)" value={reason} onChange={e=>setReason(e.target.value)}/>
  <select aria-label="Payment mode" className="inp" value={pay} onChange={e=>setPay(e.target.value)}><option value="">Payment mode</option>{['Cash','UPI','Card','Bank'].map(p=><option key={p}>{p}</option>)}</select>
  <input aria-label="Tags" className="inp" placeholder="Tags, comma separated" value={tags} onChange={e=>setTags(e.target.value)}/>
  {!edit&&<label className="card flex items-center justify-between gap-3 text-sm"><span>🔁 Repeat</span><select aria-label="Repeat" className="inp w-auto" value={rep} onChange={e=>setRep(e.target.value)}><option value="">Does not repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>}
  {kind==='expense'&&<div className="card"><div className="mb-2 text-sm font-semibold">Receipt photo</div>
   {receipt?<div className="flex items-center gap-3"><button onClick={()=>setBig(true)} aria-label="View receipt"><img src={receipt} alt="Receipt" className="h-20 w-20 rounded-lg object-cover"/></button><button className="min-h-[48px] text-red-500" onClick={()=>setReceipt(undefined)}>Remove</button></div>
   :<div className="grid grid-cols-2 gap-2"><label className="btn flex items-center justify-center bg-white dark:bg-white/10">📷 Camera<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick}/></label><label className="btn flex items-center justify-center bg-white dark:bg-white/10">🖼️ Gallery<input type="file" accept="image/*" className="sr-only" onChange={pick}/></label></div>}</div>}
  {big&&receipt&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={()=>setBig(false)}><img src={receipt} alt="Receipt" className="max-h-full max-w-full"/></div>}
  </div></details>
  <div className="sticky bottom-0 -mx-4 space-y-2 bg-paper/95 px-4 py-3 backdrop-blur dark:bg-[#0F1115]/95">
  {err&&<p role="alert" className="text-sm text-red-600">{err}</p>}
  <div className="grid grid-cols-2 gap-2"><button onClick={()=>save(false)} className="btn bg-brand text-white">Save</button>{!edit&&<button onClick={()=>save(true)} className="btn bg-white dark:bg-white/10">Save & add another</button>}</div></div>
 </div></div>}
