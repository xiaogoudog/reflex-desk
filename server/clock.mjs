import { runBatch } from "./collector.mjs";

// Only the runtime calls this entrypoint. An ordinary HTTP refresh cannot
// manufacture a clock tick, including when the Site is first published.
export async function runScheduledCycle(slot, db) {
  const at = Date.now();
  const already = await db.prepare("SELECT finished FROM research_clock WHERE slot=?").bind(slot).first();
  if (already?.finished) return;
  await db.prepare("INSERT INTO research_clock(slot,started) VALUES(?,?) ON CONFLICT(slot) DO UPDATE SET issue=NULL")
    .bind(slot,at).run();
  let run;
  try {
    do {
      const result = await runBatch(db,run,"server-cron");
      run = result.run.id;
      if (result.run.finished) {
        await db.prepare("UPDATE research_clock SET finished=?,run_id=?,issue=NULL WHERE slot=?").bind(Date.now(),run,slot).run();
        return;
      }
      if (result.retryAfterSeconds) await new Promise(resolve=>setTimeout(resolve,Math.min(5,result.retryAfterSeconds)*1000));
    } while (Date.now()-at < 8*60000);
    throw Error("本轮超出处理时段，下次触发接续未完成项目");
  } catch (error) {
    await db.prepare("UPDATE research_clock SET run_id=?,issue=? WHERE slot=?").bind(run||null,String(error?.message||error).slice(0,180),slot).run();
    throw error;
  }
}
