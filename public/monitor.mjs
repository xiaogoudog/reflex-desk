import {esc,external,icon} from "./visuals.mjs";
import {titles,groups} from "./catalog.mjs";
const times=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
const stamp=ms=>ms?times.format(new Date(ms)):"—";
let state=null,issue="",lastCheck=0,inFlight=null,filter="",feed="",rows=[],cursor=null,busy=false,version=0;
const shortNames=k=>{const [id,symbol]=k.split("/");return (symbol?symbol+" · ":"")+(titles[id]||id);};
async function json(url,options={}){
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(23000),...options});
  if(!r.ok){let msg="HTTP "+r.status;try{msg=(await r.json()).error||msg;}catch{}throw Error(msg);}
  return r.json();
}
function summary(){
  if(!state)return `<p class="feed-note">${issue?esc(issue):"正在读取后台运行记录…"}</p>`;
  const clock=state.clocks?.[0],run=state.run,late=Date.now()-(run?.finished||run?.started||0)>25*60000;
  const status=!run?"等待首次后台采集":!run.finished?"本轮采集中":late?"最近一轮已超过 25 分钟":run.warnings?"已完成，部分源待重试":"最近一轮已完成";
  return `<div class="monitor-stats"><div><small>后台采集</small><b>${esc(status)}</b><span>${run?(run.finished?"完成 ":"开始 ")+stamp(run.finished||run.started):"尚无运行记录"} · 北京时间</span></div><div><small>本轮已检查</small><b>${run?run.completed+" / "+run.total:"—"}</b><span>${run?run.warnings+" 个源需关注":"按数据源与代码统计"}</span></div><div><small>已归档的观察与公告</small><b>${Number(state.stats?.points||0).toLocaleString()}</b><span>另有 ${Number(state.stats?.revisions||0).toLocaleString()} 条修订记录</span></div></div>
   <p class="feed-note">服务器定时器 · ${clock?(clock.finished?"实测完成 "+stamp(clock.finished):clock.issue?"本次异常 · "+esc(clock.issue):"触发时间 "+stamp(clock.started)):"等待首次独立触发"}。后台轮次与网页访问分别记录。</p>
   ${state.issues?.length?`<details class="monitor-issues"><summary>查看 ${state.issues.length} 项来源状态</summary>${state.issues.map(i=>`<p><b>${esc(shortNames(i.feed))}</b> · ${esc(i.issue)}</p>`).join("")}</details>`:""}${issue?`<p class="feed-note source-issue">${esc(issue)}</p>`:""}`;
}
function watched(symbol){
  if(!state)return "";
  const isOn=state.symbols.includes(symbol);
  return `<button class="btn light" data-act="watch-symbol" data-id="${esc(symbol)}">${icon(isOn?"check":"plus",14)} ${isOn?"移出后台跟踪":"加入后台跟踪"}</button>`;
}
export const watchButton=s=>`<span id="monitor-watch" data-symbol="${esc(s)}">${watched(s)}</span>`;
function paint(){
  const summaryBox=document.getElementById("monitor-status");if(summaryBox)summaryBox.innerHTML=summary();
  const symbols=document.getElementById("monitor-symbols");if(symbols&&state)symbols.innerHTML=state.symbols.map(s=>`<span class="tag neutral">${esc(s)}</span>`).join(" ")||"尚未选择公司";
  const widget=document.getElementById("monitor-watch");if(widget)widget.innerHTML=watched(widget.dataset.symbol);
}
export function refreshMonitor(force=false){
  if(inFlight)return inFlight;
  if(!force&&Date.now()-lastCheck<30000)return Promise.resolve();
  inFlight=json("/api/collector").then(result=>{state=result;issue="";lastCheck=Date.now();}).catch(()=>{issue="暂时无法读取后台运行记录，请稍后刷新。";lastCheck=Date.now()-20000;}).finally(()=>{inFlight=null;paint();});
  return inFlight;
}
export async function toggleWatch(symbol){
  if(!state)await refreshMonitor(true);
  if(!state)throw Error("暂时无法核对当前跟踪清单。");
  const active=!state.symbols.includes(symbol);
  const saved=await json("/api/collector",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"watch",symbol,active})});
  state.symbols=saved.symbols;paint();return active;
}
function controls(){
  const symbols=state?.symbols||[];
  const keys=Object.values(groups).flatMap(g=>g.feeds).filter(id=>!groups.company.feeds.includes(id)).concat(symbols.flatMap(s=>groups.company.feeds.map(k=>k+"/"+s)));
  if(feed&&!keys.includes(feed))keys.push(feed);
  const options=(list,sel)=>list.map(([v,n])=>`<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(n)}</option>`).join("");
  return `<form data-form="archive-filter" class="ticker-form archive-filter"><label>来源 <select name="feed">${options([["","全部来源"],...keys.map(k=>[k,shortNames(k)])],feed)}</select></label><label>类型 <select name="type">${options([["","全部记录"],["revision","仅修订"],["event","仅公告"]],filter)}</select></label><button type="submit" class="btn soft">筛选</button></form>`;
}
function table(){
  if(!rows.length)return `<p class="feed-note">${busy?"正在读取归档…":"当前筛选没有归档记录。"}</p>`;
  return `<div class="table-wrap"><table class="archive-table"><thead><tr><th>指标 / 公告</th><th>所属期或公布时间</th><th>当时读数</th><th>记录时间 · 北京</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.label)}</b><small>${esc(shortNames(r.feed))}</small></td><td>${esc(r.period.includes("T")?stamp(r.period):r.period)}</td><td>${r.previous!==null?`<del>${esc(r.previous+r.unit)}</del> → `:""}${esc(r.reading+r.unit)}<small>${external(r.source,r.provider)}</small></td><td>${esc(stamp(r.seen))}</td></tr>`).join("")}</tbody></table></div>${cursor?'<button type="button" class="btn light" data-act="archive-more">加载更早记录</button>':""}`;
}
async function loadHistory(more=false){
  if(busy&&more||more&&!cursor)return;
  const request=++version,opts=new URLSearchParams();
  if(feed)opts.set("feed",feed);if(filter)opts.set("type",filter);if(more)opts.set("before",String(cursor));
  busy=true;
  const holder=document.getElementById("archive-table");
  try{
    const result=await json("/api/archive?"+opts);
    if(request!==version)return;
    rows=more?rows.concat(result.rows):result.rows;cursor=result.next;
    busy=false;if(holder)holder.innerHTML=table();
  }catch{if(request===version){busy=false;if(holder)holder.innerHTML="<p class='feed-note'>未能读取归档，可使用上方刷新按钮重试。</p>";}}
}
export async function archiveStart(){
  await refreshMonitor();const form=document.getElementById("archive-controls");
  if(form)form.innerHTML=controls();await loadHistory();
}
export async function archiveFilter(f,v){feed=f;filter=v;rows=[];cursor=null;await loadHistory();}
export const loadOlder=()=>loadHistory(true);
export function monitorView(){
  return `<div class="page-heading"><div><h1>采集与归档</h1><p>查看后台运行记录，按统计期对照原始值和修订值。所有采集记录以北京时间显示。</p></div><button type="button" class="btn soft" data-act="archive-refresh">${icon("refresh",16)}刷新记录</button></div>
  <section class="card pad"><div class="card-title"><h2>后台运行</h2><small>目标间隔 10 分钟</small></div><div id="monitor-status">${summary()}</div><div class="watchlist"><b>持续跟踪的公司</b><div id="monitor-symbols">${(state?.symbols||[]).map(s=>`<span class="tag neutral">${esc(s)}</span>`).join(" ")}</div><a href="#research/company">管理跟踪代码 ${icon("chev",13)}</a></div></section>
  <section class="card pad section-next"><div class="card-title"><h2>新增与修订</h2></div><div id="archive-controls">${controls()}</div><div id="archive-table">${table()}</div></section>`;
}
