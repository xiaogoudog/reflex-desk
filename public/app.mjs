import {makeState,validState,validObservation,idFor,samples,series,cleanUrl,people,prompts,localDate,nextPractice,recallSchedule,riskError,payoff,riskStats} from "./model.mjs";
import {esc,icon,chartSVG,fmt,sign,usd,pnl,dateText} from "./visuals.mjs";
import {routes,action,allTheses,currentPrompt,desk,thesisList,listContent,detail,riskView,riskInputs,riskResult,journal,training,dataView} from "./views.mjs";
import {frame,thesisModal,evidenceModal,reviewModal,answerModal,answerCompare,macroModal,awsModal,observationModal} from "./dialogs.mjs";

import {groups,activeGroup,researchView,researchResults,researchShelf,selectedSymbol,selectSymbol,checkGroup,watchSources,combinedState,evidenceFor,collectRiskEvidence} from "./research.mjs";
import {external} from "./visuals.mjs";
import {monitorView,archiveStart,archiveFilter,loadOlder,refreshMonitor,toggleWatch} from "./monitor.mjs";
import {companyFeed} from "./catalog.mjs";
let incomingEvidence=null,savingRisk=false;
const $=id=>document.getElementById(id);
const storeKey="reflex-desk.records.v1";
let disk=true,initialWarning="",state=makeState(),pendingImport=null,editSnapshot="",chartObserver=null,toastTimer;
function readDisk(){
  const raw=localStorage.getItem(storeKey);
  if(raw===null)return makeState();
  const val=JSON.parse(raw);
  if(!validState(val))throw Error("现有记录格式无法读取。请在数据与备份中恢复有效备份。");
  return val;
}
try{
 localStorage.setItem(storeKey+".probe","1");localStorage.removeItem(storeKey+".probe");state=readDisk();
}catch(e){disk=false;initialWarning="当前浏览器暂时无法保存新记录。请导出备份，以便保留本次会话的研究。";}
const ui={person:"soros",question:{soros:nextPractice("soros",state.training),stan:nextPractice("stan",state.training)},linkedThesis:"",period:8,metric:"sales",chartIndex:null,thesisFilter:"全部",search:"",logFilter:"全部",riskDraft:{...state.risk},riskDirty:false};
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3800);}
async function change(update){
 const apply=()=>{
   const next=disk?readDisk():structuredClone(state);
   update(next);
   if(!validState(next))throw Error("记录未保存。请核对代码、日期、数值和文字长度。");
   if(disk){
     try{localStorage.setItem(storeKey,JSON.stringify(next));}
     catch{throw Error("浏览器存储空间不足或被限制。请先导出备份。");}
   }
   state=next;
 };
 if(navigator.locks&&disk)await navigator.locks.request(storeKey,apply);else apply();
}
function errorMessage(e){
 const message=e?.message||"操作未完成，请重试。";
 const inline=$("dialog").open&&$("dialog").querySelector(".form-error");
 if(inline)inline.textContent=message;else toast(message);
}
function route(){
 const [key="desk",id=""]=(location.hash.slice(1)||"desk").split("/");
 return {key:key==="thesis"||Object.hasOwn(routes,key)?key:"desk",id};
}
function navigate(hash){if(location.hash==="#"+hash){render();window.scrollTo(0,0);}else location.hash=hash;}
function navToggle(on){
 $("rail").classList.toggle("open",on);
 $("rail-shade").hidden=!on;
 $("menu-open").setAttribute("aria-expanded",String(on));
 if(on)$("navigation").querySelector("a.current")?.focus();
}
function openModal(html){
 const dialog=$("dialog");
 $("modal-content").innerHTML=html;
 if(!dialog.open)dialog.showModal();
 dialog.scrollTop=0;
 const t=dialog.querySelector(".dialog-form input:not([type=hidden]),.dialog-form textarea,.dialog-form select");
 if(t)t.focus({preventScroll:true});else dialog.querySelector(".close-btn")?.focus({preventScroll:true});
}
function closeModal(){if($("dialog").open)$("dialog").close();pendingImport=null;}
function findThesis(id){return allTheses(state).find(t=>t.id===id);}
function requireOpen(s,id){const t=s.theses.find(t=>t.id===id);if(!t||t.result)throw Error("这条假设已封存或已被替换。请打开最新记录。");return t;}
function note(s,type,t,title,body,extra={}){s.logs.push({id:idFor(),type,symbol:t.symbol,thesisId:t.id||"",title,body,time:new Date().toISOString(),...extra});}
const snapshot=t=>Object.fromEntries(["symbol","title","claim","contrary","consensus","loop","catalyst","date","prob"].map(k=>[k,t[k]]));
function render(){
 chartObserver?.disconnect();chartObserver=null;
 const {key,id}=route(),current=key==="thesis"?"theses":key;
 const navigator=$("navigation");
 navigator.innerHTML=Object.entries(routes).filter(([k])=>k!=="data").map(([k,[name,ic]])=>`<a href="#${k}" class="${current===k?"current":""}" ${current===k?'aria-current="page"':""}>${icon(ic,19)}<span>${name}</span></a>`).join("");
 $("crumb-label").textContent=key==="thesis"?"假设详情":routes[current][0];
 document.title=$("crumb-label").textContent+" · 反身性研究台";
 const views={desk:()=>desk(combinedState(state),ui,researchShelf()),research:()=>researchView(id),archive:()=>monitorView(),theses:()=>thesisList(state,ui),thesis:()=>detail(state,id),risk:()=>riskView(ui.riskDraft,findThesis(ui.linkedThesis)),journal:()=>journal(state,ui),training:()=>training(state,ui),data:()=>dataView(combinedState(state))};
 $("content").innerHTML=(initialWarning?`<p class="budget-alert">${esc(initialWarning)}</p>`:"")+views[key]();
 if(key==="desk")mountChart();
 if(key==="archive")archiveStart();
 if(key==="research")refreshMonitor();
}
function mountChart(){
 const el=$("chart"),all=series("aws",combinedState(state).updates),rows=all.slice(-ui.period);
 let width=Math.floor(el.getBoundingClientRect().width);
 function draw(){
   const i=Math.max(0,Math.min(ui.chartIndex??(rows.length-1),rows.length-1)),r=rows[i],prev=all.find(o=>o.date===(Number(r.date.slice(0,4))-1)+r.date.slice(4)),metric=ui.metric;
   $("chart-caption").textContent="AWS 季度"+(metric==="sales"?"营收":"营业利润")+"  ·  "+r.date.replace("-"," ");
   $("chart-number").textContent=fmt(r[metric]);$("chart-change").textContent=prev&&prev[metric]>0?"同比 "+sign((r[metric]/prev[metric]-1)*100,1)+"%":"";
   el.setAttribute("aria-valuemax",rows.length);el.setAttribute("aria-valuenow",i+1);
   el.setAttribute("aria-valuetext",r.date+"，营收 "+fmt(r.sales)+" 亿美元，营业利润 "+fmt(r.profit)+" 亿美元");
   el.innerHTML=chartSVG(rows,i,width,metric);
 }
 function pick(ev){const rect=el.getBoundingClientRect();const i=Math.max(0,Math.min(rows.length-1,Math.round((ev.clientX-rect.left-35)/(rect.width-46)*(rows.length-1))));if(ui.chartIndex!==i){ui.chartIndex=i;draw();}}
 el.onpointermove=ev=>{if(ev.pointerType!=="touch")pick(ev);};el.onpointerdown=pick;
 el.onpointerleave=()=>{if(document.activeElement!==el){ui.chartIndex=null;draw();}};
 el.onkeydown=ev=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(ev.key))return;ev.preventDefault();const i=ui.chartIndex??(rows.length-1);ui.chartIndex=ev.key==="Home"?0:ev.key==="End"?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(ev.key==="ArrowLeft"?-1:1)));draw();};
 draw();if(typeof ResizeObserver!=="undefined"){chartObserver=new ResizeObserver(()=>{const size=Math.floor(el.getBoundingClientRect().width);if(width!==size){width=size;draw();}});chartObserver.observe(el);}
}
const cfgField=(fd,key)=>String(fd.get(key)??"").trim();
function numField(fd,key){const s=cfgField(fd,key);return s===""?NaN:Number(s);}
function readRiskForm(){
 const f=$("risk-form");if(!f)return ui.riskDraft;
 const values={...ui.riskDraft};
 for(const [k,v] of new FormData(f)){values[k]=k==="type"?v:k==="symbol"?v.trim().toUpperCase():v.trim()===""?NaN:Number(v);}
 return values;
}
function refreshRisk(){
 const r=readRiskForm();ui.riskDraft=r;ui.riskDirty=true;
 const linked=findThesis(ui.linkedThesis);
 if(linked&&linked.symbol!==r.symbol){ui.linkedThesis="";document.querySelector(".linked-thesis")?.remove();}
 $("budget-label").textContent=r.stockBudget+"% 正股 / "+(100-r.stockBudget)+"% 期权";
 $("move-label").textContent=sign(r.move,0)+"%";$("risk-output").innerHTML=riskResult(r);
}
async function saveRisk(log){
 let r=readRiskForm();const err=riskError(r);if(err){toast(err);return;}
 const readings=log?await collectRiskEvidence(r.symbol):[];
 await change(s=>{
   s.risk={...r};
   if(log){const scenario=payoff(r,r.spot*(1+r.move/100)),stats=riskStats(r);note(s,"推演",{symbol:r.symbol,id:ui.linkedThesis},"保存到期情景",`标的变动 ${sign(r.move,0)}%，推演盈亏 ${pnl(scenario.total)}，占演算账户 ${sign(scenario.share,2)}%。本组合到期最大亏损 ${usd(stats.maxLoss)}。`,{risk:{...r},research:readings});}
 });
 ui.riskDraft={...r};ui.riskDirty=false;toast(log?"推演快照已记入日志":"演算参数和资金预算已保存");if(log){ui.logFilter="推演";navigate("journal");}
}
function exportData(){
 const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download="ReflexDesk-"+localDate()+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 toast("已生成研究记录备份");
}
async function importFile(file){
 if(!file)return;
 if(file.size>12*1024*1024)throw Error("请选择小于 12 MB 的研究记录备份。");
 let data;try{data=JSON.parse(await file.text());}catch{throw Error("文件不是有效的 JSON 备份。");}
 if(!validState(data))throw Error("该文件不是有效的反身性研究台备份，现有记录已保留。");
 pendingImport=data;
 openModal(frame("恢复研究记录",`<p class="dialog-intro">备份中有 ${data.theses.length} 条个人假设、${data.logs.length} 条日志和 ${data.training.length} 次练习。恢复会替换当前浏览器内的所有研究记录和参数。</p><div class="modal-actions">${action("close","取消","","btn light")}${action("confirm-import","恢复这份备份","refresh","btn primary")}</div>`));
}
async function doAction(act,id){
 const t=findThesis(id);
 switch(act){
  case "close":incomingEvidence=null;closeModal();break;
  case "archive-refresh":await refreshMonitor(true);await archiveStart();break;
  case "archive-more":await loadOlder();break;
  case "watch-symbol":{const active=await toggleWatch(id);toast(active?"已加入后台跟踪清单":"已移出跟踪清单，历史归档仍可查阅");break;}
  case "research-refresh":{await checkGroup(id,true);toast("已检查本页数据源，取数时间见各栏。");break;}
  case "research-symbol":selectSymbol(id);render();await checkGroup("company");break;
  case "research-evidence":{
   const item=evidenceFor(id);if(!item)return;
   incomingEvidence=item;
   const open=state.theses.filter(t=>!t.result).slice().reverse();
   const opts=open.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.symbol+" · "+t.title)+'</option>').join("");
   openModal(frame("将来源记入投资假设",'<p class="dialog-intro">'+esc(item.text)+'</p>'+(open.length?'<form data-form="research-attach" class="dialog-form"><label class="field"><span>选择跟踪中的假设</span><select name="thesis">'+opts+'</select></label><p class="form-error" role="alert"></p><div class="modal-actions"><button type="submit" class="btn primary">填写证据方向</button></div></form>':'<p class="dialog-intro">先建立要检验的假设，这条来源会作为第一条观察保存。</p>')+'<div class="modal-actions">'+action("research-new","新建投资假设","plus","btn light")+'</div>'));break;
  }
  case "research-new":openModal(thesisModal("new"));break;
  case "new":incomingEvidence=null;openModal(thesisModal("new"));break;
  case "copy":incomingEvidence=null;if(t)openModal(thesisModal("copy",t));break;
  case "edit":if(t&&!t.result){editSnapshot=JSON.stringify(t);openModal(thesisModal("edit",t));}break;
  case "detail":navigate("thesis/"+id);break;
  case "evidence":if(t&&!t.result)openModal(evidenceModal(t));break;
  case "review":if(t&&!t.result)openModal(reviewModal(t));break;
  case "person":ui.person=id;render();break;
  case "next-prompt":ui.question[ui.person]=(ui.question[ui.person]+1)%prompts[ui.person].length;render();break;
  case "answer":openModal(answerModal(ui));break;
  case "training-history":closeModal();navigate("training");break;
  case "period":ui.period=Number(id);ui.chartIndex=null;render();break;
  case "chart-metric":ui.metric=id;render();break;
  case "macro":openModal(macroModal(id,combinedState(state)));break;
  case "aws-table":openModal(awsModal(combinedState(state)));break;
  case "observation":openModal(observationModal(id));break;
  case "thesis-risk":if(t){ui.linkedThesis=t.id;ui.riskDraft={...ui.riskDraft,symbol:t.symbol};ui.riskDirty=true;navigate("risk");}break;
  case "unlink-thesis":ui.linkedThesis="";render();break;
  case "risk-save":await saveRisk(false);break;
  case "risk-log":{
    if(savingRisk)return;
    savingRisk=true;
    const trigger=document.querySelector('[data-act="risk-log"]');
    if(trigger){trigger.disabled=true;trigger.setAttribute("aria-busy","true");}
    try{await saveRisk(true);}finally{savingRisk=false;if(trigger){trigger.disabled=false;trigger.removeAttribute("aria-busy");}}
    break;
  }
  case "risk-snapshot":{
   const l=state.logs.find(l=>l.id===id&&l.risk);if(!l)return;
   const r=l.risk;
   openModal(frame("当时的仓位推演",`<p class="dialog-intro">${esc(r.symbol)} · ${dateText(l.time)} · 演算账户 ${usd(r.equity)} · 参考股价 ${usd(r.spot)} · 正股 ${r.shares} 股${r.type==="stock"?"":` · 期权 ${r.contracts} 张`}</p><p class="dialog-intro">${["call","collar"].includes(r.type)?`看涨行权价 ${usd(r.callK)}，权利金 ${usd(r.callPremium)} / 股。`:""}${["put","collar"].includes(r.type)?` 看跌行权价 ${usd(r.putK)}，权利金 ${usd(r.putPremium)} / 股。`:""}</p>${riskResult(r)}${l.research?.length?'<h3>当时可见的研究数据</h3><ul class="snapshot-list">'+l.research.map(x=>'<li><b>'+esc(x.name)+" "+esc(x.reading)+'</b><small>'+esc(x.period)+" · "+esc(x.mode)+" · "+external(x.url,"原始来源")+'</small></li>').join("")+'</ul>':""}<div class="modal-actions">${action("close","完成","check","btn primary")}</div>`));break;
  }
  case "filter-theses":ui.thesisFilter=id;render();break;
  case "filter-logs":ui.logFilter=id;render();break;
  case "export":exportData();break;
  case "confirm-import":{
   const imported=pendingImport;if(!imported)return;
   await change(s=>Object.assign(s,imported));
   ui.riskDraft={...state.risk};ui.riskDirty=false;closeModal();render();toast("研究记录已恢复");break;
  }
 }
}
async function handleForm(f){
 const fd=new FormData(f),read=k=>cfgField(fd,k),kind=f.dataset.form,id=f.dataset.id,now=new Date().toISOString();
 if(kind==="archive-filter"){await archiveFilter(read("feed"),read("type"));return;}
 if(kind==="research-symbol"){selectSymbol(read("symbol"));render();await checkGroup("company");return;}
 if(kind==="research-attach"){
   const t=state.theses.find(t=>t.id===read("thesis")&&!t.result);
   if(!t||!incomingEvidence)throw Error("请重新选择可用的假设与来源。");
   openModal(evidenceModal(t,incomingEvidence));incomingEvidence=null;return;
 }
 if(["new","copy","edit"].includes(kind)){
   const body={symbol:read("symbol").toUpperCase(),date:read("date"),title:read("title"),claim:read("claim"),contrary:read("contrary"),consensus:read("consensus"),loop:read("loop"),catalyst:read("catalyst"),prob:numField(fd,"prob")};
   if(!/^[A-Z0-9^][A-Z0-9.^/-]{0,11}$/.test(body.symbol))throw Error("请输入有效的美股或 ETF 代码，例如 AMZN、BRK.B。");
   const key=kind==="edit"?id:idFor(),firstEvidence=kind==="new"?incomingEvidence:null;
   await change(s=>{
    if(kind==="edit"){
     const t=requireOpen(s,id);if(JSON.stringify(t)!==editSnapshot)throw Error("这条假设在另一个窗口已更新。请关闭本窗口，重新打开修订。");
     const prev=snapshot(t);Object.assign(t,body);t.events.push({type:"修订",time:now,text:"已保存新版本，初始预测仍用于复盘。",previous:prev});note(s,"修订",t,t.title,`主观概率 ${prev.prob}% 至 ${t.prob}%。修订前的判断已保留。`);
    }else{
     const t={...body,id:key,original:{...body},created:now,events:[],result:null};s.theses.push(t);if(firstEvidence)t.events.push({type:"中性",text:firstEvidence.text,source:firstEvidence.url,time:now});note(s,"创建",t,t.title,`${t.claim}\n初始主观概率 ${t.prob}%。`);
    }
   });
   incomingEvidence=null;closeModal();navigate("thesis/"+key);toast(kind==="edit"?"修订已保存，初始预测已保留":"个人投资假设已保存");return;
 }
 if(kind==="evidence"||kind==="review"){
   const source=read("source");if(source&&!cleanUrl(source))throw Error("请输入以 http 或 https 开头的来源链接。");
   const text=read("text");if(!text)throw Error("请先写下观察或结论。");
   await change(s=>{
    const t=requireOpen(s,id);
    if(kind==="evidence"){
     const before=t.prob,prob=numField(fd,"prob"),direction=read("direction");t.prob=prob;
     const content=text+(prob===before?"":`\n主观概率由 ${before}% 调整为 ${prob}%。`);
     t.events.push({type:direction,text:content,time:now,source:cleanUrl(source)});note(s,"证据",t,t.title,direction+" · "+content);
    }else{
     t.result=read("result");t.review=read("decision")+" · "+text;
     if(source)t.events.push({type:"中性",text:"复盘依据 · "+text,time:now,source:cleanUrl(source)});
     const result={yes:"已验证",no:"已证伪",void:"无法判定"}[t.result];note(s,"复盘",t,t.title,result+" · "+t.review);
    }
   });
   closeModal();render();toast(kind==="evidence"?"新证据已追加":"复盘已封存");return;
 }
 if(kind==="answer"){
   const person=ui.person,q=prompts[person].find(q=>q.id===id),answer=read("answer");
   if(!q||!answer)throw Error("请先写下你的判断。");
   await change(s=>s.training.push({id:idFor(),person,prompt:q.id,answer,time:now}));
   const previous=state.training.filter(row=>row.person===person&&row.prompt===q.id).at(-2);
   const nextDay=recallSchedule(person,state.training).find(row=>prompts[person][row.index].id===q.id).day;
   ui.question[person]=nextPractice(person,state.training);
   render();openModal(answerCompare(q,answer,person,previous,nextDay));return;
 }
 if(kind==="observation"){
   const obs={kind:id,source:cleanUrl(read("source")),manual:true};
   if(id==="aws"){obs.date=read("year")+"-"+read("quarter");obs.sales=numField(fd,"sales");obs.profit=numField(fd,"profit");}
   else{obs.date=read("date");for(const k of id==="fed"?["low","high"]:["two","ten"])obs[k]=numField(fd,k);}
   if(!validObservation(obs))throw Error("请检查日期、数值和原文网址。营收必须为正，目标下限不能超过上限。");
   if(id!=="aws"&&obs.date>localDate())throw Error("观察日期不能晚于今天。");
   if(id==="aws"){
    const year=Number(read("year")),q=Number(read("quarter").slice(1));
    if(new Date(year,q*3,0)>new Date())throw Error("请填写已经结束的季度。预测可记到投资假设中。");
   }
   await change(s=>{s.updates=s.updates.filter(x=>!(x.kind===id&&x.date===obs.date));s.updates.push(obs);});
   closeModal();render();toast("数据已更新，来源已保留");return;
 }
}
$("menu-open").innerHTML=icon("menu",20);$("profile-icon").innerHTML=icon("user",18);$("backup-open").innerHTML=icon("settings",16);$("crumb-icon").innerHTML=icon("folder",16);
const now=new Date(),cnDate=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Shanghai"}).format(now);
$("topdate").innerHTML=icon("calendar",15)+`<span>${cnDate}</span><span class="weekday">${new Intl.DateTimeFormat("zh-CN",{weekday:"long",timeZone:"Asia/Shanghai"}).format(now)}</span>`;
$("menu-open").onclick=()=>navToggle(!$("rail").classList.contains("open"));
$("rail-shade").onclick=()=>{navToggle(false);$("menu-open").focus();};$("backup-open").onclick=()=>{navToggle(false);navigate("data");};
document.querySelector(".skip").onclick=e=>{e.preventDefault();$("content").focus();};
window.addEventListener("hashchange",()=>{closeModal();navToggle(false);render();window.scrollTo(0,0);});
window.addEventListener("storage",e=>{if(e.key!==storeKey||!disk)return;try{state=readDisk();if(!ui.riskDirty)ui.riskDraft={...state.risk};if(!($("dialog").open||route().key==="risk"&&ui.riskDirty))render();}catch(err){errorMessage(err);}});
$("dialog").addEventListener("close",()=>{pendingImport=null;});
$("dialog").addEventListener("click",e=>{if(e.target===$("dialog")){const b=$("dialog").getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeModal();}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("rail").classList.contains("open")){navToggle(false);$("menu-open").focus();}});
document.addEventListener("click",e=>{
 const anchor=e.target.closest("a");if(anchor){if(anchor.closest("#rail"))navToggle(false);return;}
 const el=e.target.closest("[data-act]");if(!el)return;
 doAction(el.dataset.act,el.dataset.id||"").catch(errorMessage);
});
document.addEventListener("input",e=>{
 if(e.target.id==="thesis-search"){ui.search=e.target.value;$("thesis-rows").innerHTML=listContent(state,ui);}
 if(e.target.closest("#risk-form")&&e.target.name!=="type")refreshRisk();
});
document.addEventListener("change",e=>{
 if(e.target.id==="import-file"){const file=e.target.files?.[0];e.target.value="";importFile(file).catch(errorMessage);}
 if(e.target.closest("#risk-form")&&e.target.name==="type"){ui.riskDraft=readRiskForm();ui.riskDirty=true;render();$("risk-form").elements.namedItem("type").focus();}
});
document.addEventListener("submit",async e=>{
 e.preventDefault();const f=e.target;if(!f.dataset.form)return;
 const b=f.querySelector('[type="submit"]');if(b.disabled)return;b.disabled=true;
 try{await handleForm(f);}catch(err){errorMessage(err);}finally{b.disabled=false;}
});
render();
const legacySignatures=new Map();
watchSources((feed,ticker)=>{
 const {key,id}=route(),group=activeGroup(id);
 if(key==="research"&&groups[group].feeds.includes(feed)&&(!companyFeed(feed)||ticker===selectedSymbol())){
   const el=$("research-results");if(el)el.innerHTML=researchResults(group);
 }else if(["desk","data"].includes(key)&&!$("dialog").open&&["aws","curve","rates","policyNews"].includes(feed)){
   const current=JSON.stringify(combinedState(state).updates);
   if(legacySignatures.get("latest")!==current){legacySignatures.set("latest",current);render();}
 }
});
