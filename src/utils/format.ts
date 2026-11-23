const p=(n:number)=>String(n).padStart(2,'0')
export const iso=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
export const today=()=>iso(new Date())
export const addDays=(s:string,n:number)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return iso(d)}
export const daysBetween=(a:string,b:string)=>Math.round((+new Date(b+'T00:00:00')-+new Date(a+'T00:00:00'))/864e5)
export const inr=(n:number)=>'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2})
export const RANGES=['Today','This week','This month','Last month','Last 3 months','This financial year']
export function rangeFor(r:string):[string,string]{if(r.startsWith('custom:')){const [,a,b]=r.split(':');return[a,b]}
 const d=new Date(),y=d.getFullYear(),m=d.getMonth(),t=iso(d)
 switch(r){
 case 'Today':return[t,t]
 case 'This week':{const s=new Date(d);s.setDate(d.getDate()-((d.getDay()+6)%7));return[iso(s),iso(new Date(s.getFullYear(),s.getMonth(),s.getDate()+6))]}
 case 'Last month':return[iso(new Date(y,m-1,1)),iso(new Date(y,m,0))]
 case 'Last 3 months':return[iso(new Date(y,m-2,1)),iso(new Date(y,m+1,0))]
 case 'This financial year':{const sy=m>=3?y:y-1;return[`${sy}-04-01`,`${sy+1}-03-31`]}
 default:return[iso(new Date(y,m,1)),iso(new Date(y,m+1,0))]}}
export const dayLabel=(s:string)=>new Date(s+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})
