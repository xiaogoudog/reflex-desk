import {esc,icon,spark,external} from "./visuals.mjs";
import {action} from "./views.mjs";
import {groups,titles,fast,companyFeed} from "./catalog.mjs";
import {watchButton,refreshMonitor} from "./monitor.mjs";
export {groups,companyFeed};
const entries=new Map(),due=new Map(),requests=new Map();
let symbol="AMZN",notify=()=>{};
try{const saved=localStorage.getItem("reflex-desk.research.symbol");if(saved&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(saved))symbol=saved;}catch{}
const key=(feed,ticker=symbol)=>companyFeed(feed)?feed+"/"+ticker:feed;
export const activeGroup=id=>Object.hasOwn(groups,id)?id:"macro";
export const selectedSymbol=()=>symbol;
export function selectSymbol(next){
  const s=String(next).trim().toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(s))throw Error("请输入美股代码，例如 AMZN、NVDA 或 BRK.B。");
  symbol=s;try{localStorage.setItem("reflex-desk.research.symbol",s);}catch{}
}
async function check(feed,force=false,ticker=symbol){
  const id=key(feed,ticker);
  if(requests.has(id))return requests.get(id);
  if(!force&&Date.now()<(due.get(id)||0))return;
  const job=readFeed(feed,ticker,id).finally(()=>{requests.delete(id);notify(feed,ticker);});
  requests.set(id,job);return job;
}
async function readFeed(feed,ticker,id){
  try{
    const url="/api/research/"+feed+(companyFeed(feed)?"?symbol="+encodeURIComponent(ticker):"");
    const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(48000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    const result=await response.json();
    if(!result||!["live","cached","refreshing","stale","snapshot","unavailable"].includes(result.mode))throw Error("响应格式有误");
    entries.set(id,result);
    due.set(id,Date.now()+Math.max(2,Math.min(result.nextCheck||30,fast.has(feed)?60:300))*1000);
  }catch{
    const prior=entries.get(id);
    entries.set(id,{data:prior?.data||null,successAt:prior?.successAt||null,checkedAt:Date.now(),mode:prior?.data?(prior.mode==="snapshot"?"snapshot":"stale"):"unavailable",issue:"本次未能连到研究服务",interval:fast.has(feed)?60:300});
    due.set(id,Date.now()+30000);
  }
}
export function checkGroup(id,force=false){return Promise.all(groups[activeGroup(id)].feeds.map(feed=>check(feed,force)));}
function checkAll(){
  if(document.hidden)return;
  const [view,g]=location.hash.slice(1).split("/");
  if(view==="archive"||view==="research")refreshMonitor();
  if(view==="research")checkGroup(g);
  else if(!view||view==="desk"||view==="data")for(const id of ["curve","rates","policyNews","aws"])check(id);
}
export function watchSources(fn){notify=fn;checkAll();setInterval(checkAll,5000);document.addEventListener("visibilitychange",checkAll);window.addEventListener("online",checkAll);window.addEventListener("hashchange",checkAll);}
export function combinedState(state){
  const official=["curve","rates","policyNews","aws"].flatMap(id=>entries.get(id)?.data?.legacy||[]);
  return {...state,updates:[...official,...state.updates]};
}
const timeFormat=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
const time=t=>t?timeFormat.format(new Date(t)):"—";
function period(m){
  if(m.frequency==="月度")return m.date.slice(0,7);
  if(m.frequency==="季度")return m.date.slice(0,4)+" Q"+Math.ceil(Number(m.date.slice(5,7))/3);
  return m.date.replace("-Q"," Q");
}
const value=m=>m.display??new Intl.NumberFormat("zh-CN",{minimumFractionDigits:m.unit==="bp"?0:2,maximumFractionDigits:m.unit==="bp"?0:2}).format(m.value);
const modes={live:"已同步",cached:"已核验缓存",refreshing:"正在更新",stale:"上次成功数据",snapshot:"已核验快照",unavailable:"暂未取得数据"};
const bad=o=>o&&["stale","snapshot","unavailable"].includes(o.mode);
const baseUrl=id=>({macro:"https://fred.stlouisfed.org/series/CPIAUCNS",growth:"https://fred.stlouisfed.org/series/A191RL1Q225SBEA",curve:"https://home.treasury.gov/resource-center/data-chart-center/interest-rates",policyNews:"https://www.federalreserve.gov/newsevents/pressreleases.htm",rates:"https://fred.stlouisfed.org/series/DFEDTARU",balance:"https://fred.stlouisfed.org/series/WALCL",industry:"https://www.federalreserve.gov/releases/g17/",aws:"https://ir.aboutamazon.com/quarterly-results/default.aspx",filings:"https://www.sec.gov/edgar/search/",fundamentals:"https://www.sec.gov/edgar/search/"})[id]||(id==="optionsVolume"?"https://www.theocc.com/market-data/market-data-reports":(["googleCloud","azure"].includes(id)?"https://www.sec.gov/search-filings":"https://fred.stlouisfed.org/"));
function evidenceId(id,kind,identity){return [id,kind,encodeURIComponent(identity)].join("|");}
export function evidenceFor(ref){
  const [id,kind,encoded]=ref.split("|");
  if(!encoded)return null;
  const data=entries.get(key(id))?.data;if(!data)return null;
  const source=decodeURIComponent(encoded);
  if(kind==="m"){const m=data.metrics.find(x=>x.id===source);if(m)return {text:(companyFeed(id)?symbol+" · ":"")+m.name+" "+value(m)+m.unit+"（"+period(m)+"，"+m.provider+"）。",url:m.url};}
  else {const e=data.events.find(x=>x.url===source);if(e)return {text:e.title+"（"+time(e.date)+" 北京时间，"+e.provider+"）。",url:e.url};}
  return null;
}
function metricCard(id,m){
  const points=m.history?.map(r=>r.value)||[],plot=points.length>1?spark(points,"#438372",m.id==="target"):"";
  return `<article class="reading"><div class="reading-head"><h3>${esc(m.name)}</h3><small>${esc(m.frequency)}</small></div><div class="reading-figure"><strong>${esc(value(m))}<em>${esc(m.unit)}</em></strong>${plot}</div><p class="reading-date">${esc(period(m))}${m.published?" · 申报 "+esc(m.published):""}</p><p class="reading-desc">${esc(m.desc)}</p><div class="reading-actions">${external(m.url,m.provider)}${action("research-evidence","记证据","plus","text-btn",evidenceId(id,"m",m.id))}</div></article>`;
}
function sourceSection(id){
  const row=entries.get(key(id)),data=row?.data,slow=!fast.has(id);
  const who=companyFeed(id)?symbol+" · ":"";
  const list=(data?.events||[]).slice(0,14);
  return `<section class="card feed-panel"><div class="feed-head"><div><div class="feed-kicker">${slow?"统计序列":"公告与披露"} · 前台 ${slow?"5 分钟":"60 秒"}检查</div><h2>${esc(who+titles[id])}</h2>${data?.company?`<p class="feed-company">${esc(data.company)}</p>`:""}</div><span class="feed-status ${bad(row)?"warn":""}">${esc(row?modes[row.mode]:"正在读取")}</span></div>
    ${data?.metrics?.length?`<div class="readings">${data.metrics.map(m=>metricCard(id,m)).join("")}</div>`:""}
    ${list.length?`<div class="feed-events">${list.map(e=>`<article><div class="event-time"><b>${esc(e.label)}</b><time>${esc(time(e.date))}</time></div><div class="event-title">${external(e.url,e.title)}</div>${action("research-evidence","记证据","plus","text-btn",evidenceId(id,"e",e.url))}</article>`).join("")}</div>`:""}
    ${data?.note?`<p class="feed-note">${esc(data.note)}</p>`:""}
    ${row?.issue?`<p class="feed-note source-issue">本次读取未成功 · ${esc(row.issue)}。${external(baseUrl(id),"打开来源")}</p>`:""}
    <div class="feed-foot"><span>上次成功取数 <b>${time(row?.successAt)}</b></span><span>最近检查 <b>${time(row?.checkedAt)}</b></span></div></section>`;
}
export const researchResults=g=>groups[activeGroup(g)].feeds.map(sourceSection).join("");
const questions={market:"股票、美元和原油的收盘表现是否指向同一个判断？",macro:"增长和通胀的变化，怎样影响你给成长股使用的折现率？",policy:"政策目标与市场实际资金价格之间，出现了什么变化？",industry:"哪些行业的实际产出，正在支持或削弱你的需求判断？",company:"收入增长带来的现金流，能否覆盖这一轮资本开支？"};
export function researchView(id){
  const g=activeGroup(id);
  return `<div class="page-heading"><div><h1>实时研究</h1><p>${esc(questions[g])}</p></div>${action("research-refresh","立即检查","refresh","btn soft",g)}</div>
  <nav class="research-tabs" aria-label="研究维度">${Object.entries(groups).map(([k,x])=>`<a href="#research/${k}" ${k===g?'aria-current="page"':""}>${icon(x.icon,16)}${esc(x.name)}</a>`).join("")}</nav>
  ${g==="company"?`<form data-form="research-symbol" class="ticker-form"><label for="research-symbol">美股代码</label><input id="research-symbol" name="symbol" value="${esc(symbol)}" maxlength="10" autocomplete="off" spellcheck="false" required><button class="btn primary" type="submit">查看公司</button>${watchButton(symbol)}<div>${["AMZN","GOOGL","MSFT","NVDA"].map(t=>action("research-symbol",t,"","ticker-pick"+(t===symbol?" chosen":""),t)).join("")}</div></form>`:""}
  <div class="research-caption">后台目标每 10 分钟采集一轮，查看时会优先检查当前栏目。各项均标注统计期。 <a class="text-link" href="#archive">查看后台运行与历史修订</a></div><div id="research-results">${researchResults(g)}</div>`;
}
export function researchShelf(){
  return `<section class="research-shelf" aria-label="实时研究入口">${Object.entries(groups).map(([k,g])=>`<a href="#research/${k}"><i>${icon(g.icon,18)}</i><div><b>${esc(g.name)}</b><span>${esc(g.summary)}</span></div>${icon("chev",14)}</a>`).join("")}</section>`;
}
export function riskEvidence(ticker){
  const targets=[["macro","unrate"],["curve","ten"],["rates","target"],["industry","IPG3344S"],["fundamentals","revenue"]];
  if(ticker==="AMZN")targets.push(["aws","aws-margin"]);
  return targets.flatMap(([id,code])=>{
    const f=entries.get(key(id,ticker)),m=f?.data?.metrics?.find(x=>x.id===code);
    if(!m||!f.successAt)return [];
    return [{name:(companyFeed(id)?ticker+" · ":"")+m.name,reading:value(m)+m.unit,period:period(m),url:m.url,checked:new Date(f.successAt).toISOString(),mode:modes[f.mode]}];
  });
}
export async function collectRiskEvidence(ticker){
  const needed=["macro","curve","rates","industry"];
  if(ticker==="AMZN")needed.push("aws");
  if(/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker))needed.push("fundamentals");
  await Promise.all(needed.map(id=>check(id,false,ticker)));
  return riskEvidence(ticker);
}

