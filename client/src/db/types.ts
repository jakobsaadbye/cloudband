export type WorkspaceRow = {
    id: string
}

export type ProjectRow = {
    id: string
    name: string
    lastAccessed: number
}

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

export type TrackRow = {
    id: string
    projectId: string
    volume: number
    pan: number
    kind: string
    filename: string
    isUploaded: boolean
    deleted: boolean
}

export type RegionRow = {
    id: string
    projectId: string
    trackId: string
    offsetStart: number
    offsetEnd: number
    start: number
    end: number
    totalDuration: number
    flags: number
    deleted: number
}