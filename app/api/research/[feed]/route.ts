import { env } from "cloudflare:workers";
import { hasFeed, perCompany, research } from "../../../../server/research.mjs";
export async function GET(request:Request, ctx:{params:Promise<{feed:string}>}){
  const {feed}=await ctx.params;
  const symbol=(new URL(request.url).searchParams.get("symbol")||"AMZN").trim().toUpperCase();
  if(!hasFeed(feed))return Response.json({error:"数据源不存在"},{status:404});
  if(perCompany(feed)&&!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))return Response.json({error:"股票代码格式有误"},{status:400});
  const result=await research(feed,symbol,env.DB);
  return Response.json(result,{headers:{"Cache-Control":"private, no-store"}});
}
