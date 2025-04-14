// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";

import { Context, StateCtx, stateCtx } from "../core/context.ts";

import { PlayControls } from "./components/PlayControls.tsx";
import { Timeline } from "./panels/Timeline.tsx";
import { EditHistory } from "./components/EditHistory.tsx";
import { TrackList } from "./panels/TrackList.tsx";
import { LoadWorkspace } from "../db/load.ts";
import { SyncContext, useDB } from "@jakobsaadbye/teilen-sql/react";
import { ProjectControls } from "@ui/components/ProjectControls.tsx";
import { AutoSync } from "./components/AutoSync.tsx";
import { Syncer } from "@jakobsaadbye/teilen-sql";
import { CommitHistory } from "./components/CommitHistory.tsx";

const baseServerUrl = "http://127.0.0.1:3000";

function App() {

  const db = useDB();
  const [ctx, setCtx] = useState(stateCtx);
  const [syncer, _] = useState(new Syncer(db, {
    pushEndpoint: "",
    pullEndpoint: "",
    commitPullEndpoint: baseServerUrl + "/pull-commits",
    commitPushEndpoint: baseServerUrl + "/push-commits",
  }));

  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        const context: Context = {
          ...ctx,
          S: setCtx,
          db: db,
        };

        await LoadWorkspace(context, db);
      } catch (e) {
        console.warn(`Failed to load workspace'`, e);
      }
    }

    initializeWorkspace();
  }, []);

  return (
    <StateCtx.Provider value={{ ...ctx, S: setCtx }}>
      <SyncContext.Provider value={syncer}>
        <AutoSync />
        <main className="w-full h-[100vh] overflow-hidden">

          {/* Top Section */}
          <div className="flex items-center w-full gap-x-4 p-2 h-18 bg-gray-50">
            <div className="w-1/3">
              <ProjectControls />
            </div>
            <div className="w-1/3">
              <PlayControls />
            </div>
            <div className="w-1/3"></div>
          </div>

          <div className="flex w-full h-full bg-gray-100">
            <TrackList />

            <div className="flex flex-col w-full">
              <Timeline />
              {/* <div className="h-[300px] bg-gray-100">
                <TrackControls />
              </div> */}
            </div>

            <div className="w-100 h-full bg-gray-100 border-l-1 border-l-black/40">
              <div className="flex flex-col">
                <EditHistory />
                <CommitHistory />
              </div>
            </div>
          </div>
        </main>
      </SyncContext.Provider>
    </StateCtx.Provider>
  )
}

export default App;
