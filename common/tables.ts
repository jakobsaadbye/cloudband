export const tables = `

BEGIN;

CREATE TABLE IF NOT EXISTS projects (
    id text primary key,
    name text,
    lastAccessed int,
    livemodeEnabled boolean
);

CREATE TABLE IF NOT EXISTS players (
    id text primary key,
    projectId references projects(id),
    volume float,
    tempo int,
    elapsedTime double,
    input_selectedTrack  references tracks(id),
    input_selectedRegion references regions(id),
    input_undos int
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
    muted boolean,
    mutedBySolo boolean,
    soloed boolean
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

COMMIT;
`;