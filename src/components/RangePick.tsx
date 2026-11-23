import {RANGES,iso,today} from '../utils/format'
export default function RangePick({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const custom=value.startsWith('custom:'),[,a,b]=custom?value.split(':'):[]
 return <div className="flex-1 space-y-2">
  <select aria-label="Date range" className="inp" value={custom?'Custom':value} onChange={e=>{const v=e.target.value;if(v==='Custom'){const d=new Date();onChange(`custom:${iso(new Date(d.getFullYear(),d.getMonth(),1))}:${today()}`)}else onChange(v)}}>
   {[...RANGES,'Custom'].map(r=><option key={r} value={r}>{r==='Custom'?'Custom range':r}</option>)}</select>
  {custom&&<div className="flex items-center gap-2"><input type="date" aria-label="Start date" className="inp" value={a} max={b} onChange={e=>e.target.value&&onChange(`custom:${e.target.value}:${b}`)}/><span aria-hidden>→</span>
   <input type="date" aria-label="End date" className="inp" value={b} min={a} onChange={e=>e.target.value&&onChange(`custom:${a}:${e.target.value}`)}/></div>}</div>}
