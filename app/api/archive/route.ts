import {env} from "cloudflare:workers";
import {listArchive} from "../../../server/archive.mjs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  if(!env.DB)return Response.json({error:"归档数据库未连接"},{status:503});
  return Response.json(await listArchive(env.DB,new URL(request.url)),{headers:{"Cache-Control":"private, no-store"}});
}
