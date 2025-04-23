import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";

export type DropdownItem = {
    label: string
    onClick: (e: MouseEvent) => void
    divide?: boolean
    submenu?: DropdownItem[]
}

export const DropdownList = ({ items, isSubmenu }: { items: DropdownItem[], isSubmenu?: boolean }) => {

    const { Play } = useIcons();

    return (
        <div
            autoFocus
            tabIndex={0}
            className={twMerge("absolute z-50 p-1 flex flex-col w-60 border-1 border-gray-400 bg-gray-100 focus:outline-none", isSubmenu && "-top-0 left-full hidden group-hover:block")}
        >
            {items.map((item, i) => {
                return (
                    <div key={i} className="group">
                        <div tabIndex={1} onMouseDown={item.onClick} className="relative flex items-center justify-between p-1 hover:bg-gray-200">

                            {item.submenu && <DropdownList items={item.submenu} isSubmenu />}

                            <p className={twMerge("text-sm text-gray-700")}>{item.label}</p>
                            {item.submenu && <Play className="w-4 h-4 fill-gray-500" />}
                        </div>
                        {item.divide && <p className="my-1 border-b-1 border-gray-300"></p>}
                    </div>
                )
            })}
        </div>
    )
}