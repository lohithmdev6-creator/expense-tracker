import {useState} from 'react'
import Papa from 'papaparse'
import {db,Txn,Kind} from '../db/db'
const FIELDS:[string,string][]=[['date','Date *'],['amount','Amount *'],['kind','Income / Expense'],['category','Category'],['type','Type'],['vehicle','Vehicle'],['driver','Driver'],['reason','Reason / note'],['payment_mode','Payment mode'],['tags','Tags'],['odometer','Odometer'],['litres','Litres']]
const ALIAS:Record<string,string[]>={date:['date','day','transactiondate','txndate'],amount:['amount','amt','value','rs','inr'],kind:['kind','incomeexpense','incomeorexpense','direction','drcr'],category:['category','cat'],type:['type','subtype','expensetype'],vehicle:['vehicle'],driver:['driver'],reason:['reason','description','note','notes','memo','details','narration','remarks'],payment_mode:['paymentmode','payment','mode','method'],tags:['tags','tag','labels'],odometer:['odometer','odo','km'],litres:['litres','liters','qty']}
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,''),pad=(n:number)=>String(n).padStart(2,'0'),num=(s:string)=>parseFloat((s||'').replace(/,/g,''))||undefined
function parseDate(v:string,mf:boolean):string|null{const s=(v||'').trim();let m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/),y:number,mo:number,d:number
 if(m){y=+m[1];mo=+m[2];d=+m[3]}else{m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);if(!m)return null;const a=+m[1],b=+m[2];y=+m[3];if(y<100)y+=2000;d=mf?b:a;mo=mf?a:b}
 const t=new Date(y,mo-1,d);return t.getFullYear()===y&&t.getMonth()===mo-1&&t.getDate()===d?`${y}-${pad(mo)}-${pad(d)}`:null}
