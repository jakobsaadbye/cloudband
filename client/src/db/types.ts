export type ProjectRow = {
    id: string
    name: string
}

export type PlayerRow = {
    id: string
    project_id: string
    volume: number
    tempo: number
    elapsed_time: number
    input_selected_track: number
    input_selected_region: number
    input_undos: number
}

export type TrackRow = {
    id: string
    project_id: string
    volume: number
    pan: number
    kind: string
    filename: string
    is_uploaded: boolean
}

export type RegionRow = {
    id: string
    project_id: string
    track_id: string
    offset_start: number
    offset_end: number
    start: number
    end: number
    total_duration: number
    flags: number
    deleted: number
}