export async function deliver(name:string,type:string,data:BlobPart){
 const file=new File([data],name,{type})
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});return}}catch(e:any){if(e?.name==='AbortError')return}
 const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)}
