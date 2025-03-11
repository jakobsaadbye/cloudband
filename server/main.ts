import { Application, Context, Router } from "@oak/oak";
import { handleWebSocketConnection } from "./sync.ts";
import { handleUploadFile, handleDownloadFile } from "./files.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import logger from "https://deno.land/x/oak_logger/mod.ts";

const PORT = 3000;

const app = new Application();
const router = new Router();

router.get("/download-file", (ctx: Context) => handleDownloadFile(ctx));
router.post("/upload-file", (ctx: Context) => handleUploadFile(ctx));
router.get("/start_web_socket", (ctx: Context) => handleWebSocketConnection(ctx));

app.use(logger.logger);
app.use(logger.responseTime);
app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Listening at http://localhost:" + PORT);
await app.listen({ port: PORT });