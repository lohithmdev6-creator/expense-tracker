import {db,Rule} from './db'
import {addDays,iso,today} from '../utils/format'
export function nth(r:Rule,i:number):string{
 const [y,m,d]=r.startDate.split('-').map(Number)
 if(r.frequency==='weekly')return addDays(r.startDate,7*i)
 if(r.frequency==='custom'&&r.unit!=='months')return addDays(r.startDate,(r.every||1)*i)
 const k=(r.frequency==='yearly'?12:r.frequency==='monthly'?1:(r.every||1))*i
 const t=new Date(y,m-1+k,1),dim=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();t.setDate(Math.min(d,dim));return iso(t)}
export async function generate(){
 const hz=addDays(today(),90)
 for(const r of (await db.rules.toArray()).filter(x=>!x.paused))for(let i=0;i<500;i++){
  const d=nth(r,i);if(d>hz||(r.endDate&&d>r.endDate))break
  if(!(await db.occ.where('[ruleId+dueDate]').equals([r.id!,d]).count()))await db.occ.add({ruleId:r.id!,dueDate:d,status:'pending'})}}
