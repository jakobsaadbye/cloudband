import { Entity } from "@core/entity.ts";
import { generateId } from "@core/id.ts";
import { Context } from "@core/context.ts";
import { TrackManager } from "@core/trackManager.ts";
import { Player } from "@core/player.ts";
import { PlayerInput } from "@core/input.ts";
import { SaveEntireProject } from "@/db/save.ts";

export class Project implements Entity {
    table = "projects";
    static serializedFields = [
        "id",
        "name",
        "lastAccessed",
        "livemodeEnabled",
    ] as const;

    id: string
    name: string
    lastAccessed: number
    livemodeEnabled: boolean

    constructor() {
        this.id = generateId();
        this.name = "Untitled project";
        this.lastAccessed = (new Date).getTime();
        this.livemodeEnabled = false;
    }

    SetName(ctx: Context, value: string) {
        this.name = value;
        ctx.S({ ...ctx });
    }
}

export const CreateNewProject = async (ctx: Context) => {
    const project = new Project();
    const trackManager = new TrackManager();
    const player = new Player(trackManager, project.id);
    const input = new PlayerInput(project.id);

    ctx.project = project;
    ctx.trackManager = trackManager;
    ctx.player = player;
    ctx.input = input;
    
    await SaveEntireProject(ctx);
    
    ctx.S({ ...ctx });

    return project;
}