export const inr = (amount:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount);
export const dateTime = (value:string) => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value));
export const addressLine = (a:{line1:string;line2:string|null;landmark:string|null;city:string;pincode:string}) => [a.line1,a.line2,a.landmark,`${a.city} ${a.pincode}`].filter(Boolean).join(', ');
export const statusLabel = (s:string) => ({searching:'Finding a professional',assigned:'Confirmed',confirmed:'Confirmed',en_route:'On the way',in_progress:'Visit in progress',completed:'Completed',failed:'Not fulfilled'}[s] ?? s.replace('_',' '));
export const query = (params:Record<string,string|number|null|undefined>) => { const s=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>v!==null&&v!==undefined&&v!==''&&s.set(k,String(v))); return s.toString()?`?${s}`:''; };
