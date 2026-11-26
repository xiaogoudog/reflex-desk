import {env} from "cloudflare:workers";
import {collectorStatus,runBatch,setWatch} from "../../../server/collector.mjs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
function runId(id:unknown){
  if(id===null||id===undefined)return null;
  const n=Number(id);if(!Number.isSafeInteger(n)||n<=0)throw Error("采集轮次无效");return n;
}
export async function GET(request:Request){
  if(!env.DB)return Response.json({error:"归档数据库未连接"},{status:503,headers});
  let id;try{id=runId(new URL(request.url).searchParams.get("runId"));}catch{return Response.json({error:"采集轮次无效"},{status:400,headers});}
  return Response.json(await collectorStatus(env.DB,id),{headers});
}
export async function POST(request:Request){
  const origin=request.headers.get("Origin");
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get("Sec-Fetch-Site")==="cross-site")return new Response(null,{status:403});
  if(!request.headers.get("Content-Type")?.includes("application/json"))return new Response(null,{status:415});
  if(!env.DB)return Response.json({error:"归档数据库未连接"},{status:503,headers});
  let body;
  try{body=await request.json();if(!body||typeof body!=="object"||Array.isArray(body))throw Error();}catch{return Response.json({error:"需要 JSON 对象"},{status:400,headers});}
  if(body.action==="watch"){
    try{return Response.json({symbols:await setWatch(env.DB,body.symbol,body.active)},{headers});}
    catch(e){return Response.json({error:e instanceof Error?e.message:"未能保存跟踪代码"},{status:400,headers});}
  }
  if(body.action!==undefined)return Response.json({error:"无此操作"},{status:400,headers});
  try{return Response.json(await runBatch(env.DB,runId(body.runId)),{headers});}
  catch(e){return Response.json({error:e instanceof Error?e.message:"采集暂时中断，可用同一轮次重试"},{status:503,headers});}
}
