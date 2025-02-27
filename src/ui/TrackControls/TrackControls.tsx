import { Track } from "@core/types.ts";
import { useCtx } from "../../core/context.ts";

type Props = {
    tracks: Track[]
    setTracks: (ts: Track[]) => void
}

export const TrackControls = ({ tracks, setTracks } : Props) => {

    const ctx = useCtx();
    const P = ctx.player;

    return (
        <div className="w-full h-full bg-gray-300 border-t-1 border-gray-600">
            <header className="h-10 p-2 bg-gray-400">
                <p className="text-white">Track</p>
            </header>
            <section className="flex p-2 gap-4">
                <div className="flex gap-x-2">
                    <p>Attack</p>
                    <input type="range" min={0} max={1} value={P.attackTime} step={0.1} onChange={(e) => P.SetAttackTime(ctx, +e.target.value)} />
                    <p className="px-2 bg-white text-gray-500 rounded-lg select-none">{P.attackTime}</p>
                </div>
                <div className="flex gap-x-2">
                    <p>Release</p>
                    <input type="range" min={0} max={1} value={P.releaseTime} step={0.1} onChange={(e) => P.SetReleaseTime(ctx, +e.target.value)} />
                    <p className="px-2 bg-white text-gray-500 rounded-lg select-none">{P.releaseTime}</p>
                </div>
            </section>
            <section className="flex p-2 gap-4">
                <div className="flex gap-x-2">
                    <p>Pulse Hz</p>
                    <input type="range" min={0} max={1000} value={P.pulseHz} step={10} onChange={(e) => P.SetPulseHz(ctx, +e.target.value)} />
                    <p className="px-2 bg-white text-gray-500 rounded-lg select-none">{P.pulseHz}</p>
                </div>
                <div className="flex gap-x-2">
                    <p>Lfo Hz</p>
                    <input type="range" min={20} max={40} value={P.lfoHz} step={1} onChange={(e) => P.SetLfoHz(ctx, +e.target.value)} />
                    <p className="px-2 bg-white text-gray-500 rounded-lg select-none">{P.lfoHz}</p>
                </div>
            </section>
            <section className="flex p-2 gap-4">
                <div className="flex gap-x-2">
                    <p>Noice duration</p>
                    <input type="range" min={0.1} max={2} value={P.noiceDuration} step={0.1} onChange={(e) => P.SetNoiceDuration(ctx, +e.target.value)} />
                    <p className="px-2 bg-white text-gray-500 rounded-lg select-none">{P.noiceDuration}</p>
                </div>
                <div className="flex gap-x-2">
                    <p>Noice Hz</p>
                    <input type="range" min={400} max={3000} value={P.noiceHz} step={50} onChange={(e) => P.SetNoiceHz(ctx, +e.target.value)} />
                    <p className="px-2 bg-white text-gray-500 rounded-lg select-none">{P.noiceHz}</p>
                </div>
            </section>
        </div>
    )
}
