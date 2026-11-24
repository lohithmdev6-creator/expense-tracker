import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {db,Category,Kind} from '../db/db'
export default function Manage({onBack}:{onBack:()=>void}){
 const d=useLiveQuery(async()=>{const cats=await db.categories.toArray(),counts:Record<number,number>={};for(const c of cats)counts[c.id!]=await db.txns.where('categoryId').equals(c.id!).count();return {cats,types:await db.types.toArray(),counts}},[])
 const [del,setDel]=useState<{c:Category;to:string}|null>(null),[err,setErr]=useState('')
 if(!d)return null
 const run=async(f:()=>Promise<any>)=>{try{setErr('');await f()}catch(e){setErr('Could not save: '+e)}}
 const addCat=()=>run(async()=>{const name=prompt('Category name')?.trim();if(name)await db.categories.add({name,icon:'📦',colour:'#22D3EE'})})
 const addType=(categoryId:number|undefined,kind:Kind)=>run(async()=>{const name=prompt('Type name')?.trim();if(name)await db.types.add({name,kind,categoryId})})
 const rename=(t:any)=>run(async()=>{const name=prompt('Rename type',t.name)?.trim();if(name)await db.types.update(t.id,{name})})
 const delType=(t:any)=>run(async()=>{if(!confirm(`Delete "${t.name}"? Entries keep their amounts but lose this type.`))return
  await db.transaction('rw',db.types,db.txns,async()=>{await db.txns.where('typeId').equals(t.id).modify({typeId:undefined});await db.types.delete(t.id)})})
 const startDel=(c:Category)=>d.counts[c.id!]?setDel({c,to:'0'}):run(async()=>{if(confirm(`Delete "${c.name}"?`)){await db.types.where('categoryId').equals(c.id!).delete();await db.categories.delete(c.id!)}})
 const doDel=()=>run(async()=>{const {c,to}=del!,dest=+to||undefined
  await db.transaction('rw',db.types,db.txns,db.categories,async()=>{await db.txns.where('categoryId').equals(c.id!).modify({categoryId:dest,typeId:undefined});await db.types.where('categoryId').equals(c.id!).delete();await db.categories.delete(c.id!)});setDel(null)})
 const Chips=({list,onAdd,onAdd2}:{list:any[];onAdd:()=>void;onAdd2?:()=>void})=><div className="flex flex-wrap gap-2">{list.map(t=><span key={t.id} className="flex items-center rounded-full bg-slate-500/15 text-sm"><button className="px-3 py-2" onClick={()=>rename(t)}>{t.kind==='income'?'💰 ':''}{t.name}</button><button aria-label={`Delete ${t.name}`} className="py-2 pr-3" onClick={()=>delType(t)}>✕</button></span>)}
  <button onClick={onAdd} className="rounded-full border border-dashed border-brand px-3 py-2 text-sm text-brand">+ Type</button>{onAdd2&&<button onClick={onAdd2} className="rounded-full border border-dashed border-inc px-3 py-2 text-sm text-inc">+ Income type</button>}</div>
 return <div className="space-y-3">
  <button onClick={onBack} className="min-h-[48px] text-brand">← Back</button><h2 className="text-lg font-bold">Categories, types & budgets</h2>
  {err&&<p role="alert" className="text-sm text-red-500">{err}</p>}
  {d.cats.map(c=><div key={c.id} className="card space-y-2">
   <div className="flex items-center gap-2">
    <input aria-label="Icon" className="inp w-16 text-center text-xl" maxLength={2} defaultValue={c.icon} onBlur={e=>run(()=>db.categories.update(c.id!,{icon:e.target.value||'📦'}))}/>
    <input aria-label="Category name" className="inp" defaultValue={c.name} onBlur={e=>e.target.value.trim()&&run(()=>db.categories.update(c.id!,{name:e.target.value.trim()}))}/>
    <input type="color" aria-label="Colour" className="h-12 w-12 shrink-0 rounded-lg" defaultValue={c.colour} onChange={e=>run(()=>db.categories.update(c.id!,{colour:e.target.value}))}/>
    <button aria-label={`Delete ${c.name}`} className="h-12 w-12" onClick={()=>startDel(c)}>🗑️</button></div>
   <label className="block text-sm">Monthly budget (₹)<input inputMode="numeric" className="inp mt-1" placeholder="No budget set" defaultValue={c.budget||''} onBlur={e=>run(()=>db.categories.update(c.id!,{budget:+e.target.value.replace(/\D/g,'')||undefined}))}/></label>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked={!!(c.isVehicle||c.name==='Vehicle')} onChange={e=>run(()=>db.categories.update(c.id!,{isVehicle:e.target.checked}))}/>Show vehicle fields (vehicle, driver, odometer, litres)</label>
   <Chips list={d.types.filter(t=>t.categoryId===c.id)} onAdd={()=>addType(c.id,'expense')} onAdd2={()=>addType(c.id,'income')}/></div>)}
  <button onClick={addCat} className="btn w-full bg-brand text-white">+ New category</button>
  <div className="card space-y-2"><div className="font-semibold">💰 General income types</div><Chips list={d.types.filter(t=>t.kind==='income'&&!t.categoryId)} onAdd={()=>addType(undefined,'income')}/></div>
  {del&&<div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4"><div className="card mx-auto w-full max-w-md space-y-3 dark:bg-[#171A21]"><p>"{del.c.name}" has {d.counts[del.c.id!]} entries. Move them to:</p>
   <select aria-label="Move entries to" className="inp" value={del.to} onChange={e=>setDel({...del,to:e.target.value})}><option value="0">Uncategorised</option>{d.cats.filter(x=>x.id!==del.c.id).map(x=><option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}</select>
   <div className="grid grid-cols-2 gap-2"><button className="btn bg-white dark:bg-white/10" onClick={()=>setDel(null)}>Cancel</button><button className="btn bg-red-600 text-white" onClick={doDel}>Move & delete</button></div></div></div>}
 </div>}
