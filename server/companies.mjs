import {get,today,metric,packed,plain} from "./sources.mjs";
import {filingUrl,lookup} from "./edgar.mjs";
const tables=s=>Array.from(s.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi),m=>Array.from(m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),r=>Array.from(r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),c=>plain(c[1])).filter(Boolean)));
const numbers=cells=>cells.slice(1).map(s=>s.replace(/[$,\s]/g,"").replace(/^\(([\d.]+)\)$/,"-$1")).filter(s=>/^-?\d+(?:\.\d+)?$/.test(s)).map(Number);
function tableYears(rows){
  for(const cells of rows){const years=cells.filter(c=>/^20\d\d$/.test(c));if(years.length>=2)return years;}
  return [];
}
const monthNames="january february march april may june july august september october november december".split(" ");
function quarterlyRows(html,symbol,series,url){
  const all=tables(html);let found=false;
  const add=(seriesName,row,years,md)=>{
    const vals=numbers(row);if(vals.length<2||years.length<2)return;
    // Combined Q4/annual tables put the two quarterly columns first.
    years.slice(0,2).forEach((year,i)=>series[seriesName][year+"-"+md]={date:year+"-"+md,value:vals[i]/100,url});
    found=true;
  };
  for(const rows of all){
    const summary=rows.map(c=>c.join(" ")).join(" "),years=tableYears(rows);
    if(!years.length||!/(?:three months|quarter) ended/i.test(summary))continue;
    const date=summary.match(/(?:three months|quarter) ended(?: and [^,]{1,40})?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i);
    if(!date)continue;
    const month=monthNames.findIndex(n=>n.startsWith(date[1].toLowerCase()))+1;
    if(!month)continue;
    const md=String(month).padStart(2,"0")+"-"+date[2].padStart(2,"0");
    if(symbol==="MSFT"){
      const azure=rows.find(c=>c[0]==="Azure");
      if(azure)add("sales",azure,years,md);
    }else{
      let group="";
      for(const cells of rows){
        if(/^Revenues\s*:/i.test(cells[0]||""))group="sales";
        if(/^Operating income.*:/i.test(cells[0]||""))group="profit";
        if(group&&cells[0]==="Google Cloud")add(group,cells,years,md);
      }
    }
  }
  return found;
}
async function cloud(symbol,prev){
  const cik=await lookup(symbol),sub=await get("https://data.sec.gov/submissions/CIK"+cik+".json","json"),f=sub.filings.recent;
  const i=f.form.findIndex((form,index)=>/^8-K(\/A)?$/.test(form)&&/\b2\.02\b/.test(f.items[index]||"")&&f.filingDate[index]<=today());
  if(i<0)throw Error("未找到 SEC 业绩披露");
  const acc=f.accessionNumber[i],indexUrl=filingUrl(cik,acc),base=indexUrl.slice(0,indexUrl.lastIndexOf("/")+1);
  if(acc===prev?.release&&prev.metrics?.length)return prev;
  const index=await get(indexUrl),row=Array.from(index.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),m=>m[1]).find(s=>/>\s*EX-99\.1\s*</i.test(s));
  const href=row?.match(/href=["']([^"']+)["']/i)?.[1];
  if(!href)throw Error("业绩公告附件尚未取得");
  const url=new URL(href,base).href;if(!url.startsWith(base))throw Error("公告附件地址待核验");
  const html=await get(url),series=structuredClone(prev?.quarters||{sales:{},profit:{}});
  if(!quarterlyRows(html,symbol,series,url))throw Error("最新财报的云分部表需核对，保留上一期已核验口径");
  const name=symbol==="MSFT"?"Azure":"Google Cloud",provider=symbol==="MSFT"?"Microsoft · SEC":"Alphabet · SEC";
  const props={provider,frequency:"财季末",desc:symbol==="MSFT"?"微软单独披露的 Azure 产品收入。":"Alphabet 披露的 Google Cloud 分部数据，包含 Workspace。"};
  const ordered=k=>Object.values(series[k]).sort((a,b)=>a.date.localeCompare(b.date));
  const sales=ordered("sales"),income=ordered("profit");
  const metrics=[metric("sales",name+" 营收","亿美元",sales,props)];
  if(income.length)metrics.push(metric("profit",name+" 营业利润","亿美元",income,props));
  const growth=sales.flatMap(r=>{const p=series.sales[(Number(r.date.slice(0,4))-1)+r.date.slice(4)];return p?.value>0?[{...r,value:(r.value/p.value-1)*100}]:[];});
  metrics.push(metric("growth",name+" 营收同比","%",growth,{...props,desc:"用该产品或分部当季收入与上年可比季度计算。"}));
  return packed(metrics,{quarters:series,release:acc,events:[{title:symbol+" 云业务业绩公告",label:"业绩披露",provider,url,date:f.acceptanceDateTime?.[i]||f.filingDate[i]}]});
}
export const googleCloud=previous=>cloud("GOOGL",previous);
export const azure=previous=>cloud("MSFT",previous);
const occBase="https://marketdata.theocc.com/volume-query";
function parseUSDate(s){const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(20\d\d)$/);return m?[m[3],m[1].padStart(2,"0"),m[2].padStart(2,"0")].join("-"):null;}
function priorDay(date){const d=new Date(date+"T12:00:00Z");do{d.setUTCDate(d.getUTCDate()-1);}while([0,6].includes(d.getUTCDay()));return d.toISOString().slice(0,10);}
function nextWorkDay(day){
  const d=new Date(day+"T12:00:00Z");do{d.setUTCDate(d.getUTCDate()+1);}while([0,6].includes(d.getUTCDay()));
  return d.toISOString().slice(0,10);
}
async function occDay(symbol,day){
  const args=new URLSearchParams({reportDate:day.replaceAll("-",""),format:"csv",volumeQueryType:"O",symbolType:"U",symbol,reportType:"D",accountType:"ALL",productKind:"OSTK",porc:"BOTH"});
  const url=occBase+"?"+args,raw=await get(url),match=raw.match(/cannot be greater than (\d+\/\d+\/20\d\d)/i);
  if(match)return {until:parseUSDate(match[1])};
  const [head,...lines]=raw.trim().split(/\r?\n/);
  if(!head?.startsWith("quantity,underlying,symbol,actype,porc,exchange,actdate")){
    if(/no (data|records)|no results/i.test(raw))return {};
    throw Error("OCC 报表暂时无法读取");
  }
  let call=0,put=0,count=0;
  for(const line of lines){
    const [quantity,underlying,,acct,right,,stamp]=line.split(",");
    if(underlying!==symbol||!["C","F","M"].includes(acct)||!["C","P"].includes(right)||parseUSDate(stamp||"")!==day||!/^\d+$/.test(quantity))continue;
    if(right==="C")call+=Number(quantity);else put+=Number(quantity);count++;
  }
  if(!count)return {};
  if(call%2||put%2)throw Error("OCC 双边合计未能核对，等待报表补齐");
  return {record:{date:day,call:call/2,put:put/2,url}};
}
export async function optionsVolume(symbol,previous){
  let day=today(),latest;
  if([0,6].includes(new Date(day+"T12:00:00Z").getUTCDay()))day=priorDay(day);
  for(let i=0;i<6;i++){
    const result=await occDay(symbol,day);
    if(result.record){latest=result.record;break;}
    if(result.until&&result.until===day)throw Error("OCC 当日文件尚未发布");
    day=result.until&&result.until<day?result.until:priorDay(day);
  }
  if(!latest)throw Error("最近交易日没有此代码的 OCC 个股期权成交记录");
  let through=previous?.through||previous?.metrics?.[0]?.date||priorDay(priorDay(latest.date));
  const reports=[latest];let gap="";
  for(let i=0;i<3&&nextWorkDay(through)<latest.date;i++){
    const candidate=nextWorkDay(through);
    try{
      const result=await occDay(symbol,candidate);
      if(result.until&&result.until<candidate)break;
      if(result.record)reports.push(result.record);
      through=candidate;
    }catch{gap=candidate;break;}
  }
  if(nextWorkDay(through)>=latest.date&&through<latest.date)through=latest.date;
  const definitions=[["calls","看涨期权成交量","张",r=>r.call],["puts","看跌期权成交量","张",r=>r.put],["pc","Put/Call 成交量比","倍",r=>r.call>0?r.put/r.call:NaN]];
  const metrics=definitions.map(([id,name,unit,calc])=>{
    const prior=previous?.metrics?.find(m=>m.id===id);
    const points=new Map((prior?.history||[]).map(p=>[p.date,p]));
    for(const r of reports){const value=calc(r);if(Number.isFinite(value))points.set(r.date,{date:r.date,value,url:r.url});}
    return metric(id,name,unit,[...points.values()].sort((a,b)=>a.date.localeCompare(b.date)),{provider:"OCC",frequency:"交易日报",desc:"OCC 日报合计全部账户与相关调整合约。双边交易记录除以二，按清算合约张数展示。"});
  });
  return packed(metrics,{symbol,through,note:through<latest.date?"正在逐批补齐中间交易日，已检查至 "+through+"。":"",missing:gap?["OCC "+gap+" 历史日报"]:[]});
}
