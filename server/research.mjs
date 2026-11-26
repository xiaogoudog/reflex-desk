import * as feeds from "./feeds.mjs";
import {filings,fundamentals} from "./edgar.mjs";
import {googleCloud,azure,optionsVolume} from "./companies.mjs";
import {extraFeeds} from "./indicators.mjs";
import {persist} from "./archive.mjs";
import {companyFeed,fast} from "../public/catalog.mjs";
import verified from "./verified.json" with {type:"json"};
const sources={...feeds,...extraFeeds,filings,fundamentals,googleCloud,azure,optionsVolume};
export const perCompany=companyFeed;
export const hasFeed=id=>Object.hasOwn(sources,id);
const memory=new Map();
const freshness=(id)=>fast.has(id)?60000:300000;
function curveDate(data){const r=data?.legacy?.at(-1);return r?.kind==="curve"?r.date:"";}
function retainNewer(row,reference){
  const incoming=curveDate(row?.payload),known=curveDate(reference?.payload);
  if(!incoming||!known||incoming>=known)return row;
  return {...row,payload:reference.payload,success:reference.success,issue:"本次来源仅到 "+incoming+"，保留已核验的 "+known+" 国债数据"};
}
function response(row,seed,ttl,override,changed=0){
  const kept=retainNewer(row,{payload:seed?.data,success:seed?.time});
  if(kept!==row){row=kept;override="stale";}
  const data=row?.payload||seed?.data||null;
  const mode=override||(row?.issue?(row?.payload?"stale":data?"snapshot":"unavailable"):row?.payload?"cached":data?"snapshot":"unavailable");
  const now=Date.now();
  return {data,mode,checkedAt:row?.checked||null,successAt:row?.success||seed?.time||null,issue:row?.issue||null,
    nextCheck:mode==="refreshing"?3:Math.ceil(Math.max(1000,(row?.checked||now)+(row?.issue?30000:ttl)-now)/1000),interval:ttl/1000,
    archived:!!row?.hash,changed};
}
async function read(db,key){
  const r=await db.prepare("SELECT payload,checked,success,issue,lease,archive_hash AS hash FROM research_feeds WHERE feed_key=?").bind(key).first();
  return r?{...r,payload:r.payload?JSON.parse(r.payload):null}:null;
}
function message(e){const s=String(e?.message||"");return /internal error|fetch failed|timed? ?out|aborted|network connection/i.test(s)?"研究服务暂时无法连到官方源":s.slice(0,180)||"连接未完成";}
export async function research(id,symbol,db,background=false){
  const key=perCompany(id)?id+"/"+symbol:id,seed=verified[key],ttl=freshness(id),now=Date.now();
  let row;
  if(db)try{row=await read(db,key);}catch(e){if(background)throw e;db=null;}
  if(!db){if(background)throw Error("归档数据库暂不可用");row=memory.get(key);}
  row=retainNewer(row,{payload:seed?.data,success:seed?.time});
  if(row?.checked&&(row.hash||!db||row.issue)&&now-row.checked<(row.issue?30000:ttl))return response(row,seed,ttl);
  if(row?.lease>now)return response(row,seed,ttl,"refreshing");
  const token=crypto.randomUUID();
  if(db){
    const claim=await db.prepare("INSERT INTO research_feeds(feed_key,lease,token) VALUES(?,?,?) ON CONFLICT(feed_key) DO UPDATE SET lease=excluded.lease,token=excluded.token WHERE research_feeds.lease<=? AND (research_feeds.checked=0 OR (research_feeds.archive_hash IS NULL AND research_feeds.issue IS NULL) OR research_feeds.checked<=? - CASE WHEN research_feeds.issue IS NULL THEN ? ELSE 30000 END)").bind(key,now+115000,token,now,now,ttl).run();
    if(!claim.meta.changes){row=await read(db,key);return response(row,seed,ttl,row?.lease>Date.now()?"refreshing":undefined);}
  }
  let next,success=false;
  try{
    const previous=row?.payload||seed?.data;
    const data=perCompany(id)?await sources[id](symbol,previous):await sources[id](previous),at=Date.now();
    if(data.missing?.length&&previous){
      const ids=new Set(data.metrics.map(m=>m.id));
      data.metrics.push(...previous.metrics.filter(m=>!ids.has(m.id)&&data.missing.includes(m.name)));
    }
    next=retainNewer({payload:data,checked:at,success:at,issue:null,lease:0},row?.payload?row:{payload:seed?.data,success:seed?.time});
    success=true;
  }catch(e){next={payload:row?.payload||seed?.data||null,success:row?.success||seed?.time||0,checked:Date.now(),issue:message(e),lease:0};}
  let changed=0;
  if(db){
    try{
      const saved=await persist(db,key,token,next,row?.hash,success||(!row?.hash&&!!next.payload&&!!next.success));
      if(!saved.saved){const newer=await read(db,key);return response(newer,seed,ttl,newer?.lease>Date.now()?"refreshing":undefined);}
      next.hash=saved.hash;changed=saved.changed;
    }catch(e){
      if(background)throw e;
      next.issue=next.issue||"来源已读取，本次归档未完成";next.hash=null;
    }
  }else{
    memory.delete(key);memory.set(key,next);if(memory.size>150)memory.delete(memory.keys().next().value);
  }
  return response(next,seed,ttl,success&&!next.issue?"live":undefined,changed);
}
