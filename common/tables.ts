export const tables = `

BEGIN;

CREATE TABLE IF NOT EXISTS projects (
    id text primary key,
    name text,
    lastAccessed int default 0,
    livemodeEnabled boolean
);

CREATE TABLE IF NOT EXISTS players (
    id text primary key,
    projectId references projects(id),
    volume float default 0.5,
    tempo int default 100,
    elapsedTime double default 0.0
);

CREATE TABLE IF NOT EXISTS tracks (
    id text primary key,
    projectId references projects(id),
    kind text,
    volume float,
    pan float,
    filename text,
    isUploaded boolean,
    deleted boolean,
    muted boolean default 0,
    mutedBySolo boolean default 0,
    soloed boolean default 0
);

CREATE TABLE IF NOT EXISTS regions (
    id text primary key,
    projectId references projects(id),
    trackId references tracks(id) on delete cascade,
    offsetStart double,
    offsetEnd double,
    start double,
    end double,
    totalDuration double,
    flags int,
    deleted boolean
);

CREATE TABLE IF NOT EXISTS region_conflicts (
    id text primary key,
    projectId references projects(id),
    trackId references tracks(id) on delete cascade,
    theirRegion text
);

CREATE TABLE IF NOT EXISTS undo_stack (
    position integer,
    projectId text,
    action text,
    data text,

    primary key (position, projectId)
);

CREATE TABLE IF NOT EXISTS input (
    id text primary key,
    projectId text,
    selectedTrack  references tracks(id),
    selectedRegion references regions(id),
    undos int
);

CREATE TABLE IF NOT EXISTS ui_state (
    lotr integer primary key default 1,
    active_side_panel text
);

COMMIT;
`;