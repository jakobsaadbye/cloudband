import { Region, Track } from "@core/track.ts";
import { Project } from "@core/project.ts";
import { PlayerInput } from "@core/input.ts";
import { Player } from "@core/player.ts";
import { RegionConflict } from "@core/conflict.ts";

export type ProjectRow = Pick<Project, typeof Project.serializedFields[number]>;
export type PlayerRow = Pick<Player, typeof Player.serializedFields[number]>;
export type InputRow = Pick<PlayerInput, typeof PlayerInput.serializedFields[number]>;
export type TrackRow = Pick<Track, typeof Track.serializedFields[number]>;
export type RegionRow = Pick<Region, typeof Region.serializedFields[number]>;
export type RegionConflictRow = Pick<RegionConflict, typeof RegionConflict.serializedFields[number]>;
