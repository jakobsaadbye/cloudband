import { SqliteDB, sqlPlaceholders, sqlPlaceholdersNxM } from "@jakobsaadbye/teilen-sql";
import { Context } from "../core/context.ts";
import { Player } from "../core/player.ts";
import { Region, Track } from "../core/track.ts";
import { Project } from "@core/project.ts";
import { ProjectRow } from "@/db/types.ts";
import { Entity } from "@core/entity.ts";

export const SaveEntireProject = async (db: SqliteDB, ctx: Context) => {
    await SaveEntities(db, [ctx.project]);
    await SaveEntities(db, ctx.trackManager.tracks);
    const regions = ctx.trackManager.tracks.reduce((vals, track) => { vals.push(...track.regions); return vals }, [] as Region[]);
    await SaveEntities(db, regions);
    await SavePlayer(db, ctx.player);
}

const serialize = (e: Entity) => {
    const serializedFields = e.constructor.prototype.constructor.serializedFields as string[];

    const fields: [string, any][] = Object.entries(e)
        .filter(([field, value]) => {
            if (serializedFields.includes(field)) return true;
            return false;
        })
        .map(([field, value]) => {
            if (typeof (value) === "boolean") return [field, value ? 1 : 0];
            return [field, value];
        });

    return fields;
}

export const SaveEntities = async (db: SqliteDB, entities: Entity[]) => {
    if (entities.length === 0) return;

    const e = entities[0];

    const serialized = entities.map(serialize);

    const obj = serialized[0];

    const columns = obj.map(([field, _]) => field);
    const values = serialized.map(obj => obj.map(([_, value]) => value)).reduce((acc, vals) => {acc.push(...vals); return acc}, [] as any[]);

    const updateStr = columns.filter(col => col !== "id").map(col => `${col} = EXCLUDED.${col}`).join(',\n\t\t\t');

    const err = await db.execTrackChanges(`
        INSERT INTO "${e.table}" (${columns.join(', ')}) 
        VALUES ${sqlPlaceholdersNxM(obj.length, serialized.length)}
        ON CONFLICT DO UPDATE SET
            ${updateStr}
    `, values);
    if (err) {
        console.error(err);
    }
}

export const SaveEntity = async (db: SqliteDB, e: Entity) => {
    const obj = serialize(e);

    const columns = obj.map(([field, _]) => field);
    const values = obj.map(([_, value]) => value);

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