import {SOURCES,people,prompts,series,samples,strategies,riskError,riskStats,payoff,brier,localDate,recallSchedule} from "./model.mjs";
import {esc,icon,spark,orbit,ticker,fmt,sign,usd,pnl,dateText,external} from "./visuals.mjs";

export const routes={desk:["决策工作台","grid"],research:["实时研究","market"],archive:["采集与归档","history"],theses:["投资假设","layers"],risk:["仓位推演","sliders"],journal:["复盘日志","journal"],training:["思维训练","brain"],data:["数据与备份","data"]};
export const action=(name,label,ic="",style="btn",id="")=>`<button type="button" class="${style}" data-act="${name}" data-id="${esc(id)}">${ic?icon(ic,16):""}${esc(label)}</button>`;
const heading=(title,sub,button="")=>`<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${button}</div>`;
const newBtn=()=>action("new","新建投资假设","plus","btn primary");
const tag=(text,tone="")=>`<span class="tag ${tone}">${esc(text)}</span>`;
const tab=(name,id,text,selected)=>`<button class="${selected?"chosen":""}" data-act="${name}" data-id="${esc(id)}" aria-pressed="${selected}">${esc(text)}</button>`;
const empty=(title,description,button="")=>`<div class="empty">${icon("journal",26)}<strong>${esc(title)}</strong><p>${esc(description)}</p>${button}</div>`;
export const allTheses=state=>[...state.theses].reverse().concat(samples);
const isSample=t=>t.id.startsWith("sample-");
export const statusName=t=>t.result?({yes:"已验证",no:"已证伪",void:"无法判定"}[t.result]):isSample(t)?"研究示例":t.date<=localDate()?"待复盘":"跟踪中";
const statusTag=t=>tag(statusName(t),isSample(t)?"neutral":t.result==="no"?"rose":t.date<=localDate()&&!t.result?"amber":"green");
const createLink=(route,text,cl="text-link")=>`<a class="${cl}" href="#${esc(route)}">${esc(text)}</a>`;
const dualTabs=ui=>`<div class="person-tabs" aria-label="投资人方法">${Object.entries(people).map(([k,v])=>tab("person",k,v.name,ui.person===k)).join("")}</div>`;
export const currentPrompt=ui=>prompts[ui.person][ui.question[ui.person]%prompts[ui.person].length];

