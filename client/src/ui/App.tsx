// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";

import { Context, StateCtx, stateCtx } from "../core/context.ts";

import { PlayControls } from "./components/PlayControls.tsx";
import { Timeline } from "./panels/Timeline.tsx";
import { History } from "./panels/History.tsx";
import { TrackControls } from "./panels/TrackControls.tsx";
import { TrackList } from "./panels/TrackList.tsx";
import { LoadWorkspace } from "../db/load.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";
import { ProjectControls } from "@ui/components/ProjectControls.tsx";
import { Sync } from "@ui/components/Sync.tsx";
import { Syncer } from "@jakobsaadbye/teilen-sql";

function App() {

  const db = useDB();
  const [ctx, setCtx] = useState(stateCtx);
  const [syncer, setSyncer] = useState(new Syncer(db, ""));

  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        const context: Context = { ...ctx, S: setCtx };

        await LoadWorkspace(context, db);
      } catch (e) {
        console.warn(`Failed to load workspace'`, e);
      }
    }

    initializeWorkspace();
  }, []);

  return (
    <StateCtx.Provider value={{ ...ctx, S: setCtx }}>
      <Sync syncer={syncer} />
      <main className="w-full h-[100vh] overflow-hidden">

        {/* Top Section */}
        <div className="flex justify-between items-center w-full gap-x-4 p-2 h-18 bg-gray-50 border-b-1 border-b-black/40">
          <ProjectControls />
          <PlayControls />
          <div></div>
        </div>

        <div className="flex w-full h-full">
          <TrackList />

          <div className="flex flex-col w-full">
            <Timeline />
            <div className="h-[300px]">
              <TrackControls />
            </div>
          </div>

          <div className="w-100 h-full bg-gray-300 border-l-1 border-l-black/40">
            <History />
          </div>
        </div>
      </main>
    </StateCtx.Provider>
  )
}

export default App;
