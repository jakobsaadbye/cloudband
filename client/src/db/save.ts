import { sqlPlaceholdersNxM } from "@jakobsaadbye/teilen-sql";
import { Context } from "@core/context.ts";
import { Region } from "@core/track.ts";
import { Entity } from "@core/entity.ts";
import { Action } from "@core/input.ts";

export const SaveEntireProject = async (ctx: Context) => {
    await SaveEntities(ctx, ctx.trackManager.tracks);
    const regions = ctx.trackManager.tracks.reduce((vals, track) => { vals.push(...track.regions); return vals }, [] as Region[]);
    await SaveEntities(ctx, regions);
    await SaveEntity(ctx, ctx.project);
    await SaveEntity(ctx, ctx.player);
    await SaveEntity(ctx, ctx.input);
}

const serialize = (e: Entity) => {
    const serializedFields = e.constructor.prototype.constructor.serializedFields as string[];
    if (!serializedFields) {
        console.error(`No serialized fields on entity`, e);
        return [];
    }

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

export const SaveAction = async (ctx: Context, action: Action, index: number) => {
    const db = ctx.db;

    const dataCopy = [];
    if (Array.isArray(action.data)) {
        for (let i = 0; i < action.data.length; i++) {
            const param = action.data[i];
            if (typeof param === "object") {
                // We expect that the data is referring to an entity
                dataCopy[i] = {
                    table: param["table"],
                    id: param["id"],
                };
            } else {
                dataCopy[i] = param;
            }
        }
    } else {
        console.warn(`Action data needs to be in array form`, action.data);
    }


    const serialized = {
        position: index,
        projectId: ctx.project.id,
        action: action.kind,
        data: JSON.stringify(dataCopy)
    };

    const columns = Object.keys(serialized);
    const values = Object.values(serialized);
    const updateStr = columns.map(col => `${col} = EXCLUDED.${col}`).join(',\n\t\t\t');

    const err = await db.execTrackChanges(`
        INSERT INTO "undo_stack" (${columns.join(',')}) 
        VALUES ${sqlPlaceholdersNxM(columns.length, 1)}
        ON CONFLICT DO UPDATE SET
            ${updateStr}
    `, values, ctx.project.id);
    if (err) {
        console.error(err);
    }

}