import { SqliteDB, sqlPlaceholders } from "@jakobsaadbye/teilen-sql";
import { Track } from "@core/track.ts";
import { Context } from "@core/context.ts";

const baseUrl = "http://127.0.0.1:3002";

export const createFileManager = async () => {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("FileStorageDB", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("files")) {
                db.createObjectStore("files");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }) as IDBDatabase;

    return new FileManager(db);
}

export class FileManager {
    idb: IDBDatabase

    constructor(idb: IDBDatabase) {
        this.idb = idb;
    }

    async WriteLocalFile(projectId: string, folder: string, name: string, data: ArrayBuffer) {
        const fileContent = data;
        const filePath = `${projectId}/${folder}/${name}`;

        try {
            const store = this.idb.transaction("files", "readwrite").objectStore("files");
            const request = store.put(fileContent, filePath);

            await new Promise((resolve, reject) => {
                request.onsuccess = resolve;
                request.onerror = reject;
            });

            console.log("File saved to IndexedDB");

            return true;
        } catch (error) {
            console.error("Failed to write file using IndexedDB", error);
            return false;
        }
    }

    async GetLocalFile(projectId: string, folder: string, filename: string) {
        const filePath = `${projectId}/${folder}/${filename}`;

        try {
            const store = this.idb.transaction("files", "readwrite").objectStore("files");
            const request = store.get(filePath);

            await new Promise((resolve, reject) => {
                request.onsuccess = resolve;
                request.onerror = reject;
            });

            const data = request.result as ArrayBuffer;
            if (!data) {
                return null;
            } else {
                const blob = new Blob([data]);
                const file = new File([blob], filename);
                return file;
            }
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async DownloadFile(projectId: string, folder: string, filename: string) {
        const url = new URL(baseUrl + "/download-file");
        url.searchParams.append("directory", folder);
        url.searchParams.append("projectId", projectId);
        url.searchParams.append("filename", filename);

        try {
            const response = await fetch(url, {
                method: "GET",
            });


            if (response.ok) {
                const blob = await response.blob();
                const file = new File([blob], filename);
                const fileContent = await blob.arrayBuffer();
                const ok = await this.WriteLocalFile(projectId, folder, file.name, fileContent);
                if (!ok) {
                    return null;
                } else {
                    return file;
                }
            } else {
                const error = await response.json();
                console.error(error.message);
                return null;
            }
        } catch (e) {
            console.error(e.message);
            return null;
        }
    }

    async UploadFile(projectId: string, folder: string, file: File) {
        const headers = new Headers({});
        headers.set("Content-Type", file.type);

        const url = new URL(baseUrl + "/upload-file");
        url.searchParams.append("directory", folder);
        url.searchParams.append("projectId", projectId);
        url.searchParams.append("filename", file.name);

        try {
            const data = await file.arrayBuffer();

            const response = await fetch(url, {
                method: "POST",
                body: data,
                headers,
            });

            if (response.ok) {
                return null;
            } else {
                const error = await response.json();
                return error.message;
            }
        } catch (e) {
            return e.message;
        }
    }

    async GetOrDownloadFile(projectId: string, folder: string, filename: string) {
        const localFile = await this.GetLocalFile(projectId, folder, filename);
        if (!localFile) {
            const downloadedFile = await this.DownloadFile(projectId, folder, filename);
            if (downloadedFile) {
                console.log(`Downloaded '${filename}' ...`);
            }
            return downloadedFile;
        } else {
            return localFile;
        }
    }

    async UploadNonUploadedFiles(ctx: Context) {
        const db = ctx.db;
        if (!db) return;

        const nonUploadedTracks = await db.select<Track[]>(`SELECT * FROM "tracks" WHERE isUploaded = 0`, []);

        const uploadedIds = [];
        for (const track of nonUploadedTracks) {
            const file = await ctx.fileManager.GetLocalFile(track.projectId, "tracks", track.filename);
            if (!file) {
                console.warn(`Missing local file ${track.filename}`);
                continue;
            }

            const err = await ctx.fileManager.UploadFile(track.projectId, "tracks", file);
            if (err) {
                console.warn(`Failed to upload file '${track.filename}' to the server. `, err);
                continue;
            }

            track.isUploaded = true;
            uploadedIds.push(track.id);
        }

        if (uploadedIds.length > 0) {
            await db.execTrackChanges(`UPDATE "tracks" SET isUploaded = 1 WHERE id IN (${sqlPlaceholders(uploadedIds)})`, [...uploadedIds])
            ctx.S({...ctx});
        }
    }
}