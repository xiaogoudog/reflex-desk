import {fred,fredUrl,metric,seq,changeMonths,packed} from "./sources.mjs";
const specs={
 inflation:{frequency:"月度",items:[
   ["PCEPI","PCE 物价同比","%","yoy","BEA 个人消费支出价格指数，较去年同月。"],
   ["PCEPILFE","核心 PCE 同比","%","yoy","剔除食品和能源后的 PCE 价格同比。"],
   ["CPILFESL","核心 CPI 环比","%","mom","剔除食品和能源后的季调 CPI，较上月。"],
   ["PPIACO","生产者商品价格同比","%","yoy","BLS 全部商品生产者价格指数，较去年同月。"]]},
 activity:{frequency:"月度",items:[
   ["PAYEMS","非农就业月增减","万人","delta10","季调非农就业人数较上月的变化。"],
   ["JTSJOL","职位空缺","万人",0.1,"JOLTS 经季调的非农职位空缺。"],
   ["RSAFS","零售及餐饮销售环比","%","mom","季调名义零售及餐饮销售额。"],
   ["HOUST","新屋开工","万套",0.1,"经季调折年率，按开工住宅套数统计。"],
   ["PERMIT","住宅建筑许可","万套",0.1,"许可套数，经季调折年率。"],
   ["TCU","工业产能利用率","%",1,"美联储全部工业产能利用率。"]]},
 claims:{frequency:"每周",items:[
   ["ICSA","首次申领失业救济","万人",0.0001,"美国劳工部，经季节调整。"],
   ["CCSA","持续申领失业救济","万人",0.0001,"美国劳工部，经季节调整，统计周可与初请不同。"]]},
 liquidity:{frequency:"每周",items:[
   ["WRESBAL","银行准备金余额","万亿美元",0.000001,"美联储 H.4.1，周平均余额。"],
   ["WTREGEN","财政部一般账户（TGA）","万亿美元",0.000001,"美国财政部在美联储的一般账户，截至周三的一周平均余额。"]]},
 overnight:{frequency:"交易日",items:[
   ["SOFR","担保隔夜融资利率","%",1,"纽约联储按担保隔夜交易计算的融资利率。"],
   ["RRPONTSYD","隔夜逆回购用量","十亿美元",1,"纽约联储隔夜逆回购操作的成交总额。"]]},
 yields:{frequency:"交易日",items:[
   ["DGS3MO","3 个月期美债","%",1,"财政部名义固定期限收益率。"],["DGS5","5 年期美债","%",1,"财政部名义固定期限收益率。"],
   ["DGS30","30 年期美债","%",1,"财政部名义固定期限收益率。"],["DFII10","10 年期实际收益率","%",1,"美国通胀保值国债固定期限实际收益率。"],
   ["T5YIE","5 年盈亏平衡通胀率","%",1,"名义国债与通胀保值国债收益率隐含的差值。"],["T10YIE","10 年盈亏平衡通胀率","%",1,"市场隐含的通胀补偿，含风险和流动性溢价。"]]},
 credit:{frequency:"交易日",items:[
   ["BAMLC0A0CM","美国投资级信用利差","bp",100,"ICE BofA 美国公司债期权调整利差。"],
   ["BAMLH0A0HYM2","美国高收益债信用利差","bp",100,"ICE BofA 美国高收益公司债期权调整利差。"]]},
 markets:{frequency:"交易日",items:[
   ["NASDAQCOM","纳斯达克综合指数","点",1,"纳斯达克综合指数的交易日收盘值。"],
   ["SP500","标普 500 指数","点",1,"标普 500 指数的交易日收盘值。"],
   ["VIXCLS","VIX 波动率指数","点",1,"Cboe VIX 交易日收盘值，反映标普 500 期权隐含的近期波动。"]]},
 fxEnergy:{frequency:"每日观察",items:[
   ["DTWEXBGS","广义美元指数","点",1,"美联储名义广义美元指数，2006 年 1 月等于 100。"],
   ["DCOILWTICO","WTI 库欣现货","美元/桶",1,"EIA 美国库欣 WTI 原油现货价格。"]]},
 cycles:{frequency:"月度",items:[
   ["IPMAN","制造业产出同比","%","yoy","美联储 G.17 制造业实际产出。"],
   ["IPG335S","电气设备与家电产出同比","%","yoy","美联储 G.17 行业工业生产指数。"],
   ["IPG3364T9S","航空航天及其他运输设备产出同比","%","yoy","美联储 G.17 对应行业产出。"],
   ["DGORDER","耐用品新订单","十亿美元",0.001,"美国人口普查局，季调名义金额。"],
   ["AMTMNO","制造业新订单","十亿美元",0.001,"美国人口普查局全部制造业新订单，季调。"]]}
};
function points(rows,id,op){
  if(op==="yoy"||op==="mom")return changeMonths(rows,id,op==="yoy"?12:1);
  if(op==="delta10"){
    const m=new Map(seq(rows,id).map(p=>[p.date,p.value]));
    return seq(rows,id).flatMap(p=>{const [y,mo]=p.date.split("-").map(Number);
      const prev=m.get(new Date(Date.UTC(y,mo-2,1)).toISOString().slice(0,10));
      return Number.isFinite(prev)?[{date:p.date,value:(p.value-prev)/10}]:[];});
  }
  return seq(rows,id).map(p=>({...p,value:p.value*op}));
}
async function seriesGroup(id){
  const {items,frequency}=specs[id],ids=items.map(s=>s[0]),sets=new Map();
  // Some daily series use different holiday calendars. FRED can return a ZIP
  // for a mixed export; retry the documented individual series in that case.
  try{const rows=await fred(ids);for(const field of ids)sets.set(field,rows);}
  catch{
    const fetched=await Promise.allSettled(ids.map(field=>fred([field])));
    fetched.forEach((r,i)=>{if(r.status==="fulfilled")sets.set(ids[i],r.value);});
  }
  const missing=[];
  const metrics=items.map(([field,name,unit,op,desc])=>{
    const m=metric(field,name,unit,points(sets.get(field)||[],field,op),{frequency,desc,provider:"FRED",url:fredUrl(field)});
    if(!m)missing.push(name);return m;
  });
  return packed(metrics,{missing,note:missing.length?"本次暂缺 "+missing.join("、")+"。":""});
}
export const extraFeeds=Object.fromEntries(Object.keys(specs).map(id=>[id,()=>seriesGroup(id)]));
