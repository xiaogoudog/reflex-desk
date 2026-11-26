import {get,today,metric,packed} from "./sources.mjs";
const known={AMZN:1018724,GOOG:1652044,GOOGL:1652044,AAPL:320193,MSFT:789019,NVDA:1045810,META:1326801,TSLA:1318605,AMD:2488,AVGO:1730168,ORCL:1341439,INTC:50863,PLTR:1321655,"BRK-B":1067983};
let tickers=null, tickerTime=0;
export async function lookup(symbol){
  const ticker=symbol.replace(".","-");
  if(!known[ticker]&&(!tickers||Date.now()-tickerTime>86400000)){
    const source=await get("https://www.sec.gov/files/company_tickers.json","json");
    tickers=new Map(Object.values(source).map(row=>[row.ticker,row.cik_str]));
    tickerTime=Date.now();
  }
  const cik=known[ticker]||tickers?.get(ticker);
  if(!cik)throw Error("SEC 代码目录中没有 "+symbol);
  return String(cik).padStart(10,"0");
}
export function filingUrl(cik,accn,document=""){
  const base="https://www.sec.gov/Archives/edgar/data/"+Number(cik)+"/"+accn.replaceAll("-","")+"/";
  return base+(document&&/^[A-Za-z0-9_.-]+$/.test(document)?document:accn+"-index.htm");
}
export async function filings(symbol,previous){
  const cik=await lookup(symbol);
  const sub=await get("https://data.sec.gov/submissions/CIK"+cik+".json","json");
  const f=sub.filings?.recent;if(!Array.isArray(f?.form))throw Error("无法核对申报索引");
  const events=[];
  const knownUrls=new Set((previous?.events||[]).map(e=>e.url));
  let crossed=false;
  for(let i=0;i<f.form.length;i++){
    const form=f.form[i],date=f.acceptanceDateTime?.[i]||f.filingDate[i];
    if(!form||!date||Date.parse(date)>Date.now()+60000)continue;
    const label=form.startsWith("8-K")&&/\b2\.02\b/.test(f.items?.[i]||"")?"业绩披露":({"10-Q":"季度报告","10-K":"年度报告","8-K":"临时公告","20-F":"年度报告","6-K":"境外发行人公告","4":"内部人交易","3":"内部人持有申报","5":"内部人年度申报","DEF 14A":"股东代理声明","SCHEDULE 13G":"持股披露","SCHEDULE 13D":"持股披露"})[form]||"公司申报";
    const period=f.reportDate[i],url=filingUrl(cik,f.accessionNumber[i],f.primaryDocument[i]);
    events.push({date,url,title:symbol+" · "+form+" · "+label+(period?"（"+period+"）":""),label,provider:"SEC EDGAR"});
    if(knownUrls.has(url))crossed=true;
    if(events.length>=60&&(crossed||!knownUrls.size))break;
  }
  return {metrics:[],events,legacy:[],company:sub.name,symbol,note:"包含本发行人 SEC 索引中的定期报告、临时披露和其他申报。已采集的公告可在归档中继续查阅。"};
}
const items=[
  ["revenue","营业收入",["RevenueFromContractWithCustomerExcludingAssessedTax","Revenues","SalesRevenueNet","RevenueFromContractWithCustomerIncludingAssessedTax"]],
  ["operating","营业利润",["OperatingIncomeLoss"]],
  ["net","净利润",["NetIncomeLoss","ProfitLoss"]],
  ["gross","毛利润",["GrossProfit"]],
  ["rd","研发费用",["ResearchAndDevelopmentExpense"]],
  ["ocf","经营现金流",["NetCashProvidedByUsedInOperatingActivities","NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"]],
  ["capex","现金资本开支",["PaymentsToAcquirePropertyPlantAndEquipment","PaymentsToAcquireProductiveAssets"]]
];
const days=(a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
const nextDay=d=>new Date(Date.parse(d)+86400000).toISOString().slice(0,10);
function quarters(facts,tags,asof){
  const result=new Map();
  for(const tag of tags){
    const all=(facts[tag]?.units?.USD||[]).filter(f=>f.start&&f.end&&f.filed<=asof&&/^(10-[QK])(\/A)?$/.test(f.form)&&Number.isFinite(f.val)).sort((a,b)=>a.filed.localeCompare(b.filed));
    const distinct=new Map();
    for(const f of all)distinct.set(f.start+"|"+f.end,f);
    const records=[...distinct.values()],groups=new Map(),single=new Map();
    for(const r of records){
      const duration=days(r.start,r.end);
      if(duration>=65&&duration<=109){
        const before=single.get(r.end);
        if(!before||r.filed>=before.filed)single.set(r.end,{...r,derived:false});
      }
      if(duration>=65&&duration<=382){const group=groups.get(r.start)||[];group.push(r);groups.set(r.start,group);}
    }
    for(const group of groups.values()){
      group.sort((a,b)=>a.end.localeCompare(b.end));
      for(let i=1;i<group.length;i++){
        const r=group[i],p=group[i-1],gap=days(p.end,r.end),span=days(r.start,r.end);
        if(single.has(r.end)||gap<66||gap>109||span<145||span>382||span>305&&!r.form.startsWith("10-K"))continue;
        single.set(r.end,{...r,start:nextDay(p.end),val:r.val-p.val,derived:true,baseAccn:p.accn});
      }
    }
    for(const [end,r] of single)if(!result.has(end))result.set(end,r);
  }
  return result;
}
export async function fundamentals(symbol){
  const cik=await lookup(symbol);
  const raw=await get("https://data.sec.gov/api/xbrl/companyfacts/CIK"+cik+".json","json");
  const facts=raw.facts?.["us-gaap"]||{},asof=today();
  const byId=new Map(items.map(([id,,tags])=>[id,quarters(facts,tags,asof)]));
  const dates=[...new Set([...byId.values()].flatMap(m=>[...m.keys()]))].sort().slice(-24);
  if(!dates.length)return {metrics:[],events:[],legacy:[],symbol,company:raw.entityName,note:"此发行人暂无可按美国会计准则提取的美元单季数据，可从申报原文核对其他口径。"};
  function make(id,name,series,unit="亿美元",basis=""){
    const xs=dates.map(date=>series.get(date)).filter(Boolean);
    const last=xs.at(-1);if(!last)return null;
    const calc=basis|| (last.derived?"按同一财年的累计披露相减，得到单季数值。":"采用申报中的独立单季数值。");
    return metric(id,name,unit,xs.map(r=>({date:r.end,value:unit==="亿美元"?r.val/1e8:r.val,url:filingUrl(cik,r.accn),published:r.filed})),{url:filingUrl(cik,last.accn),provider:"SEC EDGAR",frequency:"财季末",desc:calc,published:last.filed,start:last.start});
  }
  const metrics=items.map(([id,name])=>make(id,name,byId.get(id)));
  function combine(a,b,fn){
    const out=new Map();
    for(const [date,x] of byId.get(a)){
      const y=byId.get(b).get(date);if(!y||x.start!==y.start)continue;
      const value=fn(x.val,y.val);
      if(Number.isFinite(value))out.set(date,{...(x.filed>=y.filed?x:y),val:value});
    }
    return out;
  }
  metrics.push(make("margin","营业利润率",combine("operating","revenue",(x,y)=>y>0?100*x/y:NaN),"%","同一财季营业利润除以营业收入。"),make("fcf","自由现金流",combine("ocf","capex",(x,y)=>x-y),"亿美元","同一财季经营现金流减去现金资本开支。"));
  const levels=[
    ["cash","现金及现金等价物","CashAndCashEquivalentsAtCarryingValue"],
    ["assets","总资产","Assets"],["liabilities","总负债","Liabilities"],
    ["equity","股东权益","StockholdersEquity"],["inventory","存货","InventoryNet"]
  ];
  for(const [id,name,tag] of levels){
    const current=new Map();
    const xs=(facts[tag]?.units?.USD||[]).filter(r=>!r.start&&r.end<=asof&&r.filed<=asof&&/^(10-[QK])(\/A)?$/.test(r.form)&&Number.isFinite(r.val)).sort((a,b)=>a.filed.localeCompare(b.filed));
    for(const r of xs)current.set(r.end,r);
    const points=[...current.values()].sort((a,b)=>a.end.localeCompare(b.end)).slice(-24).map(r=>({date:r.end,value:r.val/1e8,url:filingUrl(cik,r.accn),published:r.filed}));
    if(points.length)metrics.push(metric(id,name,"亿美元",points,{provider:"SEC EDGAR",frequency:"财季末",desc:"公司资产负债表在报告期末的余额。"}));
  }
  const eps=new Map();
  const epsRaw=(facts.EarningsPerShareDiluted?.units?.["USD/shares"]||[]).filter(r=>r.start&&r.filed<=asof&&/^(10-[QK])(\/A)?$/.test(r.form)&&days(r.start,r.end)>=65&&days(r.start,r.end)<=109);
  for(const r of epsRaw.sort((a,b)=>a.filed.localeCompare(b.filed)))eps.set(r.end,r);
  const ep=[...eps.values()].sort((a,b)=>a.end.localeCompare(b.end)).slice(-24).map(r=>({date:r.end,value:r.val,url:filingUrl(cik,r.accn),published:r.filed}));
  if(ep.length)metrics.push(metric("eps","稀释每股收益","美元/股",ep,{provider:"SEC EDGAR",frequency:"财季末",desc:"采用直接披露的单季稀释每股收益。"}));
  return packed(metrics,{company:raw.entityName,symbol,note:"各项显示自己的财季截止日。公司尚未提交或结构化的数字会在随后更新。"});
}
