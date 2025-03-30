import React from 'react'

type Props = {
    title: string
    isOpen: boolean
    children: React.ReactNode
}

export const Hud = ({ title, isOpen, children }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex justify-center">
            <div className="relative z-50 w-fit h-fit p-2 bg-gray-100 rounded-md shadow-lg border-1 border-gray-300">
                {/* <h1 className="mb-2 font-bold text-3xl">{title}</h1> */}
                {children}
            </div>
        </div>
    );
}