export function macroData(type,state){
 const isFed=type==="fed",rows=series(isFed?"fed":"curve",state.updates);
 const last=rows.at(-1),prev=rows.at(-2);
 const spread=r=>Math.round((r.ten-r.two)*100);
 const values=rows.map(r=>isFed?r.high:type==="ten"?r.ten:spread(r));
 const delta=isFed?Math.round((last.high-prev.high)*100):type==="ten"?Math.round((last.ten-prev.ten)*100):spread(last)-spread(prev);
 const meta={
  ten:{title:"10 年期美债收益率",value:fmt(last.ten??0),unit:"%",color:"#3f8976",ic:"bonds",topic:"长期资金价格",desc:"长期国债收益率是观察美元长期折现率的一个参照。可将它与成长股估值、盈利预期的变化放在一起看。"},
  spread:{title:"美债期限利差",value:fmt(isFed?0:spread(last),0),unit:"bp",color:"#9180a3",ic:"curve",topic:"10 年减 2 年",desc:"用同日十年期减去两年期国债收益率。曲线变化同时受政策预期、增长预期和期限溢价影响。1 个基点等于 0.01 个百分点。"},
  fed:{title:"联邦基金目标区间",value:isFed?fmt(last.low)+"–"+fmt(last.high):"",unit:"%",color:"#a47c48",ic:"bank",topic:"政策利率",desc:"区间由 FOMC 决定。此处比较目标区间上限与上次记录的差值。用它标记政策背景，再单独验证企业订单与融资的变化。"}
 }[type];
 return {...meta,rows,last,delta,values};
}
function metricStrip(state){
 return `<div class="macro-strip">${["ten","spread","fed"].map(type=>{
   const m=macroData(type,state);
   return `<button class="macro-card" data-act="macro" data-id="${type}" aria-label="查看${m.title}数据和来源"><span class="macro-label"><i style="--metric-color:${m.color}">${icon(m.ic,15)}</i>${m.title}</span><span class="macro-body"><span class="metric-num ${type==="fed"?"range-num":""}">${m.value}<small>${m.unit}</small></span>${spark(m.values,m.color,type==="fed")}</span><span class="macro-foot"><b>${m.delta===0?"较前值持平":"较前值 "+sign(m.delta,0)+" bp"}</b><span>${dateText(m.last.date)}</span></span></button>`;
 }).join("")}</div>`;
}
function researchChart(ui){
 return `<section class="chart-card"><div class="chart-head"><div class="chart-brand"><span class="chart-logo">a</span><span><b>亚马逊云业务</b><small>AMZN <i> / </i> NASDAQ</small></span></div><div class="dark-segment" aria-label="图表时间跨度">${[4,8].map(v=>tab("period",v,v+" 季",ui.period===v)).join("")}</div></div>
 <div class="chart-read"><span id="chart-caption"></span><div class="chart-reading"><strong id="chart-number">—</strong><span>亿美元</span><b id="chart-change"></b></div></div>
 <div id="chart" class="data-chart" tabindex="0" role="slider" aria-label="AWS 季度数据，使用左右方向键切换季度" aria-valuemin="1"></div>
 <div class="chart-footer"><div class="legend-controls" aria-label="主图指标">${["sales","profit"].map((k,i)=>`<button data-act="chart-metric" data-id="${k}" aria-pressed="${ui.metric===k}" class="legend-button ${ui.metric===k?"active":""}"><i></i>${["营收","营业利润"][i]}</button>`).join("")}</div>${action("aws-table","财报数据","files","chart-source")}</div></section>`;
}
function trainer(ui,trainingPage=false){
 const q=currentPrompt(ui);
 return `<section class="card trainer"><div class="card-title"><span class="heading-icon">${icon("brain",20)}<h2>${trainingPage?"判断练习":"思维训练"}</h2></span>${action("next-prompt","换一题","next","text-btn")}</div>
 ${dualTabs(ui)}<div class="orbit">${orbit(ui.person)}</div><div class="trainer-text"><h3>${esc(q.q)}</h3><p>${esc(q.hint)}</p></div>${action("answer","写下我的判断","pencil","btn soft trainer-action")}</section>`;
}
function budget(state){
 const s=state.risk.stockBudget,p=100-s;
 return `<section class="card budget-card"><div class="card-title"><span class="heading-icon">${icon("pie",19)}<h2>资金预算</h2></span>${createLink("risk","调整预算")}</div><div class="budget-content"><div class="donut" style="--pct:${s}%"><div><b>${fmt(s,0)}<small>%</small></b><span>正股</span></div></div><div class="alloc-key"><div><i></i><span>正股预算</span><b>${s}%</b></div><div><i></i><span>期权预算</span><b>${p}%</b></div></div></div><p class="budget-note">目标资金分配 · 实际投入见仓位推演</p></section>`;
}
function thesisRows(rows,short=false){
 if(!rows.length)return empty("没有符合条件的假设","可以调整筛选条件，或新建一条待验证的投资判断。");
 return `<div class="table-wrap"><table class="thesis-table"><thead><tr><th>标的 / 投资假设</th>${short?"":"<th>主观概率</th>"}<th>状态</th>${short?"":"<th>复盘日期</th>"}<th class="row-end"><span class="sr">查看</span></th></tr></thead><tbody>${rows.map(t=>`<tr data-act="detail" data-id="${esc(t.id)}"><td><a class="ticker-cell" href="#thesis/${esc(t.id)}">${ticker(t.symbol)}<span><b class="symbol">${esc(t.symbol)}</b><span class="row-title">${esc(t.title)}</span></span></a></td>${short?"":`<td class="num">${t.prob}%</td>`}<td>${statusTag(t)}</td>${short?"":`<td class="num date-col">${esc(t.date)}</td>`}<td class="row-end">${icon("chev",15)}</td></tr>`).join("")}</tbody></table></div>`;
}
export function desk(state,ui,shelf=""){
 const due=state.theses.filter(t=>!t.result&&t.date<=localDate()).length;
 const desc=due?`你有 ${due} 条投资假设已到复盘日期。`:"跟踪宏观环境，用证据检验自己的投资判断。";
 const active=allTheses(state).filter(t=>!t.result).slice(0,3);
 return heading("决策工作台",desc,newBtn())+metricStrip(state)+shelf+`<div class="desk-pair">${researchChart(ui)}${trainer(ui)}</div><div class="desk-pair lower-pair"><section class="card list-card"><div class="card-title"><span class="heading-icon">${icon("layers",19)}<h2>跟踪中的假设</h2></span>${createLink("theses","查看全部")}</div>${thesisRows(active,true)}</section>${budget(state)}</div>`;
}
export function filteredTheses(state,ui){
 const term=ui.search.trim().toLowerCase();
 return allTheses(state).filter(t=>(ui.thesisFilter==="全部"||ui.thesisFilter==="我的"&&!isSample(t)||ui.thesisFilter==="研究示例"&&isSample(t)||ui.thesisFilter==="待复盘"&&!isSample(t)&&!t.result&&t.date<=localDate()||ui.thesisFilter==="已复盘"&&t.result)&&(!term||[t.symbol,t.title,t.claim].join(" ").toLowerCase().includes(term)));
}
export const listContent=(state,ui)=>thesisRows(filteredTheses(state,ui));
export function thesisList(state,ui){
 return heading("投资假设","把市场共识、你的预期差和推翻条件写在同一张卡里。",newBtn())+`<section class="card collection"><div class="list-tools"><div class="tabs">${["全部","我的","待复盘","已复盘","研究示例"].map(t=>tab("filter-theses",t,t,ui.thesisFilter===t)).join("")}</div><label class="search-box">${icon("search",16)}<input id="thesis-search" type="search" placeholder="搜索代码或假设" aria-label="搜索代码或假设" value="${esc(ui.search)}"></label></div><div id="thesis-rows">${listContent(state,ui)}</div></section>`;
}
const fieldBlock=(label,text)=>`<div class="fact-block"><small>${label}</small><p>${esc(text||"尚未填写")}</p></div>`;
export function detail(state,id){
 const t=allTheses(state).find(v=>v.id===id);
 if(!t)return heading("未找到这条假设","记录可能位于另一台设备。",createLink("theses","返回投资假设","btn"));
 const sample=isSample(t);
 const toolbar=sample?action("copy","使用这个案例","files","btn primary",t.id):t.result?"":action("evidence","追加证据","plus","btn primary",id);
 const original=t.original||t;
 return `<a href="#theses" class="back-link">投资假设列表</a>`+heading(t.title,sample?"研究示例 · 阈值和概率均为演练假设，可复制后自行修改。":"个人研究记录 · 初始预测保留在下方，供复盘核对。",toolbar)+`<div class="detail-pair"><section class="card pad"><div class="card-title"><span class="ticker-cell">${ticker(t.symbol)}<b class="symbol">${esc(t.symbol)}</b></span>${statusTag(t)}</div>${fieldBlock("可验证的判断",t.claim)}${fieldBlock("市场可能已计入的预期",t.consensus)}${fieldBlock("价格与基本面的反馈路径",t.loop)}<div class="counter-box">${fieldBlock("什么会推翻判断",t.contrary)}</div>${fieldBlock("进一步观察",t.catalyst)}${!sample&&!t.result?action("edit","修订我的假设","pencil","btn light",id):""}</section>
 <div class="stack"><section class="card pad"><div class="card-title"><h2>验证安排</h2>${icon("target",19)}</div><dl class="readouts"><div><dt>当前主观概率</dt><dd>${t.prob}%</dd></div><div><dt>复盘日期</dt><dd>${dateText(t.date)}</dd></div></dl>${!sample&&!t.result?action("review","记录复盘结果","journal","btn soft full",id):""}${action("thesis-risk","带入仓位推演","sliders","btn light full link-risk",id)}${t.result?fieldBlock("复盘结论",t.review):""}</section>
 <section class="card pad"><div class="card-title"><h2>证据与修订</h2>${icon("history",19)}</div>${t.events?.length?[...t.events].reverse().map(e=>`<div class="evidence-item"><div>${tag(e.type,e.type==="反证"?"rose":"neutral")}<small>${dateText(e.time)}</small></div><p>${esc(e.text)}</p>${e.source?external(e.source,"查看证据来源"):""}${e.previous?`<details><summary>修订前的版本</summary>${fieldBlock("原判断",e.previous.claim)}${fieldBlock("原证伪条件",e.previous.contrary)}<p>概率 ${e.previous.prob}% · ${dateText(e.previous.date)}</p></details>`:""}</div>`).join(""):`<p class="muted">${sample?"复制案例后，可以在这里分开记录支持证据和反证。":"有新披露或相反证据时，记录事实、出处和它改变了哪一步判断。"}</p>`}</section></div></div>
 ${sample?"":`<details class="card original"><summary>查看封存的初始预测</summary>${fieldBlock("初始判断",original.claim)}${fieldBlock("初始证伪条件",original.contrary)}<p>初始概率 ${original.prob}% · 原定复盘日期 ${dateText(original.date)}</p></details>`}`;
}
export function training(state,ui){
 const p=people[ui.person],records=[...state.training].reverse(),own=records.filter(t=>t.person===ui.person);
 const schedule=recallSchedule(ui.person,state.training);
 const due=schedule.filter(q=>q.due).length;
 const next=schedule.filter(q=>q.day).sort((a,b)=>a.day.localeCompare(b.day))[0];
 const recall=due?`有 ${due} 题到期回看`:next?`下次回看 ${dateText(next.day)}`:"练习后会安排下一次回看";

 return heading("思维训练","先独立写下答案，再对照思路，回看自己判断时遗漏了什么。")+`<div class="balanced-pair">${trainer(ui,true)}<section class="card pad method-card"><div class="card-title"><h2>方法原文</h2>${icon("book",21)}</div><small class="method-eng">${p.english}</small><h3>${p.theme}</h3><p>${p.principle}</p>${external(p.source,p.sourceLabel)}<div class="method-counter"><b>${own.length}</b><span>次该方法的个人练习</span></div><p class="recall-note">${esc(recall)}</p></section></div><section class="card pad section-next"><div class="card-title"><h2>我的练习记录</h2><small>${records.length} 条</small></div>${records.length?records.map(r=>{const q=prompts[r.person].find(p=>p.id===r.prompt);return `<details class="training-history"><summary><span>${tag(people[r.person].name,"green")} ${esc(q.q)}</span><small>${dateText(r.time)}</small></summary>${fieldBlock("当时的判断",r.answer)}${fieldBlock("对照思路",q.answer)}</details>`;}).join(""):empty("还没有练习记录","完成上方的一道题，这里会按时间保留你的原始回答。")}</section>`;
}
export function journal(state,ui){
 const closed=state.theses.filter(t=>t.result),evaluated=closed.filter(t=>t.result!=="void"),score=brier(state.theses);
 const logs=[...state.logs].reverse().filter(l=>ui.logFilter==="全部"||l.type===ui.logFilter);
 return heading("复盘日志","把当时的预测和事后的结果放在一起，检查自己的概率判断。")+`<div class="summary-row"><div class="card summary-stat"><span>个人假设</span><b>${state.theses.length}</b></div><div class="card summary-stat"><span>已判定预测</span><b>${evaluated.length}</b></div><div class="card summary-stat"><span>Brier 分数</span><b>${score===null?"—":fmt(score,3)}</b><small>按初始概率计算，越低越好</small></div></div><section class="card pad"><div class="card-title"><h2>决策时间线</h2><small>${logs.length} 条</small></div><div class="tabs spaced">${["全部","证据","修订","复盘","推演"].map(t=>tab("filter-logs",t,t,ui.logFilter===t)).join("")}</div>${logs.length?logs.map(l=>`<article class="log-entry"><div class="log-icon">${icon(l.type==="推演"?"sliders":l.type==="复盘"?"journal":"layers",18)}</div><div><div class="log-meta">${tag(l.type,"neutral")} <b>${esc(l.symbol)}</b><small>${dateText(l.time)}</small></div><h3>${esc(l.title)}</h3><p>${esc(l.body)}</p>${[l.risk?action("risk-snapshot","查看当时的推演","","text-link",l.id):"",l.thesisId?createLink("thesis/"+l.thesisId,l.risk?"关联假设":"查看假设"):""].filter(Boolean).join("　")}</div></article>`).join(""):empty("这里将留下你的决策记录","建立个人假设、保存仓位推演或完成复盘后，对应记录会出现在这里。",createLink("theses","查看投资假设","btn soft"))}</section>`;
}
export const sourcesByKind={curve:["美债收益率","美国财政部","同日两年与十年期的收益率，单位为百分比。",SOURCES.ust],fed:["联邦基金目标区间","美联储 FOMC","FOMC 决议或官方每日序列中的目标区间下限与上限。",SOURCES.fed],aws:["AWS 季度财务","Amazon Investor Relations","按自然季度记录分部营收和营业利润，单位为亿美元。",SOURCES.amazon]};
export function dataView(state){
 return heading("数据与备份","官方序列自动更新，也可补录带有来源的观察并导出个人研究记录。")+`<section class="card pad"><div class="card-title"><h2>可维护的数据</h2><a class="text-link" href="#research">查看同步状态</a></div>${Object.entries(sourcesByKind).map(([kind,[name,provider,desc,url]])=>{const last=series(kind,state.updates).at(-1);return `<article class="source-row"><div><h3>${name}</h3><p>${desc}</p><small>${esc(last.date)} · ${external(url,provider)}</small></div>${action("observation","补录数据","plus","btn light",kind)}</article>`;}).join("")}</section><section class="card pad section-next"><div class="card-title"><h2>个人数据</h2>${icon("data",19)}</div><p class="muted">投资假设、证据、推演和练习保存在此浏览器。可导出一份 JSON 备份，在其他设备恢复。</p><div class="action-row">${action("export","导出备份","download","btn soft")}<label class="btn light file-label">导入备份<input id="import-file" type="file" accept=".json,application/json"></label></div></section>`;
}

