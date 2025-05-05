// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef, LegacyRef, Ref } from "react";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { twMerge } from "tailwind-merge";

type HoverAction = {
    name: string
    icon: React.ReactNode
    onClick: () => void
}

type Props = {
    label: string
    icon?: React.ReactNode
    children: React.ReactNode
    className?: string
    headerClassName?: string
    hoverActions?: HoverAction[]
}

export const CollapsablePanel = ({ label, icon, children, className, headerClassName, hoverActions }: Props) => {
    const [isOpen, setIsOpen] = useState(true);

    const [height, setHeight] = useState<string | number>("0px");
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            if (isOpen) {
                const scrollHeight = contentRef.current.scrollHeight;
                setHeight(scrollHeight + "px");
            } else {
                setHeight("0px");
            }
        }
    }, [isOpen]);

    const { ArrowRight, ArrowDown } = useIcons();

    return (
        <section
            className={twMerge("bg-gray-200 overflow-scroll border-b-1 border-gray-400")}
            style={{
                flexGrow: isOpen ? 1 : 0,
                flexShrink: 1,
                flexBasis: isOpen ? "50%" : "0%",
            }}
        >
            <div className={twMerge("group h-8 flex items-center justify-between p-1 bg-gray-300 select-none hover:bg-gray-250", headerClassName)} onClick={() => setIsOpen(!isOpen)}>
                <div className="flex text-center">
                    {isOpen ? <ArrowDown className="fill-gray-500 w-5 h-5 m-0" /> : <ArrowRight className="fill-gray-500 w-5 h-5 m-0" />}
                    {icon && (
                        <div className="flex justify-center items-center">
                            {icon}
                        </div>
                    )}
                    <p className="font-semibold text-gray-600 text-sm">{label}</p>
                </div>

                <div className="flex">
                    <div className="hidden group-hover:flex pr-1">
                        {hoverActions && hoverActions.map((action, i) => {
                            return (
                                <div title={action.name} key={i} className="px-1 hover:bg-gray-200 rounded-sm" onMouseDown={(e) => { e.preventDefault(); action.onClick() }}>
                                    {action.icon}
                                </div>
                            )
                        })}
                    </div>

                    
                </div>
            </div>
            <div
                style={{
                    maxHeight: isOpen ? "300px" : "0px",
                    transition: "max-height 0.1s linear",
                    overflow: "scroll",
                }}
                className="w-full"
            >
                <div ref={contentRef} className={twMerge("flex w-full flex-col m-0 bg-gray-200 select-none overflow-scroll", className)}>
                    {children}
                </div>
            </div>
        </section>
    )
}
