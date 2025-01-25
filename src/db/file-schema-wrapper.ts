import * as mime from 'mime-types'
import download from 'download'
import * as crypt from 'crypto'
import { getConfig, getInitialConfig } from 'config'

import * as fs from 'fs'
import path from 'path'

import { File } from 'db'

class Files {
    constructor() {
        const cfg = getInitialConfig();
        try {
            const ico_path = path.join(
                cfg.server.fileStorage.path,
                "static/manager-icon.png")
            const ico_static_path = path.join(
                "assets",
                "manager-icon.png")
            if (!fs.existsSync(ico_path)) {
                fs.copyFileSync(ico_static_path, ico_path)
            }
        } catch (e) {
            throw new Error(`Files::constructor() cannot copy default manager icon! ${JSON.stringify(e,null,4)}`)
        }
    }

    async getFile(id: number) {
        return await File.findOne({ file_id: id });
    }

    async saveFile(url: string, group: string) {
        const cfg = await getConfig();

        const _mime = mime.lookup(url);
        const ext = _mime ? mime.extension(_mime) : null;
        const sufix = (ext ? "." + ext : "");
        // best string size: Number.MAX_INT ... TODO
        const filename = crypt.randomBytes(30).toString('hex').slice(0, 30) + sufix;
        const path = cfg.server.fileStorage.path + '/' + filename;
        let res = await download(url, cfg.server.fileStorage.path, { filename: filename });

        let schema = { //Number(crypt.randomInt(Number.MIN_SAFE_INTEGER+1, Number.MAX_SAFE_INTEGER-1)),
            id: Number(crypt.randomInt(281474976710655)),
            mime: mime.lookup(path) || "unknown",
            path: path,
            group: group
        }
        if (res) {
            await File.create(schema)
            return schema;
        } else {
            return null;
        }
    }

    async getDefaultAvatar() {
        const doc = await this.getFile(0);
        if (!doc) {
            const cfg = getInitialConfig()
            return await File.create({
                mime: "image/png",
                path: path.join(cfg.server.fileStorage.path, "static", "manager-icon.png"),
                group: "static",
            })
        }
        return doc
    }
}

export const FilesWrapper = new Files();
