import { Change, Commit, DocumentSnapshot, PullResult, RowConflict, Syncer, unique } from "@jakobsaadbye/teilen-sql";
import { Context } from "@core/context.ts";
import { ReloadProject } from "@/db/load.ts";
import { handleHighlevelConflicts } from "@core/conflict.ts";
import { RegionRow, TrackRow } from "@/db/types.ts";




export const handlePull = async (ctx: Context, syncer: Syncer) => {
    const db = ctx.db;

    const results = await syncer.pullCommits(db, ctx.project.id);
    if (results.length === 0) {
        console.log("Nothing was pulled");
        return;
    }

    const pull = results.find(r => r.documentId === ctx.project.id);
    if (!pull) {
        console.log("Project is up to date");
        return;
    }
    
    await handleHighlevelConflicts(ctx, pull);

    await postProcessAppliedChanges(ctx, pull.appliedChanges);
    await ReloadProject(ctx, db, pull.appliedChanges);
}

export const handlePush = async (ctx: Context, syncer: Syncer) => {
    const db = ctx.db;

    const result = await syncer.pushCommits(db, ctx.project.id);
    if (result) {
        console.log(result);
    }
}



const postProcessAppliedChanges = async (ctx: Context, changes: Change[]) => {
    if (changes.length === 0) return;

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