import {groups,companyFeed,defaultSymbols} from "../public/catalog.mjs";
import {lookup} from "./edgar.mjs";
import {research} from "./research.mjs";
export const intervalMs=600000;
const singles=Object.values(groups).flatMap(g=>g.feeds).filter(id=>!companyFeed(id));
const indexed=groups.company.feeds;
export async function watched(db){
  const {results}=await db.prepare("SELECT symbol,active FROM research_watchlist ORDER BY symbol").all();
  const active=new Set(defaultSymbols);
  for(const r of results){if(r.active)active.add(r.symbol);else active.delete(r.symbol);}
  return [...active];
}
export async function setWatch(db,symbol,active){
  if(typeof symbol!=="string"||!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)||typeof active!=="boolean")throw Error("代码或跟踪状态有误");
  if(active)await lookup(symbol);
  await db.prepare("INSERT INTO research_watchlist(symbol,active,updated) VALUES(?,?,?) ON CONFLICT(symbol) DO UPDATE SET active=excluded.active,updated=excluded.updated").bind(symbol,active?1:0,Date.now()).run();
  return watched(db);
}
async function openRun(db,requested,origin){
  if(requested){const row=await db.prepare("SELECT id FROM research_runs WHERE id=?").bind(requested).first();if(!row)throw Error("采集轮次不存在");return row.id;}
  const open=await db.prepare("SELECT id FROM research_runs WHERE finished IS NULL ORDER BY id LIMIT 1").first();
  if(open)return open.id;
  const now=Date.now(),id=Math.floor(now/intervalMs)*intervalMs;
  const exists=await db.prepare("SELECT id FROM research_runs WHERE id=?").bind(id).first();if(exists)return id;
  const symbols=await watched(db);
  const feeds=[...singles,...symbols.flatMap(s=>indexed.map(k=>k+"/"+s))];
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO research_runs(id,started,origin) VALUES(?,?,?)").bind(id,now,origin),
    db.prepare("INSERT OR IGNORE INTO research_jobs(run,feed) SELECT ?,value FROM json_each(?)").bind(id,JSON.stringify(feeds))
  ]);
  return id;
}
export async function runInfo(db,id){
  if(!id)return null;
  return db.prepare(`SELECT r.id,r.started,r.finished,r.origin,
    COUNT(j.feed) AS total,COALESCE(SUM(j.status IN ('ok','warning','error')),0) AS completed,
    COALESCE(SUM(j.status='ok'),0) AS ok,COALESCE(SUM(j.status IN ('warning','error')),0) AS warnings,
    COALESCE(SUM(j.changed),0) AS changed
    FROM research_runs r LEFT JOIN research_jobs j ON j.run=r.id WHERE r.id=? GROUP BY r.id`).bind(id).first();
}
export async function collectorStatus(db,run){
  const [list,latest,tally,errorRows,clocks]=await db.batch([
    db.prepare("SELECT symbol,active FROM research_watchlist ORDER BY symbol"),
    db.prepare(run?"SELECT id FROM research_runs WHERE id=?":"SELECT id FROM research_runs ORDER BY id DESC LIMIT 1").bind(...(run?[run]:[])),
    db.prepare("SELECT (SELECT COUNT(*) FROM research_changes) AS entries,(SELECT COUNT(*) FROM research_readings) AS points,(SELECT COUNT(*) FROM research_changes WHERE previous IS NOT NULL) AS revisions"),
    db.prepare(`SELECT feed,status,issue FROM research_jobs WHERE run=${run?"?":"(SELECT MAX(id) FROM research_runs)"} AND status IN ('error','warning') ORDER BY feed`).bind(...(run?[run]:[])),
    db.prepare("SELECT slot,started,finished,run_id AS runId,issue FROM research_clock ORDER BY slot DESC LIMIT 3")
  ]);
  const set=new Set(defaultSymbols);
  for(const r of list.results){if(r.active)set.add(r.symbol);else set.delete(r.symbol);}
  return {intervalSeconds:intervalMs/1000,clocks:clocks.results,symbols:[...set],run:await runInfo(db,latest.results[0]?.id),stats:tally.results[0],issues:errorRows.results,
    operation:{revision:"2026-11-26.2",guide:"/collector-operations.txt",method:"POST",path:"/api/collector",start:{},resume:"POST JSON {runId: <returned run.id>} until run.finished; read status with GET /api/collector?runId=<run.id>."}};
}
async function perform(db,run,task,owner){
  const [id,symbol="AMZN"]=task.feed.split("/");
  let status="ok",issue=null,changed=0;
  try{
    const result=await research(id,symbol,db,true);
    changed=result.changed||0;
    if(result.mode==="refreshing"){status=task.tries>=4?"warning":"pending";issue="数据源正在另一次核验中";}
    else if(!result.archived||!result.data){status="error";issue=result.issue||"尚未写入持久归档";}
    else if(result.issue||result.data.missing?.length){status="warning";issue=result.issue||result.data.note;}
  }catch(e){status=task.tries<2?"pending":"error";issue=String(e.message||"采集失败").slice(0,200);}
  await db.prepare("UPDATE research_jobs SET status=?,lease=?,owner=NULL,changed=changed+?,issue=? WHERE run=? AND feed=? AND owner=?")
    .bind(status,status==="pending"?Date.now()+5000:0,changed,issue,run,task.feed,owner).run();
}
export async function runBatch(db,requested,origin="service"){
  const run=await openRun(db,requested,origin),now=Date.now(),owner=crypto.randomUUID();
  const selected=await db.prepare(`UPDATE research_jobs SET status='working',lease=?,owner=?,tries=tries+1
    WHERE run=? AND feed IN (SELECT feed FROM research_jobs WHERE run=? AND status IN ('pending','working') AND lease<=? ORDER BY tries ASC,feed LIMIT 2)
    RETURNING feed,tries`).bind(now+130000,owner,run,run,now).all();
  await Promise.all(selected.results.map(task=>perform(db,run,task,owner)));
  await db.prepare("UPDATE research_runs SET finished=? WHERE id=? AND finished IS NULL AND NOT EXISTS(SELECT 1 FROM research_jobs WHERE run=? AND status IN ('working','pending'))").bind(Date.now(),run,run).run();
  const state=await runInfo(db,run);
  return {run:state,remaining:state.total-state.completed,retryAfterSeconds:selected.results.length?0:3};
}