function parseAmount(v:string){const s=(v||'').replace(/[₹,\s]|rs\.?|inr/gi,'');const n=parseFloat(s.replace(/[()-]/g,''));return isNaN(n)?null:Math.abs(n)}
const parseKind=(v:string,def:Kind):Kind=>{const s=norm(v);return /^(i|inc|income|credit|cr|received|deposit)/.test(s)?'income':/^(e|exp|expense|debit|dr|paid|spent)/.test(s)?'expense':def}
const pm=(s:string)=>['Cash','UPI','Card','Bank'].find(x=>x.toLowerCase()===s.toLowerCase())||s
export default function ImportCsv({onBack}:{onBack:()=>void}){
 const [step,setStep]=useState<'pick'|'map'|'review'|'done'>('pick'),[rows,setRows]=useState<any[]>([]),[heads,setHeads]=useState<string[]>([]),[map,setMap]=useState<Record<string,string>>({})
 const [defKind,setDef]=useState<Kind>('expense'),[mf,setMf]=useState(false),[skip,setSkip]=useState(true),[auto,setAuto]=useState(true),[err,setErr]=useState(''),[plan,setPlan]=useState<any[]>([]),[res,setRes]=useState<any>(null),[busy,setBusy]=useState(false)
 const pick=(e:any)=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;setErr('')
  Papa.parse(f,{header:true,skipEmptyLines:true,complete:(r:any)=>{const h=(r.meta.fields||[]).filter(Boolean);if(!h.length||!r.data.length){setErr('No rows found. Choose a CSV file that has a header row.');return}
   const m:Record<string,string>={};for(const [k] of FIELDS){const hit=h.find((x:string)=>ALIAS[k].includes(norm(x)));if(hit)m[k]=hit}
   setHeads(h);setRows(r.data);setMap(m);setStep('map')},error:(x:any)=>setErr('Could not read the file: '+x.message)})}
 const review=async()=>{try{setErr('')
  if(!map.date||!map.amount){setErr('Please choose which columns hold the Date and the Amount.');return}
  const seen=new Set((await db.txns.toArray()).map(t=>`${t.date}|${t.amount}|${(t.reason||'').trim().toLowerCase()}`)),g=(r:any,k:string)=>map[k]?String(r[map[k]]??'').trim():''
  setPlan(rows.map((r,i)=>{const date=parseDate(g(r,'date'),mf),amount=parseAmount(g(r,'amount')),reason=g(r,'reason');let status='ok',why=''
   if(!date){status='bad';why='Invalid date'}else if(!amount){status='bad';why='Invalid amount'}else if(seen.has(`${date}|${amount}|${reason.toLowerCase()}`))status='dup'
   return {i,date,amount,reason,status,why,kind:parseKind(g(r,'kind'),defKind),category:g(r,'category'),type:g(r,'type'),vehicle:g(r,'vehicle'),driver:g(r,'driver'),pay:g(r,'payment_mode'),tags:g(r,'tags'),odo:g(r,'odometer'),lit:g(r,'litres')}}))
  setStep('review')}catch(e:any){setErr('Could not check the file: '+e.message)}}
 const run=async()=>{setBusy(true);try{const use=plan.filter(p=>p.status==='ok'||(p.status==='dup'&&!skip));let made=0
  await db.transaction('rw',db.categories,db.types,db.vehicles,db.drivers,db.txns,async()=>{
   const cats=new Map((await db.categories.toArray()).map(c=>[c.name.toLowerCase(),c.id!])),types=new Map<string,number>((await db.types.toArray()).map(t=>[`${t.kind}|${t.categoryId??0}|${t.name.toLowerCase()}`,t.id!]))
   const veh=new Map((await db.vehicles.toArray()).map(v=>[v.name.toLowerCase(),v.id!])),drv=new Map((await db.drivers.toArray()).map(v=>[v.name.toLowerCase(),v.id!])),pal=['#6366F1','#10B981','#F59E0B','#EC4899','#0EA5E9','#8B5CF6'],n=Date.now(),out:Txn[]=[]
   for(const p of use){let categoryId:number|undefined,typeId:number|undefined,vehicleId:number|undefined,driverId:number|undefined
    if(p.category){const k=p.category.toLowerCase();categoryId=cats.get(k);if(!categoryId&&auto){categoryId=await db.categories.add({name:p.category,icon:'📦',colour:pal[cats.size%pal.length]}) as number;cats.set(k,categoryId);made++}}
    if(p.type){const k=`${p.kind}|${categoryId??0}|${p.type.toLowerCase()}`;typeId=types.get(k)||(p.kind==='income'?types.get(`income|0|${p.type.toLowerCase()}`):undefined);if(!typeId&&auto&&(p.kind==='income'||categoryId)){typeId=await db.types.add({name:p.type,kind:p.kind,categoryId}) as number;types.set(k,typeId);made++}}
    if(p.vehicle){const k=p.vehicle.toLowerCase();vehicleId=veh.get(k);if(!vehicleId&&auto){vehicleId=await db.vehicles.add({name:p.vehicle}) as number;veh.set(k,vehicleId);made++}}
    if(p.driver){const k=p.driver.toLowerCase();driverId=drv.get(k);if(!driverId&&auto){driverId=await db.drivers.add({name:p.driver}) as number;drv.set(k,driverId);made++}}
    out.push({kind:p.kind,amount:p.amount,date:p.date,categoryId,typeId,vehicleId,driverId,reason:p.reason||undefined,paymentMode:p.pay?pm(p.pay):undefined,tags:p.tags?p.tags.split(/[;,]/).map((s:string)=>s.trim()).filter(Boolean):undefined,odometer:num(p.odo),litres:num(p.lit),createdAt:n,updatedAt:n})}
   await db.txns.bulkAdd(out);setRes({added:out.length,made})})
  setStep('done')}catch(e:any){setErr('Import failed, nothing was changed: '+(e?.message||e))}finally{setBusy(false)}}
 const ok=plan.filter(p=>p.status==='ok').length,dup=plan.filter(p=>p.status==='dup').length,bad=plan.filter(p=>p.status==='bad').length,Sel=(p:any)=><select className="inp" {...p}/>
 return <div className="space-y-3">
  <button onClick={step==='pick'||step==='done'?onBack:()=>setStep(step==='review'?'map':'pick')} className="min-h-[48px] text-brand">← {step==='pick'||step==='done'?'Back':'Previous step'}</button>
  <h2 className="text-lg font-bold">Import from CSV</h2>
  {err&&<p role="alert" className="text-sm text-red-500">{err}</p>}
  {step==='pick'&&<div className="card space-y-3"><p className="text-sm">Bring in old records from a CSV file, for example one exported from this app on another phone, or a spreadsheet saved as CSV.</p>
   <label className="btn grad flex items-center justify-center text-white">Choose CSV file<input type="file" accept=".csv,text/csv" className="sr-only" onChange={pick}/></label>
   <p className="text-xs text-slate-500 dark:text-slate-400">CSV carries transactions only. To move everything (receipts, budgets, rules) to another phone, use Back up and Restore instead.</p></div>}
  {step==='map'&&<><div className="card space-y-3"><p className="text-sm">Found {rows.length} rows. Match your columns to the app's fields.</p>
   {FIELDS.map(([k,l])=><label key={k} className="block text-sm">{l}<Sel aria-label={l} value={map[k]||''} onChange={(e:any)=>setMap({...map,[k]:e.target.value})}><option value="">Not in my file</option>{heads.map(h=><option key={h} value={h}>{h}</option>)}</Sel></label>)}
   <label className="block text-sm">If there is no Income / Expense column, treat rows as<Sel value={defKind} onChange={(e:any)=>setDef(e.target.value)}><option value="expense">Expenses</option><option value="income">Income</option></Sel></label>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mf} onChange={e=>setMf(e.target.checked)}/>Dates are month first (03/25/2026)</label></div>
   <button onClick={review} className="btn grad w-full text-white">Check my data</button></>}
  {step==='review'&&<><div className="card space-y-1 text-sm"><div><b>{ok}</b> ready to import</div>{dup>0&&<div className="text-amber-600 dark:text-amber-300"><b>{dup}</b> look like duplicates (same date, amount and reason)</div>}{bad>0&&<div className="text-out"><b>{bad}</b> have a problem and will be skipped</div>}
    <label className="flex items-center gap-2 pt-2"><input type="checkbox" checked={skip} onChange={e=>setSkip(e.target.checked)}/>Skip likely duplicates</label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>Create categories, types, vehicles and drivers that don't exist yet</label></div>
   <div className="card divide-y divide-slate-100 p-0 dark:divide-white/10">{plan.slice(0,25).map(p=><div key={p.i} className="flex items-center justify-between gap-3 px-4 py-2 text-sm"><div className="min-w-0"><div className="truncate">{p.date||'?'} · {[p.category,p.type,p.reason].filter(Boolean).join(' · ')||'No details'}</div>
    {p.status!=='ok'&&<div className={`text-xs ${p.status==='bad'?'text-out':'text-amber-600 dark:text-amber-300'}`}>{p.status==='bad'?p.why:'Likely duplicate'}</div>}</div><div className={p.kind==='income'?'text-inc':''}>{p.amount??'?'}</div></div>)}</div>
   {plan.length>25&&<p className="text-xs text-slate-500">Showing the first 25 of {plan.length} rows.</p>}
   <button disabled={busy||ok+(skip?0:dup)===0} onClick={run} className="btn grad w-full text-white disabled:opacity-40">{busy?'Importing…':`Import ${ok+(skip?0:dup)} rows`}</button></>}
  {step==='done'&&res&&<div className="card space-y-2 text-sm"><div className="text-lg font-bold">Import complete</div><div>{res.added} transactions added.</div>{res.made>0&&<div>{res.made} new categories, types, vehicles or drivers created.</div>}{dup>0&&skip&&<div>{dup} duplicates skipped.</div>}{bad>0&&<div>{bad} rows skipped because of problems.</div>}
   <button onClick={onBack} className="btn grad mt-2 w-full text-white">Done</button></div>}
 </div>}
