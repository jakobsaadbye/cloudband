import { SqliteDB, sqlPlaceholders } from "@jakobsaadbye/teilen-sql";
import { Context } from "../core/context.ts";
import { Player } from "../core/player.ts";
import { Region, Track } from "../core/track.ts";
import { Project } from "@core/project.ts";
import { Workspace } from "@core/workspace.ts";
import { ProjectRow } from "@/db/types.ts";
import { Entity } from "@core/entity.ts";

export const SaveEntireWorkspace = async (db: SqliteDB, ctx: Context) => {
    await SaveWorkspace(db, ctx.workspace);
    await SaveProject(db, ctx.project);
    await SaveTracks(db, ctx.trackList.tracks);
    const regions = ctx.trackList.tracks.reduce((vals, track) => { vals.push(...track.regions); return vals }, [] as Region[]);
    await SaveRegions(db, regions);
    await SavePlayer(db, ctx.player);
}

export const SaveEntity = async (db: SqliteDB, e: Entity) => {
    const baseExcludedFields = ["table", "serializedFields"];

    let fields: [string, any][] = [];
    if (e.serializedFields[0] === "*") {
        fields = Object.entries(e)
            .filter(([field, value]) => {
                if (typeof (value) === "object") return false;
                if (typeof (value) === "function") return false;
                if (baseExcludedFields.includes(field)) return false;
                return true;
            })
            .map(([field, value]) => {
                if (typeof (value) === "boolean") return [field, value ? 1 : 0];
                return [field, value];
            });
    }

    const columns = fields.map(([name, _]) => name);
    const values = fields.map(([_, value]) => value);

    const updateStr = columns.filter(col => col !== "id").map(col => `${col} = EXCLUDED.${col}`).join(',\n');

    const err = await db.execTrackChanges(`
        INSERT INTO "${e.table}" (${columns.join(',')}) 
        VALUES (${sqlPlaceholders(values)})
        ON CONFLICT DO UPDATE SET
            ${updateStr}
    `, values, e.id);
    if (err) {
        console.error(err);
    }
}

export const SaveProject = async (db: SqliteDB, project: Project | ProjectRow) => {
    const err = await db.execTrackChanges(`
        INSERT INTO "projects" (
            id,
            name,
            lastAccessed,
            livemodeEnabled
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET
            name = EXCLUDED.name,
            lastAccessed = EXCLUDED.lastAccessed,
            livemodeEnabled = EXCLUDED.livemodeEnabled
    `, [
        project.id,
        project.name,
        project.lastAccessed,
        project.livemodeEnabled ? 1 : 0
    ], project.id);
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
    ], player.projectId);
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
    `, values, tracks[0].projectId);
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
    `, values, regions[0].projectId);
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