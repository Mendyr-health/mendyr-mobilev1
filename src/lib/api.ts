import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const base = (process.env.EXPO_PUBLIC_API_URL || 'https://mendyr-backend-v1.fastapicloud.dev').replace(/\/+$/, '');
const ACCESS_KEY = 'mendyr.access-token';
const REFRESH_KEY = 'mendyr.refresh-token';
export class ApiError extends Error { constructor(message:string, public status:number, public code='http_error'){ super(message); } }
type Envelope<T>={success:boolean;data:T;error:{code:string;message:string}|null};
type Tokens={access_token:string;refresh_token?:string|null};

// SecureStore has no web implementation, so the web build keeps tokens in AsyncStorage (localStorage).
const store = Platform.OS === 'web'
  ? { get:(k:string)=>AsyncStorage.getItem(k), set:(k:string,v:string)=>AsyncStorage.setItem(k,v), del:(k:string)=>AsyncStorage.removeItem(k) }
  : { get:(k:string)=>SecureStore.getItemAsync(k), set:(k:string,v:string)=>SecureStore.setItemAsync(k,v), del:(k:string)=>SecureStore.deleteItemAsync(k) };

let token:string|null=null;
let refreshToken:string|null=null;
let refreshInFlight:Promise<boolean>|null=null;
let onSessionEnded:(()=>void)|null=null;

// Auth calls that must never trigger a silent refresh (they start or end a session, or are the refresh itself).
const NO_REFRESH=['/auth/login','/auth/register','/auth/token/refresh','/auth/logout'];

/** Called when a request is rejected and the session can't be refreshed. */
export function setSessionEndedHandler(handler:(()=>void)|null){ onSessionEnded=handler; }

export async function restoreToken(){
  try { [token,refreshToken]=await Promise.all([store.get(ACCESS_KEY),store.get(REFRESH_KEY)]); }
  catch { token=null; refreshToken=null; }
  return token ?? refreshToken;
}

/** Persist the session tokens; pass null to clear them. */
export async function saveTokens(value:Tokens|null){
  token=value?.access_token??null;
  if(value?.refresh_token!==undefined) refreshToken=value.refresh_token;
  if(!value) refreshToken=null;
  try {
    await (token?store.set(ACCESS_KEY,token):store.del(ACCESS_KEY));
    await (refreshToken?store.set(REFRESH_KEY,refreshToken):store.del(REFRESH_KEY));
  } catch { /* storage unavailable — the session still works until the app closes */ }
}

export const saveToken = (tokenValue: string | null) =>
  saveTokens(tokenValue ? { access_token: tokenValue } : null);


/** Swap the refresh token for a new access token. Concurrent 401s share one attempt. */
function refreshSession():Promise<boolean>{
  if(!refreshToken) return Promise.resolve(false);
  refreshInFlight??=fetch(`${base}/api/v1/auth/token/refresh`,{method:'POST',credentials:'include',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})})
    .then(async(response)=>{
      if(!response.ok) return false;
      const payload=await response.json() as Envelope<Tokens>;
      if(!payload?.success||!payload.data?.access_token) return false;
      await saveTokens(payload.data);
      return true;
    })
    .catch(()=>false)
    .finally(()=>{ refreshInFlight=null; });
  return refreshInFlight;
}

export async function api<T>(path:string, init:{method?:string;body?:unknown}={}, retried=false) : Promise<T> {
  if(!base) throw new ApiError('Set EXPO_PUBLIC_API_URL before connecting Mendyr.',0,'configuration');
  let response:Response;
  try { response=await fetch(`${base}/api/v1${path}`,{method:init.method??'GET',credentials:'include',headers:{Accept:'application/json',...(init.body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:init.body===undefined?undefined:JSON.stringify(init.body)}); }
  catch { throw new ApiError("Can't reach Mendyr right now. Check your connection.",0,'network'); }
  if(response.status===401&&!retried&&!NO_REFRESH.some((p)=>path.startsWith(p))){
    if(await refreshSession()) return api<T>(path,init,true);
    // The refresh token is gone too (expired, revoked, logged out elsewhere), so the session is over.
    await saveTokens(null);
    onSessionEnded?.();
    throw new ApiError('Your session has ended. Please log in again.',401,'session_ended');
  }
  let payload:Envelope<T>|null=null; try { payload=await response.json() as Envelope<T>; } catch { /* handled below */ }
  if(!response.ok||!payload?.success) throw new ApiError(payload?.error?.message??`Something went wrong (${response.status}).`,response.status,payload?.error?.code);
  return payload.data;
}
