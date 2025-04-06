import { Change, SqliteDB } from "@jakobsaadbye/teilen-sql";
import { ProjectRow, PlayerRow, RegionRow, TrackRow } from "./types.ts";
import { Player } from "../core/player.ts";
import { TrackKind } from "../core/track.ts";
import { TrackManager } from "@core/trackManager.ts";
import { Context } from "../core/context.ts";
import { Track } from "../core/track.ts";
import { Region } from "../core/track.ts";
import { SaveEntity, SavePlayer } from "@/db/save.ts";
import { Entity } from "@core/entity.ts";
import { Project } from "@core/project.ts";

const deserialize = (dest: Entity, row: any) => {
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
        const project = new Project();
        await SaveEntity(db, project);
        await LoadProject(ctx, db, project.id);
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
    deserialize(project, projectRow);

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
        deserialize(track, row);

        if (!track.deleted) {
            try {
                await trackManager.LoadTrack(ctx, track, true); // We don't save the file; nor create the first region when loading
            } catch (e) {
                console.error(`Failed to load track ${track.file.name}`);
                continue;
            }
        }
    }

    // Load regions
    for (const track of trackManager.tracks) {
        const relatedRegions = regionRows.filter(row => row.trackId === track.id);
        for (const row of relatedRegions) {
            const region = new Region(row.trackId, row.projectId);
            deserialize(region, row);
            track.regions.push(region);
        }
    }

    // Load player
    const player = new Player(trackManager, project.id);
    const playerRow = await db.first<PlayerRow>(`SELECT * FROM "players" WHERE projectId = ?`, [project.id]);
    if (!playerRow) {
        console.info(`No player was saved for the project. Creating a new one ...`);
        await SavePlayer(db, player);
    } else {
        player.id = playerRow.id;
        player.SetVolume(ctx, playerRow.volume);
        player.tempo = playerRow.tempo;
        player.elapsedTime = playerRow.elapsedTime;
        player.input.selectedTrack = null;
        player.input.selectedRegion = null;
        player.input.undos = 0 //playerRow.input_undos;
    }


    ctx.player = player;
    ctx.project = project;
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