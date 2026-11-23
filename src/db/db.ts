import Dexie,{Table} from 'dexie'
export type Kind='expense'|'income'
export interface Category{id?:number;name:string;icon:string;colour:string}
export interface ExpenseType{id?:number;categoryId?:number;kind:Kind;name:string}
export interface Vehicle{id?:number;name:string}
export interface Driver{id?:number;name:string;phone?:string}
export interface Txn{id?:number;kind:Kind;amount:number;date:string;categoryId?:number;typeId?:number;vehicleId?:number;driverId?:number;reason?:string;paymentMode?:string;tags?:string[];odometer?:number;litres?:number;createdAt:number;updatedAt:number}
class DB extends Dexie{
 categories!:Table<Category>;types!:Table<ExpenseType>;vehicles!:Table<Vehicle>;drivers!:Table<Driver>;txns!:Table<Txn>;settings!:Table<{key:string;value:any}>
 constructor(){super('expense-tracker');this.version(1).stores({categories:'++id,name',types:'++id,categoryId,kind',vehicles:'++id',drivers:'++id',txns:'++id,date,categoryId,typeId,driverId,vehicleId',settings:'key'})}
}
export const db=new DB()
export async function getSetting<T>(k:string,d:T):Promise<T>{return (await db.settings.get(k))?.value??d}
export const setSetting=(k:string,value:any)=>db.settings.put({key:k,value})
export async function seed(){
 if(await db.categories.count())return
 const v=await db.categories.add({name:'Vehicle',icon:'🚗',colour:'#0F766E'})
 const h=await db.categories.add({name:'Home',icon:'🏠',colour:'#B45309'})
 const mk=(c:number,names:string[])=>names.map(name=>({categoryId:c,kind:'expense' as Kind,name}))
 await db.types.bulkAdd([...mk(v as number,['Fuel','Driver salary','Service','Insurance','Repairs','Parking/Toll','Tyres']),
  ...mk(h as number,['Rent/EMI','Electricity','Water','Groceries','Maid','Internet','Gas','Maintenance']),
  ...['Salary','Rent received','Other'].map(name=>({kind:'income' as Kind,name}))])
 await db.vehicles.bulkAdd([{name:'Car'},{name:'Bike'}])
}
export async function loadSample(){
 const cats=await db.categories.toArray(),types=await db.types.toArray(),n=Date.now()
 const c=(s:string)=>cats.find(x=>x.name===s)?.id,t=(s:string)=>types.find(x=>x.name===s)?.id
 const d=(k:number)=>{const x=new Date();x.setDate(x.getDate()-k);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
 const rows:Partial<Txn>[]=[
  {kind:'income',amount:85000,date:d(6),typeId:t('Salary'),reason:'Salary'},
  {kind:'expense',amount:3200,date:d(5),categoryId:c('Vehicle'),typeId:t('Fuel'),litres:32,odometer:12400,paymentMode:'UPI'},
  {kind:'expense',amount:18000,date:d(4),categoryId:c('Home'),typeId:t('Rent/EMI'),paymentMode:'Bank'},
  {kind:'expense',amount:4300,date:d(3),categoryId:c('Home'),typeId:t('Groceries'),paymentMode:'Card'},
  {kind:'expense',amount:1450,date:d(2),categoryId:c('Home'),typeId:t('Electricity'),paymentMode:'UPI'},
  {kind:'expense',amount:3400,date:d(1),categoryId:c('Vehicle'),typeId:t('Fuel'),litres:33,odometer:12830,paymentMode:'UPI'}]
 await db.txns.bulkAdd(rows.map(r=>({...r,createdAt:n,updatedAt:n}) as Txn))
}
