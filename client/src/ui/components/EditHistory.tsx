// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";

import { useCtx } from "@core/context.ts";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { CollapsablePanel } from "@ui/components/CollapsablePanel.tsx";
import { getActionName } from "@core/input.ts";

export const EditHistory = () => {
    const ctx = useCtx();
    const currentHead = useRef<HTMLDivElement | null>(null);
    const listElement = useRef<HTMLDivElement | null>(null);

    const input = ctx.input;

    useEffect(() => {
        if (currentHead.current && listElement.current) {
            listElement.current.scrollTo({
                top: currentHead.current.offsetTop - listElement.current.offsetTop,
                behavior: "instant"
            });
        }
    }, [currentHead.current]);

    const { IconHistory, IconEdit } = useIcons();

    return (
        <CollapsablePanel label="Edits">
            <div ref={listElement} className="flex flex-col select-none">
                {input.undoStack.map((action, i) => {
                    const undos = input.undos;
                    const headIndex = input.undoStack.length - undos - 1;
                    const undone = i > headIndex;
                    const head = i === headIndex;

                    const actionName = getActionName(action);
                    return (
                        <div ref={head ? currentHead : null} className={twMerge("p-1 animate-flash", head && "")} key={i}>
                            <p className={twMerge("text-sm text-gray-800", undone && "text-gray-400", head && "")}>{actionName}</p>
                        </div>
                    )
                })}
            </div>
        </CollapsablePanel>
    )
}
