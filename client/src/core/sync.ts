import { Change, Commit, DocumentSnapshot, getChangeSets, PullResult, RowConflict, Syncer, SyncEvent, unique } from "@jakobsaadbye/teilen-sql";
import { Context } from "@core/context.ts";
import { deserializeRow, ReloadProject } from "@/db/load.ts";
import { handleHighlevelConflicts } from "@core/conflict.ts";
import { RegionRow, TrackRow } from "@/db/types.ts";
import { Region, Track } from "@core/track.ts";
import { Project } from "@core/project.ts";




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

    await ReloadProject(ctx);
    await handleHighlevelConflicts(ctx, pull);
}

export const handlePush = async (ctx: Context, syncer: Syncer) => {
    const db = ctx.db;

    const result = await syncer.pushCommits(db, ctx.project.id);
    if (result) {
        console.log(result);
    }
}

export const handleSyncEvent = async (ctx: Context, event: SyncEvent) => {
    const changes = event.data;
    await injectChangesIntoCurrentState(ctx, changes);
}

const injectChangesIntoCurrentState = async (ctx: Context, changes: Change[]) => {
    if (changes.length === 0) return;

    console.time("inject-changes");

    const cacheTracks = new Map<string, Track>();
    const cacheRegions = new Map<string, Region>();

    const trackManager = ctx.trackManager;

    const changeSets = getChangeSets(changes);
    for (const changeSet of changeSets) {
        const changeType = changeSet[0].type;
        const tblName = changeSet[0].tbl_name;

        switch (tblName) {
            case "tracks": {
                if (changeType === "insert") {
                    const row = {} as TrackRow;
                    for (const change of changeSet) {
                        row[change.col_id] = change.value;
                    }

                    // Download the file for the track
                    const file = await ctx.fileManager.GetOrDownloadFile(row.projectId, "tracks", row.filename);
                    if (!file) {
                        console.error(`Failed to download file '${row.filename}'`, row.projectId);
                        continue;
                    }

                    const track = new Track(row.kind, file, row.projectId);
                    deserializeRow(track, row);
                    cacheTracks.set(track.id, track);

                    await trackManager.LoadTrack(ctx, track, true);
                } else if (changeType === "update") {
                    const trackId = changeSet[0].pk;
                    let track = cacheTracks.get(trackId);
                    if (!track) {
                        track = trackManager.GetTrackWithId(trackId);
                        if (!track) {
                            console.warn(`[WARN]: Track '${trackId}' is missing when trying to update it`);
                            continue;
                        } else {
                            cacheTracks.set(trackId, track);
                        }
                    }

                    for (const change of changeSet) {
                        track[change.col_id] = change.value;
                    }
                }
            } break;
            case "regions": {
                if (changeType === "insert") {
                    const row = {} as RegionRow;
                    for (const change of changeSet) {
                        row[change.col_id] = change.value;
                    }

                    const region = new Region(row.trackId, row.projectId);
                    deserializeRow(region, row);
                    cacheRegions.set(region.id, region);

                    let track = cacheTracks.get(region.trackId);
                    if (!track) {
                        track = trackManager.GetTrackWithId(region.trackId);
                        if (!track) {
                            console.warn(`[WARN]: Track '${region.trackId}' is missing when trying to insert region into it`);
                            continue;
                        } else {
                            cacheTracks.set(track.id, track);
                        }
                    }

                    track.regions.push(region);
                } else if (changeType === "update") {
                    const regionId = changeSet[0].pk;
                    let region = cacheRegions.get(regionId);
                    if (!region) {
                        region = trackManager.GetRegionWithId(regionId);
                        if (!region) {
                            console.warn(`[WARN]: Region '${regionId}' is missing when trying to update it`);
                            continue;
                        } else {
                            cacheRegions.set(regionId, region);
                        }
                    }

                    for (const change of changeSet) {
                        region[change.col_id] = change.value;
                    }
                }


            } break;
            case "projects": {
                const project = ctx.project;
                if (changeType === "update") {
                    for (const change of changeSet) {
                        project[change.col_id] = change.value;
                    }
                }
            } break;
        }
    }

    console.timeEnd("inject-changes");

    ctx.S({ ...ctx });
}