export function riskInputs(r){
 const formField=(title,key,attrs="min='0' step='any'")=>`<label class="field"><span>${title}</span><input name="${key}" value="${esc(r[key])}" type="number" ${attrs} required></label>`;
 let legs="";
 if(r.type!=="stock"){
   legs+=formField("期权张数（100 股 / 张）","contracts","min='1' max='10000000' step='1'");
   if(["call","collar"].includes(r.type))legs+=formField("看涨行权价（USD）","callK","min='.01' step='any'")+formField((r.type==="collar"?"卖出看涨":"买入看涨")+"权利金 / 股","callPremium","min='.01' step='any'");
   if(["put","collar"].includes(r.type))legs+=formField("看跌行权价（USD）","putK","min='.01' step='any'")+formField("买入看跌权利金 / 股","putPremium","min='.01' step='any'");
 }
 return `<div class="form-grid"><label class="field"><span>标的代码</span><input type="text" name="symbol" maxlength="12" value="${esc(r.symbol)}" required></label>${formField("演算账户总额（USD）","equity","min='.01' step='any'")}<label class="field full-field"><span>目标资金分配 <b id="budget-label" class="field-amount">${r.stockBudget}% 正股 / ${100-r.stockBudget}% 期权</b></span><input type="range" name="stockBudget" min="0" max="100" step="1" value="${r.stockBudget}"></label><label class="field full-field"><span>推演策略</span><select name="type">${Object.entries(strategies).map(([k,v])=>`<option value="${k}" ${r.type===k?"selected":""}>${v}</option>`).join("")}</select></label>${formField("参考股价（USD）","spot","min='.01' step='any'")}${formField("正股数量（股）","shares","min='0' step='1'")}${legs}<label class="field full-field"><span>到期时标的涨跌幅 <b class="field-amount" id="move-label">${sign(r.move,0)}%</b></span><input name="move" type="range" min="-100" max="100" step="1" value="${r.move}"></label></div>`;
}
export function riskResult(r){
 const err=riskError(r);
 if(err)return `<div class="card pad"><div class="card-title"><h2>到期情景</h2></div><p class="form-error">${esc(err)}</p></div>`;
 const stats=riskStats(r), chosen=payoff(r,r.spot*(1+r.move/100));
 const scenarios=[...new Set([-20,0,20,r.move])].sort((a,b)=>a-b);
 return `<section class="risk-hero"><div class="risk-hero-head">${tag(r.symbol,"dark-tag")}<span>${strategies[r.type]}</span></div><p>标的${r.move===0?"持平":r.move>0?"上涨":"下跌"} ${Math.abs(r.move)}% 时的组合盈亏</p><strong class="risk-value">${pnl(chosen.total)}</strong><span>占演算账户 ${sign(chosen.share,2)}% · 到期股价 ${usd(chosen.end)}</span></section><section class="card pad section-next"><div class="card-title"><h2>资金与风险</h2>${icon("pie",19)}</div><dl class="readouts"><div><dt>正股投入</dt><dd>${usd(stats.invested)}</dd></div><div><dt>期权净${stats.premium<0?"收入":"支出"}</dt><dd>${usd(Math.abs(stats.premium))}</dd></div><div><dt>剩余现金</dt><dd>${usd(stats.cash)}</dd></div><div><dt>到期最大亏损</dt><dd>${usd(stats.maxLoss)} <small> / ${fmt(stats.maxLoss/r.equity*100,2)}%</small></dd></div></dl>${stats.equityOver||stats.optionsOver?`<p class="budget-alert">${[stats.equityOver?"正股投入":"",stats.optionsOver?"期权净支出":""].filter(Boolean).join("、")}超过当前设定的分项预算。</p>`:""}</section><section class="card pad section-next"><div class="card-title"><h2>情景对照</h2><small>到期盈亏 · USD</small></div><div class="table-wrap"><table class="scenario-table"><thead><tr><th>标的涨跌</th><th>正股</th><th>期权</th><th>合计</th></tr></thead><tbody>${scenarios.map(n=>{const z=payoff(r,r.spot*(1+n/100));return `<tr class="${n===r.move?"picked":""}"><td>${sign(n,0)}%</td><td>${pnl(z.stock)}</td><td>${pnl(z.options)}</td><td class="${z.total<0?"loss":z.total>0?"gain":""}">${pnl(z.total)}</td></tr>`;}).join("")}</tbody></table></div></section>`;
}
export function riskView(r,linked=null){
 return heading("仓位推演","检验同一标的不同股价下，正股和期权分别给账户带来多少盈亏。")+`<div class="balanced-pair risk-pair"><section class="card pad risk-form-card"><div class="card-title"><h2>演算参数</h2>${tag("手动输入","neutral")}</div><p class="form-intro">初始参数为演算示例，使用时可填入自己的报价与数量。</p>${linked?`<div class="linked-thesis"><span>关联假设 <b>${esc(linked.title)}</b></span>${action("unlink-thesis","解除关联","","text-link")}</div>`:""}<form id="risk-form">${riskInputs(r)}<div class="action-row">${action("risk-save","保存参数","save","btn light")}${action("risk-log","记入复盘日志","journal","btn primary")}</div></form><details class="model-notes"><summary>计算口径与来源</summary><p>股票与标准美股期权使用同一标的，领口组合的两腿使用同一到期日。每张按 100 股计算，其余资金为现金。结果按到期内在价值计算，未计手续费、税费、利息、分红、提前行权或到期前的波动率与时间价值。</p><p>期权预算采用净权利金支出。最大亏损按所列持仓计算，剩余现金计入账户总额。${external(SOURCES.collar,"OIC 领口策略")} · ${external(SOURCES.options,"OIC 看涨期权")}</p></details></section><div id="risk-output">${riskResult(r)}</div></div>`;
}

