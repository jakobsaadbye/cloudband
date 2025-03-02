// @deno-types="npm:@types/react@19"
import { useState } from "react";

import { StateCtx, stateCtx } from "../core/context.ts";

import { TabBar } from "./panels/TabBar.tsx";
import { PlayControls } from "./panels/PlayControls.tsx";
import { Timeline } from "./panels/Timeline.tsx";
import { TrackList } from "./panels/TrackList.tsx";
import { TrackControls } from "./panels/TrackControls.tsx";

function App() {

  const [ctx, setCtx] = useState(stateCtx);

  return (
    <StateCtx.Provider value={{...ctx, S: setCtx}}>
      <main className="w-full h-full overflow-hidden">
        <TabBar />
        <PlayControls />

        <div className="flex w-full h-[90vh]">
          <TrackList />

          <div className="flex flex-col w-full">
            <Timeline />
            <div className="h-[300px]">
              <TrackControls />
            </div>
          </div>
        </div>
      </main>
    </StateCtx.Provider>
  )
}

export default App;
