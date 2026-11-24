import {useLiveQuery} from 'dexie-react-hooks'
import {db,getSetting,setSetting} from '../db/db'
import {inr,rangeFor} from '../utils/format'
export default function Budgets({onBack}:{onBack:()=>void}){
 const d=useLiveQuery(async()=>{const [a,b]=rangeFor('This month'),sp:Record<number,number>={}
  ;(await db.txns.where('date').between(a,b,true,true).toArray()).filter(t=>t.kind==='expense'&&t.categoryId).forEach(t=>{sp[t.categoryId!]=(sp[t.categoryId!]||0)+t.amount})
  return {cats:await db.categories.toArray(),sp,overall:await getSetting<number>('budget',0)}},[])
 if(!d)return null
 const sum=d.cats.reduce((s,c)=>s+(c.budget||0),0),num=(v:string)=>+v.replace(/\D/g,'')||0
 return <div className="space-y-4">
  <button onClick={onBack} className="min-h-[48px] text-brand">← Back</button>
  <div><h2 className="text-lg font-bold">Budgets</h2><p className="text-sm text-slate-500 dark:text-slate-400">Monthly limits. Leave a field empty for no budget.</p></div>
  <label className="card block text-sm font-medium">Overall monthly budget (₹)<input inputMode="numeric" className="inp mt-2" placeholder="No budget" defaultValue={d.overall||''} onBlur={e=>setSetting('budget',num(e.target.value))}/>
   <span className="mt-2 block text-xs font-normal text-slate-500 dark:text-slate-400">Used for the progress ring and the month-end forecast.</span></label>
  <div className="card space-y-4"><div className="font-semibold">By category</div>
   {d.cats.map(c=><label key={c.id} className="block text-sm"><span>{c.icon} {c.name}</span><span className="float-right text-xs text-slate-500 dark:text-slate-400">This month {inr(d.sp[c.id!]||0)}</span>
    <input inputMode="numeric" className="inp mt-1" placeholder="No budget" defaultValue={c.budget||''} onBlur={e=>db.categories.update(c.id!,{budget:num(e.target.value)||undefined})}/></label>)}
   {sum>0&&<p className="text-xs text-slate-500 dark:text-slate-400">Category budgets add up to {inr(sum)}{d.overall&&sum>d.overall?', which is more than your overall budget.':'.'}</p>}</div></div>}
