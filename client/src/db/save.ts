import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { Context } from "../core/context.ts";
import { Player } from "../core/player.ts";
import { Project, Region, Track } from "../core/track.ts";
import { Workspace } from "@core/workspace.ts";

export const SaveEntireWorkspace = async (db: SqliteDB, ctx: Context) => {
    await SaveWorkspace(db, ctx.workspace);
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
            name,
            lastAccessed
        ) VALUES (?, ?, ?)
        ON CONFLICT DO UPDATE SET
            name = EXCLUDED.name,
            lastAccessed = EXCLUDED.lastAccessed
    `, [
        project.id,
        project.name,
        project.lastAccessed
    ]);
    if (err) {
        console.error(err);
    }
}

export const SavePlayer = async (db: SqliteDB, player: Player) => {
    const err = await db.execTrackChanges(`
        INSERT INTO "players" (
            id,
            projectId,
            volume,
            tempo,
            elapsedTime,
            input_selectedTrack,
            input_selectedRegion,
            input_undos
        ) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT DO UPDATE SET
            volume = EXCLUDED.volume,
            tempo = EXCLUDED.tempo,
            elapsedTime = EXCLUDED.elapsedTime,
            input_selectedTrack = EXCLUDED.input_selectedTrack,
            input_selectedRegion = EXCLUDED.input_selectedRegion,
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
    if (tracks.length === 0) return;

    const values = tracks.reduce((vals, track) => {
        vals.push(...[
            track.id,
            track.projectId,
            track.volume,
            track.pan,
            track.kind,
            track.filename,
            track.isUploaded ? 1 : 0,
            track.deleted ? 1 : 0,
        ]);
        return vals
    }, [] as any[]);

    const err = await db.execTrackChanges(`
        INSERT INTO "tracks" (
            id,
            projectId,
            volume,
            pan,
            kind,
            filename,
            isUploaded,
            deleted
        ) VALUES ${tracks.map(_ => `(?,?,?,?,?,?,?,?) `)}
        ON CONFLICT DO UPDATE SET
            volume = EXCLUDED.volume,
            pan = EXCLUDED.pan,
            kind = EXCLUDED.kind,
            filename = EXCLUDED.filename,
            isUploaded = EXCLUDED.isUploaded,
            deleted = EXCLUDED.deleted
    `, values);
    if (err) {
        console.error(err);
    }
}

export const SaveRegions = async (db: SqliteDB, regions: Region[]) => {
    if (regions.length === 0) return;

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
            projectId,
            trackId,
            offsetStart,
            offsetEnd,
            start,
            end,
            totalDuration,
            flags,
            deleted
        ) VALUES ${regions.map(_ => `(?,?,?,?,?,?,?,?,?,?) `)}  
        ON CONFLICT DO UPDATE SET
            trackId = EXCLUDED.trackId,
            offsetStart = EXCLUDED.offsetStart,
            offsetEnd = EXCLUDED.offsetEnd,
            start = EXCLUDED.start,
            end = EXCLUDED.end,
            totalDuration = EXCLUDED.totalDuration,
            flags = EXCLUDED.flags,
            deleted = EXCLUDED.deleted
    `, values);
    if (err) {
        console.error(err);
    }
}

export const SaveWorkspace = async (db: SqliteDB, workspace: Workspace) => {
    const err = await db.exec(`
        INSERT OR IGNORE INTO "workspace" (
            id
        ) VALUES (?)
    `, [
        workspace.id,
    ]);
    if (err) {
        console.error(err);
    }
}