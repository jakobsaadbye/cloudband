import { Application, Context, Router } from "@oak/oak";

import { Database } from "jsr:@db/sqlite@0.12";
import { SqliteDB, SqliteDBWrapper, insertCrrTablesStmt } from "@jakobsaadbye/teilen-sql"
import { tables } from "@common/tables.ts";
import { Server } from "./server.ts";

const PORT = 3000;

const db = new Database("cloudband.db", { int64: true }); // int64 here is important for the timestamps, defaults to false, sigh ...

const wDb = new SqliteDBWrapper(db) as unknown as SqliteDB;
await wDb.exec(insertCrrTablesStmt, []);
await wDb.exec(tables, []);
await wDb.upgradeTableToCrr("projects");
await wDb.upgradeTableToCrr("players");
await wDb.upgradeTableToCrr("tracks");
await wDb.upgradeTableToCrr("regions");
await wDb.finalizeUpgrades();




const app = new Application();
const router = new Router();
const server = new Server(wDb);

router.get("/start_web_socket", (ctx: Context) => server.handleConnection(ctx));

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Listening at http://localhost:" + PORT);
await app.listen({ port: PORT });

// const reqLogger = function (req: Request, _res: Response, next: NextFunction) {
//     console.info(`${req.method} "${req.path}"`);
//     next();
// };

// const app = express();
// app.use(cors());
// app.use(reqLogger);
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json({ limit: "1mb" }));

// app.get("/", (req: Request, res: Response) => {
//     res.send("Ping Pong");
// });

// // Push-endpoint
// app.post("/changes", async (req: Request, res: Response) => {
//     const { changes } = req.body;
//     try {
//         await applyChanges(wDb, changes);

//         res.sendStatus(200);
//     } catch (e) {
//         await wDb.exec(`ROLLBACK`, []);
//         console.error(e);
//         res.status(400);
//         res.send({ error: e.message });
//     }
// });

// // Pull-endpoint
// app.get("/changes", (req: Request, res: Response) => {
//     const { lastPulledAt, siteId } = req.query;
//     if (lastPulledAt === undefined || siteId === undefined) {
//         res.status(400).send(`Invalid query parameters. Need 'lastPulledAt' & 'siteId'`);
//         return;
//     }

//     try {
//         const now = new Date().getTime();
//         const rows = db.prepare(`SELECT * FROM "crr_changes" WHERE site_id != ? AND applied_at > ? ORDER BY created_at ASC`).all(siteId, lastPulledAt);

//         res.status(200);
//         res.send({ changes: rows, pulledAt: now });
//     } catch (e) {
//         console.error(e);
//         res.status(400);
//         res.send({ error: e.message })
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Listening on port: ${PORT}`);
// });

Deno.serve((req) => {
    if (req.headers.get("upgrade") != "websocket") {
        return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.addEventListener("open", () => {
        console.log("a client connected!");
    });

    socket.addEventListener("message", (event) => {
        if (event.data === "ping") {
            socket.send("pong");
        }
    });
    
    return response;
});