import { Change, SqliteDB } from "@jakobsaadbye/teilen-sql";
import { Context } from "@core/context.ts";
import { Region, Track } from "@core/track.ts";

export const injectChangesIntoContext = async (db: SqliteDB, ctx: Context, changes: Change[]) => {
    console.time("injection-time");

    const regionChanges = changes.filter(change => change.tbl_name === "regions");
    const trackChanges = changes.filter(change => change.tbl_name === "tracks");
    const playerChanges = changes.filter(change => change.tbl_name === "players");
    const projectChanges = changes.filter(change => change.tbl_name === "projects");

    // const regionIds = regionChanges.map(change => change.pk);
    // const trackIds = trackChanges.map(change => change.pk);
    // const playerIds = playerChanges.map(change => change.pk);
    // const projectIds = projectChanges.map(change => change.pk);

    // let regionRows = [];
    // let trackRows = [];
    // let playerRows = [];
    // let projectRows = [];

    // // Get all the affected rows
    // if (regionIds.length > 0) {
    //     regionRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(regionIds)})`, [...regionIds]);
    // }
    // if (trackIds.length > 0) {
    //     trackRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(trackIds)})`, [...trackIds]);
    // }
    // if (playerIds.length > 0) {
    //     playerRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(playerIds)})`, [...playerIds]);
    // }
    // if (projectIds.length > 0) {
    //     projectRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(projectIds)})`, [...projectIds]);
    // }

    

    const trackList = ctx.trackList;

    // Tracks
    const trackInserts = trackChanges.filter(change => change.type === "insert");
    const trackUpdates = trackChanges.filter(change => change.type === "update");
    const trackDeletes = trackChanges.filter(change => change.type === "delete");

    const newTracks = [] as Track[];
    for (const insert of trackInserts) {
        let newTrack;
        if (insert.col_id === "id") { // @Todo - Match against primary key column of the table
            newTrack = new Track("audio", new File([], "x"), "x");
            newTracks.push(newTrack);
        } else {
            newTrack = newTracks.find(track => track.id === insert.pk);
        }
        newTrack[insert.col_id] = insert.value;
    }

    trackList.tracks.push(...newTracks);

    const tracks = trackList.tracks;
    for (const track of tracks) {
        for (const change of trackUpdates) {
            if (change.pk !== track.id) continue;
            const field = change.col_id as string;
            const value = change.value;
            track[field] = value;
        }
    }

    // Regions
    const regionInserts = regionChanges.filter(change => change.type === "insert");
    const regionUpdates = regionChanges.filter(change => change.type === "update");
    
    const newRegions = [] as Region[];
    for (const insert of regionInserts) {
        let newRegion;
        if (insert.col_id === "id") {
            newRegion = new Region("x", "x");
            newRegions.push(newRegion);
        } else {
            newRegion = newRegions.find(track => track.id === insert.pk);
        }
        newRegion[insert.col_id] = insert.value;
    }

    const currentRegions = tracks.reduce((regions, track) => { regions.push(...track.regions); return regions }, [] as Region[]);
    const regions = [...currentRegions, ...newRegions];
    for (const region of regions) {
        for (const change of regionUpdates) {
            if (change.pk !== region.id) continue;

            const field = change.col_id as string;
            const value = change.value;
            region[field] = value;
        }
    }

    // Link the new regions and tracks together
    // for (const region of newRegions) {
    //     for (const track of tracks) {
    //         if (region.trackId === track.id) {
    //             track.regions.push(region);
    //         }
    //     }
    // }



    console.timeEnd("injection-time");
}