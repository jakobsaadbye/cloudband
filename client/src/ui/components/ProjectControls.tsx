// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { useCtx } from "@core/context.ts";
import { LoadProject } from "@/db/load.ts";
import { useDB, useQuery, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { SaveEntity, SaveEntities } from "@/db/save.ts";
import { handlePull, handlePush } from "@core/sync.ts";
import { Hud } from "@ui/components/Hud.tsx";
import { CommitHud } from "./CommitHud.tsx";
import { CreateNewProject, Project } from "@core/project.ts";
import { ProjectRow } from "@/db/types.ts";
import { DropdownList, DropdownItem } from "@ui/components/DropdownList.tsx";

export const ProjectControls = () => {

    const ctx = useCtx();
    const project = ctx.project;

    const [isSyncing, setIsSyncing] = useState(false);
    const [openedMenu, setOpenedMenu] = useState<"none" | "project" | "edit" | "view">("none");
    const [originalProjectName, setOriginalProjectName] = useState(project.name);

    const [showCommitHud, setShowCommitHud] = useState(false);

    useEffect(() => {
        const handleKeyboardInput = (e: KeyboardEvent) => {
            let handled = false;
            if (e.key === "Escape") {
                handled = true;
                closeAll();
            }

            if (handled) {
                e.preventDefault();
            }
        }

        document.addEventListener("keydown", handleKeyboardInput);

        return () => {
            document.removeEventListener("keydown", handleKeyboardInput);
        }
    }, [openedMenu]);

    const closeAll = () => {
        setOpenedMenu("none");
        setShowCommitHud(false);
    }

    const closeMenu = () => {
        setOpenedMenu("none");
    }

    const openMenu = (menu: "project" | "edit" | "view") => {
        if (openedMenu === menu) {
            closeMenu();
        } else {
            setOpenedMenu(menu);
        }
    }

    const renameProject = async () => {
        if (project.name === "") {
            project.SetName(ctx, originalProjectName);
            return;
        }
        else if (project.name === originalProjectName) {
            return;
        } else {
            setOriginalProjectName(project.name);
            await SaveEntity(ctx, project);
        }
    }

    const updateProjectName = (e: ChangeEvent) => {
        project.SetName(ctx, e.target.value);
    }

    const toggleLivemode = async () => {
        project.livemodeEnabled = !project.livemodeEnabled;
        await SaveEntities(ctx, [project]);
        ctx.S({...ctx});
    }

    const { PeopleGroup } = useIcons();

    return (
        <div className="ml-2 flex gap-x-2 items-center select-none">
            <p className="text-4xl">🎹</p>
            <div className="flex flex-col">
                <input className="px-2" value={project.name} onMouseDown={(e) => { e.stopPropagation() }} onChange={updateProjectName} onBlur={renameProject} />
                <div tabIndex={0} className="flex focus:outline-none items-center" onBlur={closeMenu}>

                    <div onClick={() => openMenu("project")} className="relative">
                        <div className="py-1 px-2 hover:bg-gray-200 rounded-sm">
                            <p className="text-sm text-gray-700">Project</p>
                        </div>
                        <ProjectDropdown
                            opened={openedMenu === "project"}
                            close={closeMenu}
                            setIsSyncing={setIsSyncing}
                            setShowCommitHud={setShowCommitHud}
                        />
                    </div>

                    <p className="text-sm text-gray-700 py-1 px-2 hover:bg-gray-200 rounded-sm">Edit</p>
                    <p className="text-sm text-gray-700 py-1 px-2 hover:bg-gray-200 rounded-sm">View</p>
                    {/* Live mode */}
                    <div title="Live mode" className="flex items-center gap-x-0.5 ml-2 px-3 py-1 hover:bg-gray-200 hover:border-gray-400 rounded-sm" onClick={toggleLivemode}>
                        <PeopleGroup className="w-5 h-5 fill-gray-700" />
                        <div className={twMerge("bg-gray-500 rounded-full w-2 h-2", project.livemodeEnabled && "bg-red-600")} />
                    </div>
                </div>
            </div>

            <CommitHud isOpen={showCommitHud} close={closeAll} />

        </div>
    )
}

type ProjectDropdownProps = {
    opened: boolean
    close: () => void
    setIsSyncing: (value: boolean) => void
    setShowCommitHud: (value: boolean) => void
}

const ProjectDropdown = ({ opened, close, setIsSyncing, setShowCommitHud }: ProjectDropdownProps) => {
    const ctx = useCtx();
    const db = useDB();
    const syncer = useSyncer();

    const projects = useQuery<ProjectRow[]>(`SELECT * FROM "projects" ORDER BY lastAccessed DESC`, []).data;

    const preventShenanigans = (e: Event) => {
        // Prevents the menu from closing when clicking on one of the items as there is an onBlur close on the parent
        // menu that will trigger if the event propagates ...
        e.preventDefault();
        e.stopPropagation();
    }

    const createProject = async () => {
        await CreateNewProject(ctx);
    }

    const openProject = async (project: ProjectRow) => {
        if (project.id === ctx.project.id) return;

        await LoadProject(ctx, db, project.id);

        const openedProject = ctx.project;
        openedProject.lastAccessed = (new Date).getTime();
        await SaveEntities(ctx, [openedProject]);
        ctx.S({ ...ctx });
    }

    const openRecentMenuItems = () => {
        if (!projects) return [];

        return projects.map(project => {
            const item: DropdownItem = {
                label: project.name,
                onClick: (e) => openProject(project)
            }
            return item;
        });
    }

    const items = [
        { label: "New", onClick: createProject, divide: true },
        { label: "Open...", onClick: () => { } },
        {
            label: "Open Recent", onClick: () => { }, submenu: openRecentMenuItems()
        },
    ] as DropdownItem[];

    if (!opened) return;
    return <>
        <DropdownList items={items} />
    </>
}


