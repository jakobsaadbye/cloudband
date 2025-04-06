// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef, LegacyRef, Ref } from "react";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { twMerge } from "tailwind-merge";

type Props = {
    label: string
    icon?: React.ReactNode
    children: React.ReactNode
    className?: string
    reference?: Ref<HTMLDivElement>
}
export const CollapsablePanel = ({ label, icon, children, className, reference }: Props) => {
    const [isOpen, setIsOpen] = useState(true);

    const { ArrowRight, ArrowDown } = useIcons();

    return (
        <section className="overflow-hidden">
            <div className="flex items-center justify-between p-1 bg-gray-300 select-none hover:bg-gray-250" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex gap-x-1">
                    {icon && (
                        <div className="flex justify-center items-center">
                            {icon}
                        </div>
                    )}
                    <p className="font-semibold text-gray-600 text-sm">{label}</p>
                </div>
                {isOpen && <ArrowDown className="fill-gray-500 w-6 h-6" />}
                {!isOpen && <ArrowRight />}
            </div>
            <div className={twMerge("flex w-full ease-linear duration-100 transition-all max-h-0", isOpen && "max-h-100")}>
                <div ref={reference} className={twMerge("flex w-full flex-col m-0 h-64 bg-gray-200 border-b-1 border-gray-400 select-none overflow-scroll", className)}>
                    {children}
                </div>
            </div>
        </section>
    )
}
