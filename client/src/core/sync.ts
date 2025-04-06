import { Context } from "@core/context.ts";
import { Change, Syncer } from "@jakobsaadbye/teilen-sql";
import { ReloadProject } from "@/db/load.ts";
import { SaveEntities } from "@/db/save.ts";
import { Track } from "@core/track.ts";

export const handlePull = async (ctx: Context, syncer: Syncer) => {
    const appliedChanges = await syncer.pullChangesHttp();
    if (!appliedChanges) return;

    console.log(`Pulled ${appliedChanges.length} changes`);

    if (appliedChanges.length === 0) return;

    await postProcessAppliedChanges(ctx, appliedChanges);

    await ReloadProject(ctx, ctx.db, appliedChanges);
}

export const handlePush = async (ctx: Context, syncer: Syncer) => {

    // Uploading any files that are not yet uploaded due to being offline when the track was loaded
    {
        const nonUploadedTracks = await ctx.db.select<Track[]>(`SELECT * FROM "tracks" WHERE isUploaded = 0`, []);
    
        for (const track of nonUploadedTracks) {
            const file = await ctx.fileManager.GetLocalFile(track.projectId, "tracks", track.filename);
            if (!file) {
                console.warn(`Missing local file ${track.filename}`);
                continue;
            }
    
            const err = await ctx.fileManager.UploadFile(track.projectId, "tracks", file);
            if (err) {
                console.warn(`Failed to upload file '${track.filename}' to the server. `, err);
                continue;
            }
    
            track.isUploaded = true;
        }
        await SaveEntities(ctx, nonUploadedTracks);
    }

    
    await syncer.pushChangesHttp();
}

const postProcessAppliedChanges = async (ctx: Context, changes: Change[]) => {

    // Download any newly inserted tracks
    const trackInserts = [];
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        if (change.type === "insert" && change.tbl_name === "tracks" && change.col_id === "id") {

            // Scan for the filename and project id that also got inserted to get the download path
            let filename = "";
            let projectId = "";
            for (let j = i; j < changes.length; j++) {
                const c = changes[j];

                if (c.type === "insert" && c.tbl_name === "tracks" && c.pk === change.pk) {
                    if (c.col_id === "filename") filename = c.value;
                    if (c.col_id === "projectId") projectId = c.value;
                }
            }

            trackInserts.push({ projectId, filename });
        }
    }

    for (const track of trackInserts) {
        const file = await ctx.fileManager.GetOrDownloadFile(ctx.project.id, "tracks", track.filename);
        if (!file) {
            console.error(`Failed to download file '${track.filename}'`, track.projectId);
        }
    }
}