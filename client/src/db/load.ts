import { Change, SqliteDB } from "@jakobsaadbye/teilen-sql";
import { ProjectRow, PlayerRow, RegionRow, TrackRow, WorkspaceRow } from "./types.ts";
import { Player } from "../core/player.ts";
import { Project, TrackKind, TrackList } from "../core/track.ts";
import { Context } from "../core/context.ts";
import { Track } from "../core/track.ts";
import { Region } from "../core/track.ts";
import { Workspace } from "@core/workspace.ts";
import { SaveProject, SaveWorkspace, SavePlayer } from "@/db/save.ts";

export const LoadWorkspace = async (ctx: Context, db: SqliteDB) => {
    const workspaceRow = await db.first<WorkspaceRow>(`SELECT * FROM "workspace"`, []);

    const workspace = new Workspace();
    if (!workspaceRow) {
        console.log(`Creating a new workspace ...`);
        await SaveWorkspace(db, workspace);
    } else {
        workspace.id = workspaceRow.id;
    }

    const projects = [] as Project[];
    const projectRows = await db.select<ProjectRow[]>(`SELECT * FROM "projects"`, []);
    if (projectRows.length === 0) {
        const project = new Project();
        project.lastAccessed = (new Date).getTime();
        projects.push(project);
        await SaveProject(db, project);
    } else {
        for (const projectRow of projectRows) {
            const project = projectRow2Project(projectRow);
            projects.push(project);
        }
    }

    workspace.projects = projects;

    const mostRecentProject = projects.sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
    
    const success = await LoadProject(ctx, db, mostRecentProject.id);
    if (!success) {
        console.error(`Failed to load project '${mostRecentProject.name}'`);
    }

    ctx.workspace = workspace;

    ctx.S({...ctx});
}

const LoadProject = async (ctx: Context, db: SqliteDB, id: string) => {
    console.time("load-project");
    // console.profile("load-project");

    const projectRow = await db.first<ProjectRow>(`SELECT * FROM "projects" WHERE id = ?`, [id]);
    if (!projectRow) {
        console.info(`Project with id '${id}' not found`);
        return false;
    }

    const project = projectRow2Project(projectRow);

    const trackRows = await db.select<TrackRow[]>(`SELECT * FROM "tracks" WHERE projectId = ?`, [project.id]);
    const regionRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE projectId = ?`, [project.id]);


    const trackList = new TrackList();

    // Load tracks
    for (let i = 0; i < trackRows.length; i++) {
        const row = trackRows[i];
        
        const file = await ctx.fileManager.GetOrDownloadFile(project.id, "tracks", row.filename);
        if (!file) {
            console.info(`Failed to load track because file '${row.filename}' couldn't be retrieved`);
            continue;
        }
        

        const track = new Track(row.kind as TrackKind, file, project.id);
        track.id = row.id;
        track.kind = row.kind as TrackKind;
        track.volume = row.volume;
        track.pan = row.pan;
        track.isUploaded = row.isUploaded ? true : false;
        track.deleted = row.deleted ? true : false;

        if (!track.deleted) {
            try {
                await trackList.LoadTrack(ctx, track, true); // We don't save the file; nor create the first region when loading
            } catch (e) {
                console.error(`Failed to load track ${track.file.name}`);
                continue;
            }
        }
    }
    
    // Load regions
    for (const track of trackList.tracks) {
        const linkedRegions = regionRows.filter(row => row.trackId === track.id);

        for (const row of linkedRegions) {
            const region = new Region(row.trackId, row.projectId);
            region.id = row.id;
            region.data = track.audioData;
            region.offsetStart = row.offsetStart;
            region.offsetEnd = row.offsetEnd;
            region.start = row.start;
            region.end = row.end;
            region.totalDuration = row.totalDuration;
            region.flags = 0 // row.flags;
            region.deleted = row.deleted ? true : false;


            track.regions.push(region);
        }
    }

    // Load player
    const player = new Player(trackList, project.id);
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
    ctx.trackList = trackList;

    // console.profileEnd("load-project");
    console.timeEnd("load-project");

    return true;
}

export const ReloadWorkspace = async (ctx: Context, db: SqliteDB, changes: Change[]) => {
    const project = ctx.project;

    // Fallback to "full" reload
    await LoadProject(ctx, db, project.id);

    const workspace = new Workspace();
    const workspaceRow = await db.select<WorkspaceRow>(`SELECT * FROM "workspace" LIMIT 1`, []);
    if (!workspaceRow) {
        console.warn(`No workspace was found`);
    } else {
        workspace.id = workspaceRow.id;
    }

    const projects = [];
    const projectRows = await db.select<ProjectRow[]>(`SELECT * FROM "projects"`, []);
    for (const row of projectRows) {
        projects.push(projectRow2Project(row));
    }
    workspace.projects = projects;

    ctx.workspace = workspace;

    ctx.S({...ctx});
}

const projectRow2Project = (projectRow: ProjectRow) => {
    const p = new Project();
    p.id = projectRow.id;
    p.name = projectRow.name;
    p.lastAccessed = projectRow.lastAccessed;
    return p;
}

export {
    LoadProject
}