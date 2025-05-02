import { Commit, DocumentSnapshot, PullResult } from "@jakobsaadbye/teilen-sql";
import { TrackRow, RegionRow } from "@/db/types.ts";
import { Context } from "@core/context.ts";
import { Entity } from "@core/entity.ts";
import { SaveEntities } from "@/db/save.ts";
import { unique } from "@core/util.ts";

export class RegionConflict implements Entity {
    table = "region_conflicts";
    replicated = false;
    static serializedFields = [
        "id",
        "projectId",
        "trackId",
        "theirRegion",
    ] as const;

    id: string;
    projectId: string
    trackId: string
    theirRegion: string // Json serialized Region

    constructor() {
        this.id = "";
        this.projectId = "";
        this.trackId = "";
        this.theirRegion = "";
    }
}

export const handleHighlevelConflicts = async (ctx: Context, pull: PullResult) => {
    const db = ctx.db;

    // if (pull.appliedChanges.length === 0) return;

    //
    // Handle the situation of concurrent overlapping regions
    //
    console.log(pull);
    

    const theirRegionChanges = pull.concurrentChanges.their.filter(change => change.tbl_name === "regions");
    if (theirRegionChanges.length === 0) return;
    const ourRegionChanges = pull.concurrentChanges.our.filter(change => change.tbl_name === "regions");
    if (ourRegionChanges.length === 0) return;

    const ourLatestCommit = await db.first<Commit>(`SELECT MAX(applied_at), * FROM "crr_commits" WHERE author = ?`, [db.siteId]);
    const theirLatestCommit = await db.first<Commit>(`SELECT MAX(applied_at), * FROM "crr_commits" WHERE author != ?`, [db.siteId]);

    if (!ourLatestCommit) return;
    if (!theirLatestCommit) {
        console.error(`Unable to find their latest commit while trying to resolve region changes`);
        return;
    }

    if (!pull.commonAncestor || pull.concurrentChanges.our.length === 0) {
        // Pull simply fast-forwarded as we didn't have any changes that could possibly conflict
        return;
    }

    //
    // Construct our version and their version of the document before the pull
    //
    const baseDoc = await db.getDocumentSnapshot(pull.commonAncestor);
    const ourDoc = baseDoc.applyChanges(pull.concurrentChanges.our);
    const theirDoc = baseDoc.applyChanges(pull.concurrentChanges.their);

    // Look into any of the regions that were modified on the same track
    const theirModifiedPks = unique(theirRegionChanges.map(change => change.pk));
    let theirModifiedRegions: RegionRow[] = [];
    for (const pk of theirModifiedPks) {
        const row = theirDoc.getRow<RegionRow>("regions", pk);
        if (!row) {
            continue;
        }
        theirModifiedRegions.push(row);
    }

    const ourModifiedPks = unique(ourRegionChanges.map(change => change.pk));
    let ourModifiedRegions: RegionRow[] = [];
    for (const pk of ourModifiedPks) {
        const row = ourDoc.getRow<RegionRow>("regions", pk);
        if (!row) {
            continue;
        }
        ourModifiedRegions.push(row);
    }

    console.log("Our modified regions before filtering", ourModifiedRegions);
    
    // Filter out region changes that didn't actually cause a difference by comparing it to the base version
    theirModifiedRegions = theirModifiedRegions.filter(region => differsFromBase(baseDoc, region));
    ourModifiedRegions = ourModifiedRegions.filter(region => differsFromBase(baseDoc, region));

    // Filter out modified regions with the same id that happened to land on the same position (start & end) as theirs
    ourModifiedRegions = ourModifiedRegions.filter(our => {
        const their = theirModifiedRegions.find(region => region.id === our.id);
        if (!their) {
            return true;
        }
        if (positionsAreEqual(our, their)) {
            
            return false;
        } else {
            return true;
        }
    });

    // Check if there is any overlap on the tracks on regions we both modified
    const theirRegionsPerTrack = Object.groupBy(theirModifiedRegions, (region) => region.trackId) as { [trackId: string]: RegionRow[] };
    for (const [trackId, regions] of Object.entries(theirRegionsPerTrack)) {

        const ourRegions = ourModifiedRegions.filter(region => region.trackId === trackId);
        const theirRegions = regions;
        
        if (ourRegions.length === 0) {
            // We didn't touch this entire track, so no way of conflict
            continue;
        }

        const overlap = getOverlappingRegions(ourRegions, theirRegions);

        // Add any of the overlap as a conflict
        const conflicts: RegionConflict[] = [];
        for (const region of overlap) {
            const cr = new RegionConflict();
            cr.id = region.id;
            cr.projectId = region.projectId;
            cr.trackId = region.trackId;
            cr.theirRegion = JSON.stringify(region);
            conflicts.push(cr);
        }

        await SaveEntities(ctx, conflicts);
        
    }
}

export const getContiniousRegions = (regions: RegionRow[]): RegionRow[][] => {
    // Join up the overlapping regions if they lay next to eachother a.k.a are continious (a.end = b.start)
    // such that we accept/decline on whole continious overlaps instead of individual overlapping regions.
    // [A,  B,  C, D]
    //      ^
    //     i,j
    //
    // [[A, B]]
    const epsilon = 0.00001;    // because we compare floats ...
    const continiousOverlaps: RegionRow[][] = [];
    for (let i = 0; i < regions.length; i++) {
        const base = regions[i];
        const continious = [base];
        for (let j = i + 1; j < regions.length; j++) {
            const next = regions[j];
            i = j;

            if (base.end >= next.start - epsilon && base.end <= next.start + epsilon) {
                continious.push(next);
            } else {
                break;
            }
        }
        continiousOverlaps.push(continious);
    }

    return continiousOverlaps;
}

const positionsAreEqual = (a: RegionRow, b: RegionRow) => {
    const epsilon = 0.00001;    // to make room for small discrepencies due to floating point errors

    if (a.start < b.start - epsilon || a.start > b.start + epsilon) return false;
    if (a.end < b.end - epsilon || a.end > b.end + epsilon) return false;
    return true;
}

const differsFromBase = (base: DocumentSnapshot, region: RegionRow) => {
    const baseRegion = base.getRow<RegionRow>("regions", region.id);
    if (!baseRegion) {
        // An insertion must have taken place. Keep as modification
        return true;
    }
    if (positionsAreEqual(baseRegion, region)) {
        return false;
    } else {
        return true;
    }
}


const regionOverlaps = (a: RegionRow, b: RegionRow) => {
    if (a.start >= b.start && b.start < a.end) return true;
    if (b.start >= a.start && a.start < b.end) return true;
    return false;
}

const getOverlappingRegions = (ours: RegionRow[], theirs: RegionRow[]) => {
    const overlap: RegionRow[] = [];

    const addToOverlap = (overlap: RegionRow[], region: RegionRow) => {
        const alreadyExists = overlap.find(x => x.id === region.id)
        if (alreadyExists) return;
        else overlap.push(region);
    }

    // Sort both regions by their start value
    ours.sort((a, b) => a.start - b.start);
    theirs.sort((a, b) => a.start - b.start);

    for (let i = 0; i < ours.length; i++) {
        const our = ours[i];
        for (let j = 0; j < theirs.length; j++) {
            const their = theirs[j];
            if (regionOverlaps(our, their)) {
                addToOverlap(overlap, their);
            } else {
                // We know that the later ones won't overlap either as they are sorted in time
                break;
            }
        }
    }

    return overlap;
}