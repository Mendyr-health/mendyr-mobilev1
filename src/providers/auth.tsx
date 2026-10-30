import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, restoreToken, saveToken } from '@/lib/api';
import type { TokenPair, User } from '@/lib/types';

type Auth = { user:User|null; ready:boolean; login:(email:string,password:string)=>Promise<User>; register:(input:Record<string,string>)=>Promise<User>; logout:()=>Promise<void> };
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null); const [ready,setReady]=useState(false);
 useEffect(()=>{ restoreToken().then(async(t)=>{if(t) try{setUser(await api<User>('/auth/me'));}catch{await saveToken(null);} setReady(true);});},[]);
 const value=useMemo<Auth>(()=>({user,ready,
  async login(email,password){const result=await api<TokenPair>('/auth/login',{method:'POST',body:{email,password}}); await saveToken(result.access_token);setUser(result.user);return result.user;},
  async register(input){const result=await api<TokenPair>('/auth/register',{method:'POST',body:input});await saveToken(result.access_token);setUser(result.user);return result.user;},
  async logout(){try{await api('/auth/logout',{method:'POST'});}finally{await saveToken(null);setUser(null);}}
 }),[user,ready]); return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('useAuth must be within AuthProvider');return value;}
