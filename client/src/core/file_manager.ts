const baseUrl = "http://127.0.0.1:3000";

export const UploadFile = async (projectId: string, folder: string, file: File) => {
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

export const DownloadFile = async (projectId: string, folder: string, filename: string) => {
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

            return file;
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

export const GetOrDownloadFile = async (projectId: string, folder: string, filename: string) => {
    try {
        const opfsRoot = await navigator.storage.getDirectory();
        const projectsFolder = await opfsRoot.getDirectoryHandle("projects", { create: true });
        const thisProjectFolder = await projectsFolder.getDirectoryHandle(projectId, { create: true });
        const requestedFolder = await thisProjectFolder.getDirectoryHandle(folder, { create: true });
        
        const fileHandle = await requestedFolder.getFileHandle(filename);
        const file = await fileHandle.getFile();

        return file;
    } catch (e) {
        if (e instanceof DOMException) {
            if (e.NOT_FOUND_ERR) {
                try {
                    const file = await DownloadFile(projectId, folder, filename);
                    return file;
                } catch (e) {
                    console.error(e);
                    return null;
                }
            }
        }

        console.error(e);
        return null;
    }
}