// @deno-types="npm:@types/react@19"
import { useState } from "react";

import { Track } from "@core/types.ts";
import { StateCtx, stateCtx } from "../core/context.ts";

import { TabBar } from "./TabBar/TabBar.tsx";
import { PlayControls } from "./PlayControls/PlayControls.tsx";
import { TrackPlayer } from "./TrackPlayer/TrackPlayer.tsx";
import { TrackList } from "./TrackList/TrackList.tsx";
import { TrackControls } from "@ui/TrackControls/TrackControls.tsx";

function App() {

  const [ctx, setCtx] = useState(stateCtx);
  const [tracks, setTracks] = useState<Track[]>([]);

  return (
    <StateCtx.Provider value={{...ctx, S: setCtx}}>
      <main className="w-full h-full overflow-hidden">
        <TabBar />
        <PlayControls />

        <div className="flex w-full h-[90vh]">
          <TrackList tracks={tracks} setTracks={setTracks} />

          <div className="flex flex-col w-full">
            <TrackPlayer tracks={tracks} setTracks={setTracks} />
            <div className="h-[300px]">
              <TrackControls tracks={tracks} setTracks={setTracks} />
            </div>
          </div>
        </div>
      </main>
    </StateCtx.Provider>
  )
}

export default App;
