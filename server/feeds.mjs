import { get, today, round, numeric, fredUrl, fred, metric, seq, changeMonths, plain, tag, rss, packed } from "./sources.mjs";
const fmeta=(id,frequency,desc)=>({provider:"FRED",url:fredUrl(id),frequency,desc});
export async function macro(){
  const rows=await fred(["CPIAUCNS","CPIAUCSL","UNRATE"]);
  const yoy=metric("cpi-yoy","CPI 同比","%",changeMonths(rows,"CPIAUCNS",12),fmeta("CPIAUCNS","月度","美国城市消费者 CPI，未季调，较去年同月。"));
  const mom=metric("cpi-mom","CPI 环比","%",changeMonths(rows,"CPIAUCSL",1),fmeta("CPIAUCSL","月度","季调 CPI，较上月。"));
  const latest=seq(rows,"CPIAUCNS").at(-1);
  return packed([yoy,mom,metric("unrate","失业率","%",seq(rows,"UNRATE"),fmeta("UNRATE","月度","美国 U-3 失业率，经季节调整。"))],{note:yoy&&latest&&latest.date>yoy.date?"最新一期缺少去年同期的可比基数。同比栏保留最近可计算月份，环比栏单独更新。":""});
}
export async function growth(){
  const id="A191RL1Q225SBEA",rows=await fred([id],4);
  return packed([metric("gdp","实际 GDP 季环比折年率","%",seq(rows,id),fmeta(id,"季度","美国实际国内生产总值，季调后较上季度的年化增速。"))]);
}
export async function rates(){
  const rows=await fred(["DFEDTARL","DFEDTARU","DFF"],1);
  const both=rows.filter(r=>numeric(r.DFEDTARL)&&numeric(r.DFEDTARU));
  const latest=both.at(-1);
  const target=metric("target","联邦基金目标区间","%",both.map(r=>({date:r.date,value:r.DFEDTARU,display:r.DFEDTARL.toFixed(2)+"–"+r.DFEDTARU.toFixed(2)})),fmeta("DFEDTARU","每日","美联储目标区间。趋势线显示区间上限。"));
  if(target)target.display=latest.DFEDTARL.toFixed(2)+"–"+latest.DFEDTARU.toFixed(2);
  const legacy=both.filter((r,i)=>i===0||r.DFEDTARL!==both[i-1].DFEDTARL||r.DFEDTARU!==both[i-1].DFEDTARU||i===both.length-1).map(r=>({kind:"fed",date:r.date,low:r.DFEDTARL,high:r.DFEDTARU,source:fredUrl("DFEDTARU"),automatic:true}));
  return packed([target,metric("effr","有效联邦基金利率","%",seq(rows,"DFF"),fmeta("DFF","每日","纽约联储按实际隔夜交易计算的有效利率。"))],{legacy});
}
export async function balance(){
  const rows=await fred(["WALCL"],2);
  return packed([metric("walcl","美联储总资产","万亿美元",seq(rows,"WALCL").map(p=>({...p,value:p.value/1e6})),fmeta("WALCL","每周","H.4.1 资产负债表，按周三余额。"))]);
}
const treasury="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/";
function monthAt(n){const [y,m]=today().split("-").map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7).replace("-","");}
async function monthCurve(month){
  const xml=await get(treasury+"pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month="+month);
  const data=[];
  for(const [,s] of xml.matchAll(/<m:properties>([\s\S]*?)<\/m:properties>/g)){
    const date=tag(s,"d:NEW_DATE").slice(0,10),two=tag(s,"d:BC_2YEAR"),ten=tag(s,"d:BC_10YEAR");
    if(date&&date<=today()&&numeric(two)&&numeric(ten))data.push({kind:"curve",date,two:Number(two),ten:Number(ten),source:treasury+"TextView?type=daily_treasury_yield_curve&field_tdr_date_value_month="+month,automatic:true});
  }
  return data;
}
async function yearlyTreasury(){
  const year=today().slice(0,4);
  const csv=await get(treasury+"daily-treasury-rates.csv/"+year+"/all?type=daily_treasury_yield_curve&field_tdr_date_value="+year+"&page&_format=csv");
  const [head,...lines]=csv.trim().split(/\r?\n/);
  const columns=head.replaceAll('"',"").split(",");
  const twoIndex=columns.indexOf("2 Yr"),tenIndex=columns.indexOf("10 Yr");
  if(twoIndex<0||tenIndex<0)throw Error("财政部 CSV 期限字段缺失");
  const end=today();
  return lines.flatMap(line=>{
    const cells=line.split(","),match=cells[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(!match||!numeric(cells[twoIndex])||!numeric(cells[tenIndex]))return [];
    const date=[match[3],match[1].padStart(2,"0"),match[2].padStart(2,"0")].join("-");
    const source=treasury+"TextView?type=daily_treasury_yield_curve&field_tdr_date_value_month="+date.slice(0,7).replace("-","");
    return date<=end?[{kind:"curve",date,two:Number(cells[twoIndex]),ten:Number(cells[tenIndex]),source,automatic:true}]:[];
  }).sort((a,b)=>a.date.localeCompare(b.date)).slice(-45);
}
async function alternateTreasury(){
  const [prior,current]=await Promise.allSettled([monthCurve(monthAt(-1)),monthCurve(monthAt(0))]);
  if(current.status==="rejected")throw current.reason;
  return [...(prior.status==="fulfilled"?prior.value:[]),...current.value].sort((a,b)=>a.date.localeCompare(b.date));
}
async function fredCurve(){
  const series=await fred(["DGS2","DGS10"],1);
  return series.filter(r=>numeric(r.DGS2)&&numeric(r.DGS10)).slice(-45).map(r=>({kind:"curve",date:r.date,two:r.DGS2,ten:r.DGS10,source:fredUrl("DGS10"),automatic:true}));
}
export async function curve(previous){
  const threshold=previous?.legacy?.at(-1)?.date||"";
  let rows=await yearlyTreasury().catch(()=>[]);
  if(!rows.length||rows.at(-1).date<threshold){
    const alternatives=await Promise.allSettled([alternateTreasury(),fredCurve()]);
    for(const candidate of alternatives){
      if(candidate.status==="fulfilled"&&candidate.value.length&&(!rows.length||candidate.value.at(-1).date>rows.at(-1).date))rows=candidate.value;
    }
  }
  const provider=rows.at(-1)?.source.startsWith(fredUrl("DGS10"))?"FRED · 美国财政部":"美国财政部";
  const last=rows.at(-1);if(!last)throw Error("缺少同日美债期限数据");
  const props={provider,url:last.source,frequency:"交易日",desc:"美国国债固定期限收益率，财政部按交易日公布。"};
  return packed([metric("ten","10 年期美债收益率","%",seq(rows,"ten"),props),metric("two","2 年期美债收益率","%",seq(rows,"two"),props),metric("spread","10 年减 2 年利差","bp",rows.map(r=>({date:r.date,value:Math.round((r.ten-r.two)*100),url:r.source})),{...props,desc:"同一交易日的两个期限相减，1 个基点等于 0.01 个百分点。"})],{legacy:rows.slice(-42)});
}
export async function industry(){
  const items=[["IPG3344S","半导体与电子元件"],["IPG3341S","计算机与外围设备"],["IPG3361T3S","汽车及零部件"],["IPMINE","采矿业"]];
  const rows=await fred(items.map(x=>x[0]));
  return packed(items.map(([id,name])=>metric(id,name+"产出同比","%",changeMonths(rows,id,12),fmeta(id,"月度","美联储 G.17 美国产业生产指数的同比变化，衡量实际产出。"))));
}
const fedHost="www.federalreserve.gov",amazonHost="ir.aboutamazon.com";
function frac(s){const match=s.match(/^(\d+)(?:[- ](\d+)\/(\d+))?$/);return match?Number(match[1])+(match[2]?Number(match[2])/Number(match[3]):0):Number(s);}
export async function policyNews(previous){
  const items=await rss(await get("https://"+fedHost+"/feeds/press_monetary.xml"),fedHost);
  const events=items.map(e=>({...e,provider:"美联储",label:/issues FOMC statement/i.test(e.title)?"利率决议":/minutes/i.test(e.title)?"会议纪要":"政策公告"}));
  const statement=events.find(e=>/issues FOMC statement/i.test(e.title));
  let legacy=[],note="";
  if(statement){
    const same=previous?.legacy?.find(r=>r.source===statement.url);
    if(same)legacy=[same];
    else try{
      const body=plain(await get(statement.url)).replace(/[‐‑–−]/g,"-").replace(/¼/g,"-1/4").replace(/½/g,"-1/2").replace(/¾/g,"-3/4");
      const m=body.match(/target range for the federal funds rate\s+(?:at|to|of|between)\s+(\d+(?:\.\d+|[- ]\d+\/\d+)?)\s+(?:to|and)\s+(\d+(?:\.\d+|[- ]\d+\/\d+)?)\s+percent/i);
      if(m&&frac(m[1])<=frac(m[2]))legacy=[{kind:"fed",date:statement.date.slice(0,10),low:frac(m[1]),high:frac(m[2]),source:statement.url,automatic:true}];
    }catch{note="当期政策原文可从下方打开。";}
  }
  const last=legacy.at(-1), metrics=last?[metric("decision","最近决议目标区间","%",[{date:last.date,value:last.high}],{display:last.low.toFixed(2)+"–"+last.high.toFixed(2),provider:"美联储 FOMC",url:last.source,frequency:"会议决议",desc:"FOMC 最新声明中直接披露的目标利率区间。"})]:[];
  return packed(metrics,{events,legacy,note});
}
export async function aws(previous){
  const events=rss(await get("https://"+amazonHost+"/rss/pressrelease.aspx?LanguageId=1"),amazonHost).filter(e=>/announces (first|second|third|fourth) quarter results/i.test(e.title)).map(e=>({...e,provider:"Amazon IR",label:"财报公告"}));
  const release=events[0];if(!release)throw Error("未找到季度业绩公告");
  if(previous?.release===release.url&&previous.metrics?.length)return {...previous,events};
  const html=await get(release.url);
  const table=Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),m=>plain(m[1]));
  const ix=table.findIndex(r=>/^AWS Segment\s*:$/i.test(r));
  const head=table.slice(Math.max(0,ix-55),ix).reverse().find(r=>/Q[1-4]\s+20\d{2}.*Q[1-4]\s+20\d{2}/.test(r))||"";
  const quarters=Array.from(head.matchAll(/Q([1-4])\s+(20\d{2})/g),m=>m[2]+"-Q"+m[1]);
  const nums=label=>Array.from((table.slice(ix+1,ix+13).find(r=>label.test(r))||"").matchAll(/\$\s*(\(?-?[\d,]+(?:\.\d+)?\)?)/g),m=>Number(m[1].replaceAll(",","").replace("(","-").replace(")",""))/100);
  const sales=nums(/^Net sales\s+\$/i),profits=nums(/^Operating income\s+\$/i);
  if(ix<0||quarters.length<2||sales.length!==quarters.length||profits.length!==quarters.length)throw Error("AWS 分部表口径待核对");
  const prior=new Map((previous?.legacy||[]).map(r=>[r.date,r]));
  quarters.forEach((date,i)=>prior.set(date,{kind:"aws",date,sales:sales[i],profit:profits[i],source:release.url,automatic:true}));
  const legacy=[...prior.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-24);
  const props={url:release.url,provider:"Amazon IR",frequency:"财季",desc:"AWS 分部季度业绩，按亚马逊公告所列美元金额换算。"};
  return packed([metric("aws-sales","AWS 营收","亿美元",seq(legacy,"sales"),props),metric("aws-profit","AWS 营业利润","亿美元",seq(legacy,"profit"),props),metric("aws-margin","AWS 营业利润率","%",legacy.filter(r=>r.sales>0).map(r=>({date:r.date,value:r.profit/r.sales*100,url:r.source})),{...props,desc:"AWS 分部营业利润除以当季分部营收。"})],{legacy,events,release:release.url});
}
