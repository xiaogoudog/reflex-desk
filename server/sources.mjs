const agent = "Reflex Desk financial research (https://reflex-desk-k7m4.paperyfable16.chatgpt.site)";
export async function get(url, type="text") {
  const response = await fetch(url, {headers:{"User-Agent":agent,Accept:type==="json"?"application/json":"*/*"}, signal:AbortSignal.timeout(14500)});
  if (!response.ok) throw Error("HTTP "+response.status+" · "+new URL(url).hostname);
  return type==="json" ? response.json() : response.text();
}
export const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export const round = (v,d=2)=>Number(v.toFixed(d));
export const numeric = v=>v!==null && v!==undefined && String(v).trim()!=="" && Number.isFinite(Number(v));
export const fredUrl = id=>"https://fred.stlouisfed.org/series/"+id;
export async function fred(ids, years=3) {
  const since=(Number(today().slice(0,4))-years)+"-01-01";
  const raw=await get("https://fred.stlouisfed.org/graph/fredgraph.csv?id="+ids.join(",")+"&cosd="+since);
  const [head,...lines]=raw.trim().replace(/^\uFEFF/,"").split(/\r?\n/);
  const fields=head.split(","), end=today();
  const indexes=ids.map(id=>fields.indexOf(id));
  if(indexes.includes(-1))throw Error("FRED 序列字段已变更");
  return lines.map(line=>{
    const cells=line.split(","), row={date:cells[0]};
    indexes.forEach((index,i)=>{if(numeric(cells[index]))row[ids[i]]=Number(cells[index]);});
    return row;
  }).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date<=end);
}
export function metric(id,name,unit,rows,props={}) {
  const points=rows.filter(r=>Number.isFinite(r.value)).map(r=>({...r,value:round(r.value,4)}));
  if(!points.length) return null;
  return {id,name,unit,...points.at(-1),history:points.slice(-60),...props};
}
export const seq=(rows,key)=>rows.filter(r=>Number.isFinite(r[key])).map(r=>({date:r.date,value:r[key],...(r.source?{url:r.source}:{})}));
export function changeMonths(rows,key,lag) {
  const values=new Map(rows.map(r=>[r.date,r[key]]));
  return rows.flatMap(r=>{
    const [y,m]=r.date.split("-").map(Number);
    const base=values.get(new Date(Date.UTC(y,m-1-lag,1)).toISOString().slice(0,10));
    return Number.isFinite(r[key])&&Number.isFinite(base)&&base!==0?[{date:r.date,value:(r[key]/base-1)*100}]:[];
  });
}
export function plain(s="") {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/&(?:nbsp|#160|#xA0);/gi," ").replace(/&amp;/g,"&").replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(Math.min(parseInt(n,16),0x10ffff))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff))).replace(/&(?:rsquo|apos);/g,"'").replace(/&quot;/g,'"').replace(/&(?:ndash|mdash);/g,"-").replace(/\s+/g," ").trim();
}
export function tag(s,name){return plain(s.match(new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)</"+name+">","i"))?.[1]||"");}
export function rss(xml,host) {
  const out=[];
  for(const [,raw] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
    const title=tag(raw,"title"),url=tag(raw,"link"),stamp=Date.parse(tag(raw,"pubDate"));
    if(!title||!url.startsWith("https://"+host+"/")||!Number.isFinite(stamp)||stamp>Date.now()+60000)continue;
    out.push({title,url,date:new Date(stamp).toISOString()});
  }
  if(!out.length)throw Error("公告源暂无可核验条目");
  return out.sort((a,b)=>b.date.localeCompare(a.date));
}
export function packed(metrics,extra={}) {
  const items=metrics.filter(Boolean);
  if(!items.length&&!extra.events?.length)throw Error("来源未返回可核验数据");
  return {metrics:items,events:[],legacy:[],...extra};
}
