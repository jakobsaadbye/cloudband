import { Project } from "@core/track.ts";
import { generateId } from "@core/id.ts";

export class Workspace {
    id: string
    projects: Project[]

    constructor() {
        this.id = generateId();
        this.projects = [];
    }
}