// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { useCtx } from "@core/context.ts";
import { LoadProject } from "@/db/load.ts";
import { useDB, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { SaveProject } from "@/db/save.ts";
import { handlePull, handlePush } from "@core/sync.ts";
import { Hud } from "@ui/components/Hud.tsx";
import { CommitHud } from "./CommitHud.tsx";

export const ProjectControls = () => {

    const ctx = useCtx();
    const db = useDB();
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
            await SaveProject(db, project);
        }
    }

    const updateProjectName = (e: ChangeEvent) => {
        project.SetName(ctx, e.target.value);
    }

    const { Sync } = useIcons();

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

                    {isSyncing && <Sync className="ml-4 fill-gray-600 w-5 h-5 animate-spin-reverse" />}
                </div>
            </div>

            <CommitHud isOpen={showCommitHud} close={closeAll} />

        </div>
    )
}

type Item = {
    title: string
    onClick: (e: MouseEvent) => void
    divide?: boolean
    submenu?: Item[]
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

    const workspace = ctx.workspace;

    const preventShenanigans = (e: Event) => {
        // Prevents the menu from closing when clicking on one of the items
        e.preventDefault();
        e.stopPropagation();
    }

    const openProject = async (projectId: string) => {
        await LoadProject(ctx, db, projectId);
        ctx.S({ ...ctx });
    }

    const openRecentMenuItems = () => {
        return workspace.projects.map(project => {
            const item: Item = {
                title: project.name,
                onClick: (e) => openProject(project.id)
            }
            return item;
        });
    }

    const pushChanges = async (e: Event) => {
        preventShenanigans(e);
        setIsSyncing(true);
        await handlePush(ctx, syncer);
        setTimeout(() => {
            setIsSyncing(false);
        }, 500);
    }
    const pullChanges = async (e: Event) => {
        preventShenanigans(e);
        setIsSyncing(true);
        await handlePull(ctx, syncer);
        setTimeout(() => {
            setIsSyncing(false);
        }, 500);
    }

    const items = [
        { title: "New", onClick: () => { }, divide: true },
        { title: "Open...", onClick: () => { } },
        {
            title: "Open Recent", onClick: () => { }, submenu: openRecentMenuItems(), divide: true
        },
        { title: "Pull", onClick: (e) => pullChanges(e) },
        { title: "Push", onClick: pushChanges },
        { title: "Commit...", onClick: () => setShowCommitHud(true) }
    ] as Item[];

    if (!opened) return;
    return <>
        <DropdownList items={items} />
    </>
}

const DropdownList = ({ items, isSubmenu }: { items: Item[], isSubmenu?: boolean }) => {

    const { Play } = useIcons();

    return (
        <div
            autoFocus
            tabIndex={0}
            className={twMerge("absolute p-1 flex flex-col w-60 bg-white shadow-sm shadow-gray-400 rounded-r-sm rounded-b-sm focus:outline-none", isSubmenu && "-top-0 left-full hidden group-hover:block")}
        >
            {items.map((item, i) => {
                return (
                    <div key={i} className="group">
                        <div tabIndex={1} onMouseDown={item.onClick} className="relative flex items-center justify-between p-1 hover:bg-gray-200 rounded-sm">

                            {item.submenu && <DropdownList items={item.submenu} isSubmenu />}

                            <p className={twMerge("text-sm text-gray-700")}>{item.title}</p>
                            {item.submenu && <Play className="w-4 h-4 fill-gray-500" />}
                        </div>
                        {item.divide && <p className="my-1 border-b-1 border-gray-200"></p>}
                    </div>
                )
            })}
        </div>
    )
}
