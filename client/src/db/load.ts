import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { ProjectRow, PlayerRow, RegionRow, TrackRow } from "./types.ts";
import { Player } from "../core/player.ts";
import { Project, TrackKind, TrackList } from "../core/track.ts";
import { Context } from "../core/context.ts";
import { Track } from "../core/track.ts";
import { Region } from "../core/track.ts";
import { GetOrDownloadFile } from "@core/file_manager.ts";

const LoadProject = async (ctx: Context, db: SqliteDB, name: string) => {
    const projectRow = await db.first<ProjectRow>(`SELECT * FROM "projects" WHERE name = ?`, [name]);
    if (!projectRow) {
        console.info(`Project not found`);
        return false;
    }

    const project = new Project();
    project.id = projectRow.id;
    project.name = projectRow.name;


    const playerRow = await db.first<PlayerRow>(`SELECT * FROM "players" WHERE project_id = ?`, [project.id]);
    if (!playerRow) {
        console.error(`No player was saved for the project '${project.id}'`);
        return false;
    }
    const trackRows = await db.select<TrackRow[]>(`SELECT * FROM "tracks" WHERE project_id = ?`, [project.id]);
    const regionRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE project_id = ?`, [project.id]);


    const trackList = new TrackList();

    // Load tracks
    const t0 = performance.now();
    for (let i = 0; i < trackRows.length; i++) {
        const row = trackRows[i];

        const file = await GetOrDownloadFile(project.id, "tracks", row.filename);
        if (!file) {
            console.info(`Failed to load track because file '${row.filename}' couldn't be retrieved`);
            continue;
        }
        

        const track = new Track(row.kind as TrackKind, file, project.id);
        track.id = row.id;
        track.kind = row.kind as TrackKind;
        track.SetVolume(ctx, row.volume);
        track.SetPan(ctx, row.pan);
        track.isUploaded = row.is_uploaded ? true : false;

        await trackList.LoadTrack(ctx, track, true); // We don't save the file; nor create the first region when loading
    }
    const t1 = performance.now();
    console.log(`Loading tracks took ${(t1 - t0).toFixed(2)} ms.`);
    
    // Load regions
    for (const track of trackList.tracks) {
        const linkedRegions = regionRows.filter(row => row.track_id === track.id);

        for (const row of linkedRegions) {
            const region = new Region(row.track_id, row.project_id);
            region.id = row.id;
            region.data = track.audioData;
            region.offsetStart = row.offset_start;
            region.offsetEnd = row.offset_end;
            region.start = row.start;
            region.end = row.end;
            region.totalDuration = row.total_duration;
            region.flags = row.flags;
            region.deleted = row.deleted ? true : false;


            track.regions.push(region);
        }
    }

    const player = new Player(trackList, project.id);
    player.id = playerRow.id;
    player.SetVolume(ctx, playerRow.volume);
    player.tempo = playerRow.tempo;
    player.elapsedTime = playerRow.elapsed_time;
    player.input.selectedTrack = null;
    player.input.selectedRegion = null;
    player.input.undos = 0 //playerRow.input_undos;


    ctx.player = player;
    ctx.project = project;
    ctx.trackList = trackList;
    ctx.S({...ctx});

    return true;
}

export {
    LoadProject
}