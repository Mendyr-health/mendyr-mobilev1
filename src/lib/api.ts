import * as SecureStore from 'expo-secure-store';

const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const key = 'mendyr.access-token';
export class ApiError extends Error { constructor(message:string, public status:number, public code='http_error'){ super(message); } }
type Envelope<T>={success:boolean;data:T;error:{code:string;message:string}|null};
let token:string|null=null;
export async function restoreToken(){ token=await SecureStore.getItemAsync(key); return token; }
export async function saveToken(value:string|null){ token=value; if(value) await SecureStore.setItemAsync(key,value); else await SecureStore.deleteItemAsync(key); }
export async function api<T>(path:string, init:{method?:string;body?:unknown}={}) : Promise<T> {
  if(!base) throw new ApiError('Set EXPO_PUBLIC_API_URL before connecting Mendyr.',0,'configuration');
  let response:Response;
  try { response=await fetch(`${base}/api/v1${path}`,{method:init.method??'GET',headers:{Accept:'application/json',...(init.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:init.body===undefined?undefined:JSON.stringify(init.body)}); }
  catch { throw new ApiError("Can't reach Mendyr right now. Check your connection.",0,'network'); }
  let payload:Envelope<T>|null=null; try { payload=await response.json() as Envelope<T>; } catch { /* handled below */ }
  if(!response.ok||!payload?.success) throw new ApiError(payload?.error?.message??`Something went wrong (${response.status}).`,response.status,payload?.error?.code);
  return payload.data;
}
