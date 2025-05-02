import { Change, RowConflict, SqliteDB } from "@jakobsaadbye/teilen-sql";
import { ProjectRow, PlayerRow, RegionRow, TrackRow, RegionConflictRow } from "./types.ts";
import { Player } from "../core/player.ts";
import { TrackKind } from "../core/track.ts";
import { TrackManager } from "@core/trackManager.ts";
import { Context } from "../core/context.ts";
import { Track } from "../core/track.ts";
import { Region } from "../core/track.ts";
import { Entity } from "@core/entity.ts";
import { CreateNewProject, Project } from "@core/project.ts";
import { Action, PlayerInput } from "@core/input.ts";
import { getContiniousRegions as getConflictingSections, getContiniousRegions, RegionConflict } from "@core/conflict.ts";

const deserializeRow = (dest: Entity, row: any) => {
    if (!row) return;

    for (const key of Object.keys(row)) {
        if (typeof dest[key] === "boolean") {
            dest[key] = row[key] ? true : false
        } else {
            dest[key] = row[key];
        }
    }
}

export const LoadWorkspace = async (ctx: Context, db: SqliteDB) => {
    const recentProjects = await db.select<ProjectRow[]>(`SELECT * FROM "projects" ORDER BY lastAccessed DESC`, []);

    if (recentProjects.length === 0) {
        await CreateNewProject(ctx);
    } else {
        await LoadProject(ctx, db, recentProjects[0].id);
    }

    ctx.S({ ...ctx });
}

export const LoadProject = async (ctx: Context, db: SqliteDB, id: string) => {
    console.time("load-project");
    // console.profile("load-project");

    const projectRow = await db.first<ProjectRow>(`SELECT * FROM "projects" WHERE id = ?`, [id]);
    if (!projectRow) {
        console.info(`Project with id '${id}' not found`);
        return false;
    }
    const project = new Project();
    deserializeRow(project, projectRow);

    const trackRows = await db.select<TrackRow[]>(`SELECT * FROM "tracks" WHERE projectId = ?`, [project.id]);
    const regionRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE projectId = ?`, [project.id]);


    const trackManager = new TrackManager();

    // Load tracks
    for (const row of trackRows) {
        const file = await ctx.fileManager.GetOrDownloadFile(project.id, "tracks", row.filename);
        if (!file) {
            console.info(`Failed to load track because file '${row.filename}' couldn't be retrieved`);
            continue;
        }

        const track = new Track(row.kind as TrackKind, file, project.id);
        deserializeRow(track, row);

        if (!track.deleted) {
            try {
                await trackManager.LoadTrack(ctx, track, true); // We don't save the file; nor create the first region when loading
            } catch (e) {
                console.error(`Failed to load track ${track.file.name}`);
                continue;
            }
        }
    }

    //
    // Load region conflicts
    //
    const regionConflicts = await db.select<RegionConflictRow[]>(`SELECT * FROM "region_conflicts" WHERE projectId = ?`, [project.id]);
    for (const track of trackManager.tracks) {
        const relatedConflicts = regionConflicts.filter(region => region.trackId === track.id);

        const theirRegionRows: RegionRow[] = [];
        for (const conflict of relatedConflicts) {
            const row = JSON.parse(conflict.theirRegion) as RegionRow;
            theirRegionRows.push(row);
        }

        const continiousRegionRows = getContiniousRegions(theirRegionRows);
        
        // Turn each overlap into full region objects
        const conflictingSections: Region[][] = [];
        for (const rows of continiousRegionRows) {
            const section: Region[] = [];
            for (const row of rows) {
                const region = new Region(track.id, project.id);
                deserializeRow(region, row);
                section.push(region);
            }
            conflictingSections.push(section);
        }

        track.conflictingSections = conflictingSections;
    }

    // Load regions
    for (const track of trackManager.tracks) {
        const relatedRegions = regionRows.filter(row => row.trackId === track.id);
        for (const row of relatedRegions) {
            const region = new Region(row.trackId, row.projectId);
            deserializeRow(region, row);
            region.data = track.audioData;

            track.regions.push(region);
        }
    }

    // Load player
    const player = new Player(trackManager, project.id);
    const playerRow = await db.first<PlayerRow>(`SELECT * FROM "players" WHERE projectId = ?`, [project.id]);
    deserializeRow(player, playerRow);

    // Load input + undo stack
    const input = new PlayerInput(project.id);
    const inputRow = await db.first<PlayerRow>(`SELECT * FROM "input" WHERE projectId = ?`, [project.id]);
    deserializeRow(input, inputRow);

    const undoStackRows = await db.select<any[]>(`SELECT * FROM "undo_stack" WHERE projectId = ? ORDER BY position ASC`, [project.id]);

    const undoStack = [] as Action[];
    for (const row of undoStackRows) {
        const actionKind = row.action;
        const data = JSON.parse(row.data) as any[];
        const copy = [];
        for (let i = 0; i < data.length; i++) {
            const param = data[i];
            if (typeof param === "object") {
                // This is an entity identifier with table + id
                const table = param["table"];
                const id = param["id"];

                let entity;
                switch (table) {
                    case "regions": {
                        entity = trackManager.GetRegionWithId(id);
                        break;
                    }
                    case "tracks": {
                        entity = trackManager.GetTrackWithId(id);
                        break;
                    }
                }

                if (!entity) {
                    console.warn(`Missing entity '${table}|${id}'`);
                }

                copy[i] = entity;
            } else {
                copy[i] = data[i];
            }
        }

        const action: Action = { kind: actionKind, data: copy };
        undoStack.push(action);
    }
    input.undoStack = undoStack;

    ctx.project = project;
    ctx.input = input;
    ctx.player = player;
    ctx.trackManager = trackManager;

    // console.profileEnd("load-project");
    console.timeEnd("load-project");

    return true;
}

export const ReloadProject = async (ctx: Context, db: SqliteDB, changes: Change[]) => {
    const project = ctx.project;

    // Fallback to "full" reload
    await LoadProject(ctx, db, project.id);

    ctx.S({ ...ctx });
}

const regionConflicts2Regions = (conflicts: RegionConflictRow[]) => {
    const deserialize = (conflict: RegionConflictRow): Region => {
        const row = JSON.parse(conflict.theirRegion) as RegionRow;
        const region = new Region(row.trackId, row.projectId);
        deserializeRow(region, row);
        return region;
    }

    return conflicts.map(deserialize);
}