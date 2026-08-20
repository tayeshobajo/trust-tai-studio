import { getServerSupabase } from "../src/lib/studio/db.server";
const db = getServerSupabase()!;
const { data, error } = await db.rpc("exec_sql" as any, {}).then(()=>({data:null,error:null})).catch((e:any)=>({data:null,error:e}));
const tables = ["studios","worlds","stories","scenes","assets","approvals","creative_feedback","story_sources","story_outputs"];
// use PostgREST on pg_catalog not possible; query via a select on each table to confirm existence, and read rls via a view if present
for (const t of tables) {
  const r = await db.from(t).select("*", { count: "exact", head: true });
  console.log(t, r.error ? `ERR ${r.error.message}` : `ok count=${r.count}`);
}
