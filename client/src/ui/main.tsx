import './index.css'

// @deno-types="@types/react"
import { StrictMode } from 'react'
// @deno-types="@types/react-dom/client"
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

import { createDb, Syncer } from "@jakobsaadbye/teilen-sql"
import { SqliteContext, Inspector, SyncContext } from "@jakobsaadbye/teilen-sql/react"
import { tables } from "@common/tables.ts";

const db = await createDb("cloudband.db");
await db.exec(tables, []);
await db.upgradeTableToCrr("projects");
await db.upgradeTableToCrr("players");
await db.upgradeTableToCrr("tracks");
await db.upgradeTableToCrr("regions");
await db.finalize();

const syncer = new Syncer(db, "");

createRoot(document.getElementById('root') as HTMLElement).render(
  // <StrictMode>
  <SqliteContext.Provider value={db}>
    <SyncContext.Provider value={syncer}>
      <Inspector>
        <App />
      </Inspector>
    </SyncContext.Provider>
  </SqliteContext.Provider>
  // </StrictMode>,
)
