export const groups={
  macro:{name:"宏观经济",icon:"curve",summary:"通胀、就业、消费、住房与增长",feeds:["macro","inflation","growth","activity","claims","curve"]},
  policy:{name:"货币政策",icon:"bank",summary:"政策利率、流动性与信用利差",feeds:["policyNews","rates","overnight","liquidity","balance","yields","credit"]},
  industry:{name:"产业趋势",icon:"layers",summary:"工业周期与三家云厂商业绩",feeds:["industry","cycles","aws","googleCloud","azure"]},
  market:{name:"市场指标",icon:"market",summary:"股指、波动率、美元与原油",feeds:["markets","fxEnergy"]},
  company:{name:"公司基本面",icon:"files",summary:"单季财务、SEC 申报与期权成交",feeds:["fundamentals","filings","optionsVolume"]}
};
export const titles={macro:"通胀与就业",inflation:"通胀的不同口径",growth:"实际经济增长",activity:"就业、消费与住房",claims:"失业保险申领",curve:"美国国债期限结构",policyNews:"美联储公告",rates:"政策利率与隔夜市场",overnight:"隔夜融资与逆回购",liquidity:"银行准备金与财政账户",balance:"美联储资产负债表",yields:"名义利率、实际利率与通胀补偿",credit:"信用利差",industry:"美国工业生产",cycles:"制造业与订单",aws:"亚马逊云业务",googleCloud:"Google Cloud 分部",azure:"Microsoft Azure 产品",markets:"美国股票指数与波动率",fxEnergy:"美元与能源",fundamentals:"单季财务",filings:"公司申报",optionsVolume:"OCC 期权成交日报"};
export const companyFeed=id=>groups.company.feeds.includes(id);
export const fast=new Set(["policyNews","aws","filings","googleCloud","azure"]);
export const defaultSymbols=["AMZN","GOOGL","MSFT","NVDA","AMD","AAPL","META"];
