export const tables = `

BEGIN;

CREATE TABLE IF NOT EXISTS projects (
    id text primary key,
    name text
);

CREATE TABLE IF NOT EXISTS players (
    id text primary key,
    project_id references projects(id),
    volume float,
    tempo int,
    elapsed_time double,
    input_selected_track  references tracks(id),
    input_selected_region references regions(id),
    input_undos int
);

CREATE TABLE IF NOT EXISTS tracks (
    id text primary key,
    project_id references projects(id),
    kind text,
    volume float,
    pan float,
    filename text
);

CREATE TABLE IF NOT EXISTS regions (
    id text primary key,
    project_id references projects(id),
    track_id references tracks(id) on delete cascade,
    offset_start double,
    offset_end double,
    start double,
    end double,
    total_duration double,
    flags int,
    deleted int
);

COMMIT;
`;