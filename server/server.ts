import { Database } from "jsr:@db/sqlite@0.12";
import { SqliteDB, SqliteDBWrapper, insertCrrTablesStmt } from "@jakobsaadbye/teilen-sql"
import { tables } from "@common/tables.ts";
import { Application, Context, Router } from "@oak/oak";
import { handleWebSocketConnection } from "./websocket.ts";
import { handlePushCommits, handlePullCommits } from "./commits.ts";
import { handleUploadFile, handleDownloadFile } from "./files.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import logger from "https://deno.land/x/oak_logger/mod.ts";


const db = new Database("cloudband.db", { int64: true }); // int64 here is important for the timestamps, defaults to false, sigh ...
const wDb = new SqliteDBWrapper(db) as unknown as SqliteDB;
await wDb.exec(insertCrrTablesStmt, []);
await wDb.exec(tables, []);
await wDb.upgradeAllTablesToCrr();
await wDb.finalize();


const PORT = 3002;

const app = new Application();
const router = new Router();

router.get("/download-file", (ctx: Context) => handleDownloadFile(ctx));
router.post("/upload-file", (ctx: Context) => handleUploadFile(ctx));
router.put("/pull-commits", (ctx: Context) => handlePullCommits(ctx, wDb));
router.put("/push-commits", (ctx: Context) => handlePushCommits(ctx, wDb));
router.get("/start_web_socket", (ctx: Context) => handleWebSocketConnection(ctx, wDb));

app.use(logger.logger);
app.use(logger.responseTime);
app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Listening at http://localhost:" + PORT);
await app.listen({ port: PORT });