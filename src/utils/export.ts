import Papa from 'papaparse'
import {Txn,Category,ExpenseType,Vehicle,Driver} from '../db/db'
import {deliver} from './share'
export interface Ctx{cats:Category[];types:ExpenseType[];veh:Vehicle[];drv:Driver[]}
const rs=(n:number)=>'Rs. '+n.toLocaleString('en-IN',{maximumFractionDigits:2})
export const flat=(t:Txn,c:Ctx)=>({date:t.date,kind:t.kind,category:c.cats.find(x=>x.id===t.categoryId)?.name||'',type:c.types.find(x=>x.id===t.typeId)?.name||'',vehicle:c.veh.find(x=>x.id===t.vehicleId)?.name||'',driver:c.drv.find(x=>x.id===t.driverId)?.name||'',amount:t.amount,reason:t.reason||'',payment_mode:t.paymentMode||'',tags:(t.tags||[]).join(';'),odometer:t.odometer??'',litres:t.litres??''})
export const exportCsv=(rows:Txn[],c:Ctx,name:string)=>deliver(name+'.csv','text/csv',Papa.unparse(rows.map(t=>flat(t,c))))
export async function exportPdf(rows:Txn[],c:Ctx,filters:string,name:string){
 const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')])
 const doc=new jsPDF(),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),head={fillColor:[8,145,178] as [number,number,number]}
 const ex=rows.filter(t=>t.kind==='expense'),exp=ex.reduce((s,t)=>s+t.amount,0),inc=rows.filter(t=>t.kind==='income').reduce((s,t)=>s+t.amount,0)
 doc.setFontSize(18);doc.text('Expense Tracker report',14,16);doc.setFontSize(9);doc.setTextColor(90);doc.text(doc.splitTextToSize(filters,W-28),14,23)
 autoTable(doc,{startY:34,head:[['Income','Expenses','Net']],body:[[rs(inc),rs(exp),rs(inc-exp)]],theme:'grid',headStyles:head})
 const by:Record<string,number>={};ex.forEach(t=>{const k=c.cats.find(x=>x.id===t.categoryId)?.name||'Uncategorised';by[k]=(by[k]||0)+t.amount})
 if(exp>0)autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+8,head:[['Category','Spent','Share']],body:Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,rs(v),Math.round(v/exp*100)+'%']),headStyles:head})
 autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+8,head:[['Date','Category','Type','Details','Mode','Amount']],
  body:rows.map(t=>{const f=flat(t,c);return [f.date,f.category,f.type,[f.reason,f.vehicle,f.driver,t.receipt?'(receipt)':''].filter(Boolean).join(', '),f.payment_mode,(t.kind==='expense'?'-':'+')+rs(t.amount)]}),
  styles:{fontSize:8},columnStyles:{5:{halign:'right'}},headStyles:head})
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.text(`Page ${i} of ${n}`,W/2,H-8,{align:'center'})}
 await deliver(name+'.pdf','application/pdf',doc.output('blob'))}
