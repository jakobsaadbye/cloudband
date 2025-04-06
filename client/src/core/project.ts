import { Entity } from "@core/entity.ts";
import { generateId } from "@core/id.ts";
import { Context } from "@core/context.ts";

export class Project implements Entity {
    table = "projects";
    serializedFields = ["*"];

    id: string
    name: string
    lastAccessed: number
    livemodeEnabled: boolean

    constructor() {
        this.id = generateId();
        this.name = "Untitled";
        this.lastAccessed = (new Date).getTime();
        this.livemodeEnabled = false;
    }

    SetName(ctx: Context, value: string) {
        this.name = value;
        ctx.S({...ctx});
    }
}