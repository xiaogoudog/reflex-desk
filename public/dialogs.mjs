import {esc,icon,fmt,sign,external,dateText} from "./visuals.mjs";
import {SOURCES,people,futureDay,localDate,series} from "./model.mjs";
import {action,currentPrompt,macroData,sourcesByKind} from "./views.mjs";

const input=(name,value="",extra="")=>`<input name="${name}" value="${esc(value)}" ${extra}>`;
const area=(name,value,placeholder,required=false,rows=2)=>`<textarea name="${name}" maxlength="2500" rows="${rows}" placeholder="${esc(placeholder)}" ${required?"required":""}>${esc(value)}</textarea>`;
const field=(label,body,wide=true)=>`<label class="field ${wide?"full-field":""}"><span>${label}</span>${body}</label>`;
export function frame(title,body,kicker=""){
 return `<div class="dialog-head"><div>${kicker?`<small>${esc(kicker)}</small>`:""}<h2 id="dialog-title">${esc(title)}</h2></div><button class="icon-btn close-btn" data-act="close" aria-label="关闭">${icon("close",19)}</button></div>${body}`;
}
function buttons(label){return `<div class="modal-actions">${action("close","取消","","btn light")}<button class="btn primary" type="submit">${esc(label)}</button></div>`;}
const form=(kind,id,body,save)=>`<form class="dialog-form" data-form="${kind}" data-id="${esc(id||"")}">${body}<p class="form-error" role="alert"></p>${buttons(save)}</form>`;
export function thesisModal(mode,t={}){
 const title={new:"新建投资假设",copy:"建立我的投资假设",edit:"修订投资假设"}[mode];
 const body=`<div class="form-grid">
 ${field("标的代码",input("symbol",t.symbol,"required maxlength='12' placeholder='例如 AMZN'"),false)}
 ${field("复盘日期",input("date",t.date||futureDay(30),"type='date' required"),false)}
 ${field("假设标题",input("title",t.title,"required maxlength='90' placeholder='用一句话概括你要检验的问题'"))}
 ${field("我的可验证判断",area("claim",t.claim,"到哪一天，哪个指标会达到什么水平？",true))}
 ${field("证伪条件",area("contrary",t.contrary,"哪项事实出现，就表示这条预测落空？",true))}
 ${field("判断成立的主观概率（%）",input("prob",t.prob??50,"type='number' min='0' max='100' step='1' required"),false)}
 </div><details class="form-details" ${mode==="new"?"":"open"}><summary>预期差、反馈路径与行动条件</summary><div class="form-grid">
 ${field("市场可能已经计入什么",area("consensus",t.consensus,"用估值、分析师预期或管理层指引说明你的判断与共识差在哪里。"))}
 ${field("价格如何反过来影响企业",area("loop",t.loop,"例如融资成本改变扩产节奏，新增产能又怎样影响利润？"))}
 ${field("催化剂与行动条件",area("catalyst",t.catalyst,"未来 18–24 个月什么会变？下一次验证是什么时候？什么条件触发等待、加仓或减仓？"))}</div></details>`;
 return frame(title,form(mode,t.id,body,mode==="edit"?"保存修订":"保存个人假设"),mode==="copy"?"从研究示例开始":"");
}
export function evidenceModal(t,reference=null){
 const body=`<p class="dialog-intro">${esc(t.symbol)} · ${esc(t.title)}</p><div class="form-grid">
 ${field("证据方向",`<select name="direction"><option>反证</option><option>支持</option><option ${reference?"selected":""}>中性</option></select>`,false)}
 ${field("更新后的主观概率（%）",input("prob",t.prob,"type='number' required min='0' max='100' step='1'"),false)}
 ${field("事实及其影响",area("text",reference?.text||"","写下观察到的事实，以及它加强或削弱了哪个判断。",true,3))}
 ${field("来源链接（选填）",input("source",reference?.url||"","type='url' maxlength='1800' placeholder='https://…'"))}</div>`;
 return frame("追加证据",form("evidence",t.id,body,"保存证据"));
}
export function reviewModal(t){
 const o=t.original;
 const body=`<div class="review-seal"><small>封存的初始预测 · ${o.prob}%</small><p>${esc(o.claim)}</p><small>证伪条件</small><p>${esc(o.contrary)}</p></div><div class="form-grid">
 ${field("按初始标准判定",`<select name="result"><option value="yes">已验证</option><option value="no">已证伪</option><option value="void">无法判定</option></select>`,false)}
 ${field("你的仓位决定",`<select name="decision">${["继续观察","维持仓位","减仓","加仓","退出","暂不参与"].map(v=>`<option>${v}</option>`).join("")}</select>`,false)}
 ${field("结果与教训",area("text","","实际发生了什么？你当时忽略了什么？这个结果会怎样影响下一次判断？",true,3))}
 ${field("结果来源（选填）",input("source","","type='url' maxlength='1800' placeholder='https://…'"))}</div>
 <p class="small-note">保存后封存本次复盘。选择“无法判定”的记录不计入 Brier 分数。</p>`;
 return frame("复盘投资假设",form("review",t.id,body,"封存复盘"));
}
export function answerModal(ui){
 const q=currentPrompt(ui),p=people[ui.person];
 const body=`<div class="training-question"><span class="tag green">${esc(q.tag)}</span><h3>${esc(q.q)}</h3><p>${esc(q.hint)}</p></div><div class="form-grid">${field("我的判断",area("answer","","先写下你想到的因果链或验证方法。",true,4))}</div>`;
 return frame("写下我的判断",form("answer",q.id,body,"保存并查看对照"),p.name);
}
export function answerCompare(q,answer,person,previous,nextDay){
 return frame("对照你的判断",`<div class="compare-body"><h3>${esc(q.q)}</h3><div class="fact-block"><small>你的原始回答</small><p>${esc(answer)}</p></div>${previous?`<div class="fact-block"><small>上一次的回答 · ${dateText(previous.time)}</small><p>${esc(previous.answer)}</p></div>`:""}<div class="review-seal"><small>参考思路</small><p>${esc(q.answer)}</p></div><p class="recall-note">下次回看 ${dateText(nextDay)}。到期后再次打开练习，会优先显示这一题。</p>${external(people[person].source,people[person].sourceLabel)}</div><div class="modal-actions">${action("training-history","查看练习记录","journal","btn light")}${action("close","完成","check","btn primary")}</div>`);
}
export function macroModal(type,state){
 const m=macroData(type,state),fed=type==="fed";
 const headers=fed?["观察或决议日期","目标区间"]:["观察日期","2 年","10 年","利差"];
 return frame(m.title,`<p class="dialog-intro">${esc(m.desc)}</p><div class="table-wrap modal-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}<th>来源</th></tr></thead><tbody>${m.rows.slice(-12).reverse().map(r=>`<tr><td class="num">${esc(r.date)}</td>${fed?`<td>${fmt(r.low)}–${fmt(r.high)}%</td>`:`<td>${fmt(r.two)}%</td><td>${fmt(r.ten)}%</td><td>${sign((r.ten-r.two)*100,0)} bp</td>`}<td>${external(r.source,r.manual?"补录":"原文")}</td></tr>`).join("")}</tbody></table></div><div class="modal-actions">${action("observation","补录数据","plus","btn soft",fed?"fed":"curve")}${action("close","完成","","btn primary")}</div>`,"宏观快照");
}
export function awsModal(state){
 const rows=series("aws",state.updates);
 return frame("AWS 分部财务数据",`<p class="dialog-intro">单位为亿美元。营业利润率按营业利润除以营收计算，各季度均保留来源。</p><div class="table-wrap modal-table"><table><thead><tr><th>财季</th><th>营收</th><th>营业利润</th><th>利润率</th><th>来源</th></tr></thead><tbody>${[...rows].reverse().map(r=>`<tr><td class="num">${esc(r.date)}</td><td>${fmt(r.sales)}</td><td>${fmt(r.profit)}</td><td>${fmt(r.profit/r.sales*100,1)}%</td><td>${external(r.source,r.manual?"补录":"财报")}</td></tr>`).join("")}</tbody></table></div><div class="modal-actions">${action("observation","补录季度","plus","btn soft","aws")}${action("close","完成","","btn primary")}</div>`,"AMZN / NASDAQ");
}
export function observationModal(kind){
 const [title,provider,desc,url]=sourcesByKind[kind];
 const numeric=(lab,name)=>field(lab,input(name,"","type='number' step='any' required"),false);
 const now=new Date();
 const body=`<p class="dialog-intro">${desc} 同一期补录会更新该期显示值。</p><div class="form-grid">
 ${kind==="aws"?field("财季",`<div class="split-field">${input("year",now.getFullYear(),"type='number' min='1900' max='2200' required")}<select name="quarter" aria-label="季度"><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option></select></div>`):field("观察日期",input("date",localDate(),"type='date' required"))}
 ${kind==="aws"?numeric("AWS 营收（亿美元）","sales")+numeric("营业利润（亿美元）","profit"):kind==="fed"?numeric("目标下限（%）","low")+numeric("目标上限（%）","high"):numeric("2 年期收益率（%）","two")+numeric("10 年期收益率（%）","ten")}
 ${field("本次披露的来源链接",input("source","","type='url' required maxlength='1800' placeholder='https://…'"))}</div><p class="small-note">查阅 ${external(url,provider)}</p>`;
 return frame("补录"+title,form("observation",kind,body,"保存数据"));
}

