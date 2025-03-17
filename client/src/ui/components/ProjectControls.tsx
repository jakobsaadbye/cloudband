// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { useCtx } from "@core/context.ts";
import { LoadProject } from "@/db/load.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";
import { SaveProject } from "@/db/save.ts";

export const ProjectControls = () => {

    const ctx = useCtx();
    const db = useDB();
    const project = ctx.project;

    const [openedMenu, setOpenedMenu] = useState<"none" | "project" | "edit" | "view">("none");
    const [originalProjectName, setOriginalProjectName] = useState(project.name);

    useEffect(() => {
        const handleKeyboardInput = (e: KeyboardEvent) => {
            let handled = false;
            if (e.key === "Escape") {
                handled = true;
                closeMenu();
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

    return (
        <div className="ml-2 flex gap-x-2 items-center select-none">
            <p className="text-4xl">🎹</p>
            <div className="flex flex-col">
                <input className="px-2" value={project.name} onMouseDown={(e) => {e.stopPropagation()}} onChange={updateProjectName} onBlur={renameProject} />
                <div tabIndex={0} className="flex focus:outline-none" onBlur={closeMenu}>

                    <div onClick={() => openMenu("project")} className="relative">
                        <div className="py-1 px-2 hover:bg-gray-200 rounded-sm">
                            <p className="text-sm text-gray-700">Project</p>
                        </div>
                        <ProjectDropdown opened={openedMenu === "project"} close={closeMenu} />
                    </div>

                    <p className="text-sm text-gray-700 py-1 px-2 hover:bg-gray-200 rounded-sm">Edit</p>
                    <p className="text-sm text-gray-700 py-1 px-2 hover:bg-gray-200 rounded-sm">View</p>
                </div>
            </div>
        </div>
    )
}

type Item = {
    title: string
    onClick: (e: MouseEvent) => void
    divide?: boolean
    submenu?: Item[]
}

const ProjectDropdown = ({ opened, close }: { opened: boolean, close: () => void }) => {
    const ctx = useCtx();
    const db = useDB();

    const workspace = ctx.workspace;

    const openProject = async (e: MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();
        await LoadProject(ctx, db, projectId);
        ctx.S({...ctx});
    }

    const openRecentItems = () => {
        return workspace.projects.map(project => {
            const item: Item = {
                title: project.name,
                onClick: (e) => openProject(e, project.id)
            }
            return item;
        });
    }

    const items = [
        { title: "New", onClick: () => { }, divide: true },
        { title: "Open...", onClick: () => { } },
        {
            title: "Open Recent", onClick: () => { }, submenu: openRecentItems()
        },
    ] as Item[];

    if (!opened) return <></>
    return <DropdownList items={items} />
}

const DropdownList = ({ items, isSubmenu }: { items: Item[], isSubmenu?: boolean }) => {

    const { Play } = useIcons();

    return (
        <div
            autoFocus
            tabIndex={0}
            className={twMerge("absolute p-1 flex flex-col w-60 bg-white shadow-sm shadow-gray-400 rounded-r-sm rounded-b-sm focus:outline-none", isSubmenu && "-top-1 left-full hidden group-hover:block")}
        >
            {items.map((item, i) => {
                return (
                    <div key={i} className="group">
                        <div className="relative flex items-center justify-between p-1 hover:bg-gray-200">

                            {item.submenu && <DropdownList items={item.submenu} isSubmenu />}

                            <p tabIndex={1} onMouseDown={item.onClick} className={twMerge("text-sm text-gray-700")}>{item.title}</p>
                            {item.submenu && <Play className="w-4 h-4 fill-gray-500" />}
                        </div>
                        {item.divide && <p className="my-1 border-b-1 border-gray-200"></p>}
                    </div>
                )
            })}
        </div>
    )
}
