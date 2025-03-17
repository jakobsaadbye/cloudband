import { Context } from "@oak/oak";
import { Status } from "jsr:@oak/commons@1/status";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";

export const handleDownloadFile = async (ctx: Context) => {
    const projectId = ctx.request.url.searchParams.get("projectId");
    const directory = ctx.request.url.searchParams.get("directory");
    const filename = ctx.request.url.searchParams.get("filename");

    if (!projectId || !directory || !filename) {
        ctx.response.body = {
            message: `Missing url parameters`
        }
        ctx.response.type = "json";
        ctx.response.status = Status.BadRequest;
        return;
    }

    if (!isValidDirectory(directory)) {
        ctx.response.body = {
            message: `Illegal directory name '${directory}'`
        }
        ctx.response.type = "json";
        ctx.response.status = Status.BadRequest;
        return;
    }

    const cwd = Deno.cwd();
    const fullDirectoryPath = `projects/${projectId}/${directory}`;
    Deno.mkdirSync(fullDirectoryPath, { recursive: true });
    Deno.chdir(fullDirectoryPath);
    try {
        const fileContent = Deno.readFileSync(filename);
        ctx.response.body = fileContent;
        ctx.response.type = mimeTypeFromFilename(filename);
        ctx.response.status = Status.OK;
    }
    catch (e) {
        ctx.response.body = { message: e.message };
        ctx.response.status = Status.BadRequest;
    }
    finally {
        Deno.chdir(cwd);
    }
}

export const handleUploadFile = async (ctx: Context) => {
    const projectId = ctx.request.url.searchParams.get("projectId");
    const directory = ctx.request.url.searchParams.get("directory");
    const filename = ctx.request.url.searchParams.get("filename");

    if (!projectId || !directory || !filename) {
        ctx.response.body = {
            message: `Missing url parameters`
        }
        ctx.response.type = "json";
        ctx.response.status = Status.BadRequest;
        return;
    }


    if (!isValidDirectory(directory)) {
        ctx.response.body = {
            message: `Illegal directory name '${directory}'`
        }
        ctx.response.type = "json";
        ctx.response.status = Status.BadRequest;
        return;
    }

    const arrayBuffer = await ctx.request.body.arrayBuffer();
    const data = new Uint8Array(arrayBuffer)

    const cwd = Deno.cwd();
    const fullDirectoryPath = `projects/${projectId}/${directory}`;
    Deno.mkdirSync(fullDirectoryPath, { recursive: true });
    Deno.chdir(fullDirectoryPath)
    Deno.writeFileSync(filename, data, { create: true });
    Deno.chdir(cwd);

    ctx.response.status = Status.OK;
}

const mimeTypeFromFilename = (filename: string) => {
    const extension = filename.split(".").slice(-1)[0];
    switch (extension) {
        case "mp3": return "audio/mp3";
        case "ogg": return "audio/ogg";
        case "wav": return "audio/wav";
        default:
            return "application/octet-stream";
    }
}

const isValidDirectory = (directory: string) => {
    if (directory === "tracks") return true;

    return false;
}