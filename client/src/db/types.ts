import { Region, Track } from "@core/track.ts";
import { Project } from "@core/project.ts";

export type ProjectRow = Pick<Project, typeof Project.serializedFields[number]>;

export type PlayerRow = {
    id: string
    projectId: string
    volume: number
    tempo: number
    elapsedTime: number
    input_selectedTrack: number
    input_selectedRegion: number
    input_undos: number
}

export type TrackRow = Pick<Track, typeof Track.serializedFields[number]>;
export type RegionRow = Pick<Region, typeof Region.serializedFields[number]>;
