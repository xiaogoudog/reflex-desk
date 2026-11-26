const safeLink=u=>typeof u==="string"&&/^https?:\/\//i.test(u);
function observations(data){
  const entries=new Map();
  for(const m of data.metrics||[]){
    const history=[...(m.history||[]),m];
    for(const p of history){
      if(!p.date||!Number.isFinite(p.value))continue;
      const latest=p.date===m.date,range=m.display!==undefined;
      const value=p.display??(latest?m.display:undefined);
      if(range&&value===undefined)continue;
      const source=p.url||m.url;if(!safeLink(source))continue;
      const item=m.id+"@"+p.date;
      entries.set(item,{item,period:p.date,label:m.name,unit:m.unit,reading:String(value??p.value),source,provider:m.provider});
    }
  }
  for(const e of data.events||[]){
    if(!e.date||!safeLink(e.url))continue;
    const item="event@"+e.url;
    entries.set(item,{item,period:e.date,label:e.label||"公告",unit:"",reading:e.title,source:e.url,provider:e.provider});
  }
  return [...entries.values()].sort((a,b)=>a.period.localeCompare(b.period)||a.item.localeCompare(b.item));
}
const extract=(field)=>"json_extract(j.value,'$."+field+"')";
const item=extract("item"),reading=extract("reading");
const leaseCheck="EXISTS(SELECT 1 FROM research_feeds WHERE feed_key=? AND token=?)";
const diffSql=`INSERT INTO research_changes(feed,item,period,label,unit,reading,previous,source,provider,seen)
  SELECT ?,${item},${extract("period")},${extract("label")},${extract("unit")},${reading},p.reading,${extract("source")},${extract("provider")},?
  FROM json_each(?) AS j LEFT JOIN research_readings AS p ON p.feed=? AND p.item=${item}
  WHERE (p.item IS NULL OR p.reading<>${reading}) AND ${leaseCheck}`;
const readSql=`INSERT INTO research_readings(feed,item,reading)
  SELECT ?,${item},${reading} FROM json_each(?) AS j WHERE ${leaseCheck}
  ON CONFLICT(feed,item) DO UPDATE SET reading=excluded.reading WHERE reading<>excluded.reading`;

export async function persist(db,key,token,next,oldHash,allowArchive){
  const statements=[];
  let hash=oldHash||null;
  if(allowArchive&&next.payload){
    const rows=observations(next.payload);
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(rows.map(p=>[p.item,p.reading]))));
    hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
    if(hash!==oldHash){
      for(let i=0;i<rows.length;i+=90){
        const chunk=JSON.stringify(rows.slice(i,i+90));
        statements.push(db.prepare(diffSql).bind(key,next.success,chunk,key,key,token),db.prepare(readSql).bind(key,chunk,key,token));
      }
    }
  }
  statements.push(db.prepare("UPDATE research_feeds SET payload=?,checked=?,success=?,issue=?,lease=0,token=NULL,archive_hash=? WHERE feed_key=? AND token=?").bind(next.payload?JSON.stringify(next.payload):null,next.checked,next.success,next.issue,hash,key,token));
  const results=await db.batch(statements);
  const saved=results.at(-1).meta.changes>0;
  return {saved,hash,changed:saved?results.slice(0,-1).filter((_,i)=>i%2===0).reduce((n,r)=>n+r.meta.changes,0):0};
}
export async function listArchive(db,url){
  const before=Number(url.searchParams.get("before")||0),type=url.searchParams.get("type"),feed=(url.searchParams.get("feed")||"").trim(),series=url.searchParams.get("series");
  const where=[],args=[];
  if(Number.isSafeInteger(before)&&before>0){where.push("id<?");args.push(before);}
  if(feed){where.push("feed=?");args.push(feed);}
  if(series){where.push("substr(item,1,length(?)+1)=?||'@'");args.push(series,series);}
  if(type==="revision")where.push("previous IS NOT NULL");
  if(type==="event")where.push("substr(item,1,6)='event@'");
  const q="SELECT id,feed,item,period,label,unit,reading,previous,source,provider,seen FROM research_changes"+(where.length?" WHERE "+where.join(" AND "):"")+" ORDER BY id DESC LIMIT 41";
  const {results}=await db.prepare(q).bind(...args).all();
  return {rows:results.slice(0,40),next:results.length>40?results[39].id:null};
}
