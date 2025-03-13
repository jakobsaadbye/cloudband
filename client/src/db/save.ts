import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { Context } from "../core/context.ts";
import { Player } from "../core/player.ts";
import { Project, Region, Track } from "../core/track.ts";

export const SaveEntireProject = async (db: SqliteDB, ctx: Context) => {
    await SaveProject(db, ctx.project);
    await SaveTracks(db, ctx.trackList.tracks);
    const regions = ctx.trackList.tracks.reduce((vals, track) => {vals.push(...track.regions); return vals}, [] as Region[]);
    await SaveRegions(db, regions);
    await SavePlayer(db, ctx.player);
}

export const SaveProject = async (db: SqliteDB, project: Project) => {
    const err = await db.execTrackChanges(`
        INSERT INTO "projects" (
            id,
            name
        ) VALUES (?, ?)
        ON CONFLICT DO UPDATE SET
            name = EXCLUDED.name
    `, [
        project.id,
        project.name
    ]);
    if (err) {
        console.error(err);
    }
}

export const SavePlayer = async (db: SqliteDB, player: Player) => {
    const err = await db.execTrackChanges(`
        INSERT INTO "players" (
            id,
            project_id,
            volume,
            tempo,
            elapsed_time,
            input_selected_track,
            input_selected_region,
            input_undos
        ) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT DO UPDATE SET
            volume = EXCLUDED.volume,
            tempo = EXCLUDED.tempo,
            elapsed_time = EXCLUDED.elapsed_time,
            input_selected_track = EXCLUDED.input_selected_track,
            input_selected_region = EXCLUDED.input_selected_region,
            input_undos = EXCLUDED.input_undos
    `, [
        player.id,
        player.projectId,
        player.volume,
        player.tempo,
        player.elapsedTime,
        player.input.selectedTrack ? player.input.selectedTrack.id : null,
        player.input.selectedRegion ? player.input.selectedRegion.id : null,
        player.input.undos
    ]);
    if (err) {
        console.error(err);
    }
}

export const SaveTracks = async (db: SqliteDB, tracks: Track[]) => {
    const values = tracks.reduce((vals, track) => {
        vals.push(...[
            track.id,
            track.projectId,
            track.volume,
            track.pan,
            track.kind,
            track.filename,
            track.isUploaded ? 1 : 0,
        ]);
        return vals
    }, [] as any[]);

    const err = await db.execTrackChanges(`
        INSERT INTO "tracks" (
            id,
            project_id,
            volume,
            pan,
            kind,
            filename,
            is_uploaded
        ) VALUES ${tracks.map(_ => `(?,?,?,?,?,?,?) `)}
        ON CONFLICT DO UPDATE SET
            volume = EXCLUDED.volume,
            pan = EXCLUDED.pan,
            kind = EXCLUDED.kind,
            filename = EXCLUDED.filename,
            is_uploaded = EXCLUDED.is_uploaded
    `, values);
    if (err) {
        console.error(err);
    }
}

export const SaveRegions = async (db: SqliteDB, regions: Region[]) => {
    const values = regions.reduce((vals, region) => {
        vals.push(...[
            region.id,
            region.projectId,
            region.trackId,
            region.offsetStart,
            region.offsetEnd,
            region.start,
            region.end,
            region.totalDuration,
            region.flags,
            region.deleted ? 1 : 0,
        ]);
        return vals
    }, [] as any[]);

    const err = await db.execTrackChanges(`
        INSERT INTO "regions" (
            id,
            project_id,
            track_id,
            offset_start,
            offset_end,
            start,
            end,
            total_duration,
            flags,
            deleted
        ) VALUES ${regions.map(_ => `(?,?,?,?,?,?,?,?,?,?) `)}  
        ON CONFLICT DO UPDATE SET
            track_id = EXCLUDED.track_id,
            offset_start = EXCLUDED.offset_start,
            offset_end = EXCLUDED.offset_end,
            start = EXCLUDED.start,
            end = EXCLUDED.end,
            total_duration = EXCLUDED.total_duration,
            flags = EXCLUDED.flags,
            deleted = EXCLUDED.deleted
    `, values);
    if (err) {
        console.error(err);
    }
}