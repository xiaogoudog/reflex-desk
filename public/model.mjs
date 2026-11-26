export const SOURCES = {
  amazon: "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Third-Quarter-Results/",
  amazon2025: "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Fourth-Quarter-Results/",
  ust: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value_month=202611",
  fed: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm",
  soros: "https://www.opensocietyfoundations.org/uploads/2b96bb8c-e2e1-4d88-9eea-badf16d0a2b8/george-soros-financial-markets-transcript.pdf",
  stan: "https://www.nbim.no/en/news-and-insights/podcast/2024/stan-druckenmiller-inside-the-mind-of-a-legendary-investor/",
  options: "https://www.optionseducation.org/strategies/all-strategies/long-call",
  collar: "https://www.optionseducation.org/strategies/all-strategies/collar-protective-collar"
};

// Amazon reports segment values in millions of USD. The interface displays 亿美元.
const awsBase = [
  ["2024-Q3",27452,10447],["2024-Q4",28786,10632],
  ["2025-Q1",29267,11547],["2025-Q2",30873,10160],["2025-Q3",33006,11434],["2025-Q4",35579,12465],
  ["2026-Q1",37587,14161],["2026-Q2",42232,16621],["2026-Q3",45984,17773]
].map(([date,sales,profit])=>({ kind:"aws", date, sales:sales/100, profit:profit/100, source:date<"2025-Q2"?SOURCES.amazon2025:SOURCES.amazon }));
const curveBase = [
  [10,4.73,4.98],[12,4.86,5.10],[13,4.88,5.15],[16,4.83,5.12],[17,4.80,5.10],
  [18,4.80,5.07],[19,4.76,5.04],[20,4.63,4.92],[23,4.63,4.92],[24,4.63,4.91]
].map(([day,two,ten])=>({kind:"curve",date:"2026-11-"+day,two,ten,source:SOURCES.ust}));
const fedBase = [
  ["2026-04-29",3.5,3.75],["2026-07-29",3.5,3.75],["2026-09-16",3.75,4],["2026-10-28",3.75,4]
].map(([date,low,high])=>({kind:"fed",date,low,high,source:"https://www.federalreserve.gov/newsevents/pressreleases/monetary"+date.replaceAll("-","")+"a.htm"}));

