import { SqliteDB, sqlPlaceholders, sqlPlaceholdersNxM } from "@jakobsaadbye/teilen-sql";
import { Context } from "@core/context.ts";
import { Player } from "@core/player.ts";
import { Region } from "@core/track.ts";
import { Entity } from "@core/entity.ts";

export const SaveEntireProject = async (ctx: Context) => {
    await SaveEntities(ctx, [ctx.project]);
    await SaveEntities(ctx, ctx.trackManager.tracks);
    const regions = ctx.trackManager.tracks.reduce((vals, track) => { vals.push(...track.regions); return vals }, [] as Region[]);
    await SaveEntities(ctx, regions);
    await SavePlayer(ctx.db, ctx.player);
}

const serialize = (e: Entity) => {
    const serializedFields = e.constructor.prototype.constructor.serializedFields as string[];

    const fields: [string, any][] = serializedFields
        .map(field => {
            const value = e[field];
            if (typeof (value) === "boolean") return [field, value ? 1 : 0];
            return [field, value];
        });


    return fields;
}

export const SaveEntities = async (ctx: Context, entities: Entity[]) => {
    if (entities.length === 0) return;
    const db = ctx.db;

    const documentId = ctx.project.id;

    const serialized = entities.map(serialize);
    const obj = serialized[0];

    const columns = obj.map(([field, _]) => field);
    const values = serialized.map(obj => obj.map(([_, value]) => value)).reduce((acc, vals) => { acc.push(...vals); return acc }, [] as any[]);

    const updateStr = columns.filter(col => col !== "id").map(col => `${col} = EXCLUDED.${col}`).join(',\n\t\t\t');

    const err = await db.execTrackChanges(`
        INSERT INTO "${entities[0].table}" (${columns.join(', ')}) 
        VALUES ${sqlPlaceholdersNxM(obj.length, serialized.length)}
        ON CONFLICT DO UPDATE SET
            ${updateStr}
    `, values, documentId);
    if (err) {
        console.error(err);
    }
}

export const SaveEntity = async (ctx: Context, e: Entity) => {
    return await SaveEntities(ctx, [e]);
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