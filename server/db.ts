import { Database } from "jsr:@db/sqlite@0.12";
import { SqliteDB, SqliteDBWrapper, insertCrrTablesStmt } from "@jakobsaadbye/teilen-sql"
import { tables } from "@common/tables.ts";

const db = new Database("cloudband.db", { int64: true }); // int64 here is important for the timestamps, defaults to false, sigh ...

const wDb = new SqliteDBWrapper(db) as unknown as SqliteDB;
await wDb.exec(insertCrrTablesStmt, []);
await wDb.exec(tables, []);
await wDb.upgradeTableToCrr("projects");
await wDb.upgradeTableToCrr("players");
await wDb.upgradeTableToCrr("tracks");
await wDb.upgradeTableToCrr("regions");
await wDb.finalizeUpgrades();

export {
    wDb as db
}