export function series(kind, updates=[]) {
  const data = {aws:awsBase,curve:curveBase,fed:fedBase}[kind];
  const records = new Map(data.map(row=>[row.date,row]));
  updates.filter(row=>row.kind===kind).forEach(row=>records.set(row.date,row));
  return [...records.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export const people = {
  soros:{name:"索罗斯",english:"George Soros",theme:"反身性",source:SOURCES.soros,sourceLabel:"中欧大学金融市场讲座 · 2009",principle:"市场价格会影响融资、投资和经营决策。追踪这些变化如何反过来影响价格，并寻找循环可能中断的环节。"},
  stan:{name:"德鲁肯米勒",english:"Stanley Druckenmiller",theme:"前瞻与仓位",source:SOURCES.stan,sourceLabel:"挪威银行投资管理访谈 · 2024",principle:"先想象企业在未来 18–24 个月会是什么样，再检查今天的价格反映了多少。用企业订单和产能变化校验宏观判断。"}
};
export const prompts = {
  soros:[
    {id:"s1",tag:"反身性",q:"如果股价下跌，你看好的业务也会变差吗？",hint:"以 AWS 为例，沿着资金、扩产和客户订单，找出一条能被验证的路径。",answer:"先判断扩产依赖股权融资、债务还是经营现金流。若股价下跌而预算、融资条件和客户预订量都没变，股价到经营这段传导就缺乏证据。"},
    {id:"s2",tag:"可错性",q:"哪项事实出现，会让你撤回看多判断？",hint:"写一个指标、阈值和验证日期。尽量不要用股价涨跌代替业务条件。",answer:"例如事先记录某季度 AWS 营收增长和营业利润率的最低要求。披露后按原口径核对，保留落空的预测，再决定是否提出新假设。"},
    {id:"s3",tag:"反馈反转",q:"一个好消息，什么时候会变成未来的坏消息？",hint:"沿着高需求、扩产、利用率和定价四个环节推演一次。",answer:"试着描述两种结局。新产能投入后，若订单兑现，利用率可能上升。若客户推迟部署，费用可能先于收入确认。用利用率或利润率去区分。"}
  ],
  stan:[
    {id:"d1",tag:"前瞻推演",q:"18 个月后，哪件事会与今天的定价不同？",hint:"把你对云业务的预测和市场已计入的预期放在同一张表里。",answer:"选一个未来变量，例如交付产能带来的收入。用区间估计收入和利润，再反推什么估值已计入这个结果。若两者接近，业务增长未必带来预期差。"},
    {id:"d2",tag:"宏观验证",q:"长端利率上行，能从哪些企业数据看到影响？",hint:"从客户预算、订单转化或项目延期中选一个先行指标。",answer:"写出折现率上升对估值的影响，再单独列出客户融资成本对订单的影响。两条路径发生在不同时间，可分别用债券收益率与企业披露检验。"},
    {id:"d3",tag:"仓位与赔率",q:"即使方向看对了，这笔期权仍可能怎么亏？",hint:"把催化剂日期、到期日和盈亏平衡价格摆在一起。",answer:"若股价上涨太慢，买入看涨期权可能到期仍低于行权价加权利金。可以把同一终点价格代入正股和期权，比较各自的收益及占总资产的损失。"}
  ]
};

export const samples = [
  {id:"sample-amzn",symbol:"AMZN",title:"AWS 扩产能否转化为利润？",claim:"2027 年第一季度，AWS 营收同比增长至少 25%，且分部营业利润率至少 35%。",consensus:"假定市场已期待强劲需求，仍需用一致预期和估值检验增长是否已经计价。",loop:"市场对算力需求的预期若改善融资条件，可能支持亚马逊提前扩产。只有新增容量转化为付费使用，利润增长才可能进一步支持原先的估值。",contrary:"到目标季度，营收增速低于 25% 或营业利润率低于 35%，即判定这条预测未达标。",catalyst:"逐季核对 AWS 分部收入、营业利润和管理层对产能利用率的解释。跟踪折旧压力及订单兑现情况。",date:"2027-05-15",prob:60},
  {id:"sample-googl",symbol:"GOOGL",title:"AI 搜索能否守住广告收入增长？",claim:"2027 年第一季度，Google 搜索及其他业务的广告收入同比至少增长 10%。",consensus:"假定市场对 AI 搜索的广告变现效率存在分歧，需检验估值对不同结果的敏感度。",loop:"AI 搜索若吸引更多用户，可能提高广告主试投意愿。投放回报决定预算能否持续流入。",contrary:"当季搜索及其他广告收入同比低于 10%，原预测即告落空。",catalyst:"核对 Alphabet 季报中的 Google Search & other 收入及关于广告变现的说明。",date:"2027-05-15",prob:55},
  {id:"sample-qqq",symbol:"QQQ",title:"长端利率回落会带动成长股吗？",claim:"从 2026 年 11 月 24 日至 2027 年 3 月末，十年期美债收益率至少下降 25 个基点，且 QQQ 的含息回报高于 SPY。",consensus:"假定投资者已部分计入利率回落，需要观察相对回报是否仍超出预期。",loop:"长端利率回落可能提高成长股估值。若同时发生盈利预期下修，估值改善可能被抵消。",contrary:"到观察期末，利率回落幅度不足 25 个基点，或 QQQ 的含息回报未超过 SPY。",catalyst:"用美国财政部期限收益率和同口径复权价格核对两项条件。",date:"2027-04-02",prob:50}
];

export const strategies = {stock:"仅持正股",call:"正股 + 买入看涨",put:"正股 + 保护性看跌",collar:"领口组合"};
export const baseRisk = {symbol:"AMZN",equity:100000,stockBudget:70,spot:200,shares:100,type:"call",contracts:1,callK:210,callPremium:8,putK:185,putPremium:5,move:-20};
export const makeState = ()=>({version:1,theses:[],logs:[],training:[],updates:[],risk:{...baseRisk}});

export function cleanUrl(s){
  try {const u=new URL(s);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";} catch {return "";}
}
export function isoDay(s){return typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;}
export const idFor=()=>globalThis.crypto.randomUUID();
export function localDate(date=new Date()){
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
export function futureDay(n){const d=new Date();d.setDate(d.getDate()+n);return localDate(d);}
export function recallSchedule(person,training,today=localDate()){
  return prompts[person].map((prompt,index)=>{
    const days=[...new Set(training.filter(r=>r.person===person&&r.prompt===prompt.id).map(r=>localDate(new Date(r.time))))].sort();
    if(!days.length)return {index,day:null,due:false};
    const interval=[1,3,7,14,30][Math.min(days.length-1,4)];
    const next=new Date(days.at(-1)+"T12:00:00");
    next.setDate(next.getDate()+interval);
    const day=localDate(next);
    return {index,day,due:day<=today};
  });
}
export function nextPractice(person,training){
  const byDate=(a,b)=>a.day.localeCompare(b.day);
  const choices=recallSchedule(person,training);
  return (choices.filter(q=>q.due).sort(byDate)[0]||choices.find(q=>!q.day)||choices.sort(byDate)[0]).index;
}
const nOK=(n,min,max)=>typeof n==="number"&&Number.isFinite(n)&&n>=min&&n<=max;
const textOK=(s,max=6000)=>typeof s==="string"&&s.length<=max;
const stampOK=s=>textOK(s,40)&&!Number.isNaN(Date.parse(s));
const symbolOK=s=>typeof s==="string"&&/^[A-Z0-9^][A-Z0-9.^/-]{0,11}$/.test(s);
export function riskError(r){
  if(!r||!symbolOK(r.symbol)) return "请输入有效的标的代码。";
  if(!nOK(r.equity,0.01,1e12)||!nOK(r.stockBudget,0,100)) return "请输入正数账户资金，正股预算需在 0% 到 100% 之间。";
  if(!Object.hasOwn(strategies,r.type)||!nOK(r.spot,.01,1e7)||!Number.isInteger(r.shares)||!nOK(r.shares,0,1e9)||!nOK(r.move,-100,500)) return "请检查参考股价、整股数量和情景涨跌幅。";
  if(r.type==="stock"&&r.shares===0) return "仅持正股时，请至少输入 1 股。";
  if(r.type!=="stock"){
    if(!Number.isInteger(r.contracts)||!nOK(r.contracts,1,1e7)) return "期权合约张数须为正整数。";
    if(["call","collar"].includes(r.type)&&(!nOK(r.callK,.01,1e7)||!nOK(r.callPremium,.01,1e7))) return "请填写看涨期权的行权价和每股权利金。";
    if(["put","collar"].includes(r.type)&&(!nOK(r.putK,.01,1e7)||!nOK(r.putPremium,.01,1e7))) return "请填写看跌期权的行权价和每股权利金。";
    if(["put","collar"].includes(r.type)&&r.contracts*100>r.shares) return "每张保护性看跌或领口组合需对应至少 100 股正股。";
    if(r.type==="collar"&&r.putK>=r.callK) return "领口组合的看跌行权价应低于看涨行权价。";
  }
  if(r.shares*r.spot+optionCost(r)>r.equity+0.00001) return "本次净投入超过演算资金。请调整数量或资金，再按现金账户推演。";
  return "";
}
function optionCost(r){
  const p={stock:0,call:r.callPremium,put:r.putPremium,collar:r.putPremium-r.callPremium}[r.type];
  return r.type==="stock"?0:p*r.contracts*100;
}
export function payoff(r,end){
  const stock=r.shares*(end-r.spot);
  const call=Math.max(end-r.callK,0), put=Math.max(r.putK-end,0);
  const intrinsic={stock:0,call,put,collar:put-call}[r.type];
  const options=r.type==="stock"?0:intrinsic*r.contracts*100-optionCost(r);
  return {end,stock,options,total:stock+options,share:(stock+options)/r.equity*100};
}
export function riskStats(r){
  const invested=r.shares*r.spot, premium=optionCost(r);
  return {invested,premium,cash:r.equity-invested-premium,maxLoss:Math.max(0,-payoff(r,0).total),
    equityOver:invested>r.equity*r.stockBudget/100+.00001,optionsOver:Math.max(0,premium)>r.equity*(100-r.stockBudget)/100+.00001};
}
export function validObservation(o){
  if(!o||!cleanUrl(o.source))return false;
  if(o.kind==="aws")return /^\d{4}-Q[1-4]$/.test(o.date)&&nOK(o.sales,.01,1e7)&&nOK(o.profit,-1e7,1e7);
  if(!isoDay(o.date))return false;
  if(o.kind==="curve")return nOK(o.ten,-10,100)&&nOK(o.two,-10,100);
  return o.kind==="fed"&&nOK(o.high,-10,100)&&nOK(o.low,-10,o.high);
}
const fields=["title","claim","consensus","loop","contrary","catalyst"];
function validThesisBody(t){
  return t&&symbolOK(t.symbol)&&fields.every(k=>textOK(t[k],2500))&&Boolean(t.title.trim()&&t.claim.trim()&&t.contrary.trim())&&isoDay(t.date)&&nOK(t.prob,0,100);
}
export function validState(s){
  if(!s||s.version!==1||riskError(s.risk)||!["theses","logs","training","updates"].every(k=>Array.isArray(s[k])&&s[k].length<=20000))return false;
  const seen=new Set();
  const unique=id=>typeof id==="string"&&/^[a-zA-Z0-9-]{1,90}$/.test(id)&&!seen.has(id)&&!!seen.add(id);
  const theses=s.theses.every(t=>validThesisBody(t)&&unique(t.id)&&!t.id.startsWith("sample-")&&validThesisBody(t.original)&&stampOK(t.created)&&
    (!t.result||["yes","no","void"].includes(t.result))&&(!t.result||textOK(t.review))&&
    Array.isArray(t.events)&&t.events.every(e=>e&&["支持","反证","中性","修订"].includes(e.type)&&textOK(e.text)&&stampOK(e.time)&&textOK(e.source||"")&&(!e.source||!!cleanUrl(e.source))&&(!e.previous||validThesisBody(e.previous))));
  const logs=s.logs.every(l=>l&&unique(l.id)&&["创建","证据","修订","复盘","推演"].includes(l.type)&&textOK(l.title)&&textOK(l.body)&&stampOK(l.time)&&symbolOK(l.symbol)&&textOK(l.thesisId||"",90)&&(!l.risk||!riskError(l.risk))&&(!l.research||(Array.isArray(l.research)&&l.research.length<=12&&l.research.every(r=>r&&textOK(r.name,180)&&textOK(r.reading,140)&&textOK(r.period,70)&&textOK(r.mode,50)&&stampOK(r.checked)&&!!cleanUrl(r.url)))));
  const training=s.training.every(t=>t&&unique(t.id)&&["soros","stan"].includes(t.person)&&prompts[t.person].some(q=>q.id===t.prompt)&&textOK(t.answer)&&stampOK(t.time));
  return theses&&logs&&training&&s.updates.every(validObservation);
}
export function brier(theses){
  const done=theses.filter(t=>["yes","no"].includes(t.result));
  if(!done.length)return null;
  return done.reduce((sum,t)=>sum+(t.original.prob/100-(t.result==="yes"?1:0))**2,0)/done.length;
}

