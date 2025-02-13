import * as mime from 'mime-types'
import download from 'download'
import * as crypt from 'crypto'
import { getConfig, getInitialConfig } from 'config'

import * as fs from 'fs'
import path from 'path'
import log from 'utils/logger'

import { File } from 'db'
import { genRandomString } from 'utils/random'

// TODO create associative mongoose model
const tmpDb = './index.json'

const defaults = [
    {
        name: "default-avatar",
        path: "static/manager-icon.png",
    }
]

class Files {
    static defaultsInited: boolean = false

    constructor() {
        this.copyDefaults();
    }

    private async checkDefaults() {
        const createDefault = async (name: string, path: string) => {
            const m_doc = await File.create({
                mime: "image/png",
                path,
                group: "static",
            })
            this.appendTmpDB({
                name,
                id: m_doc.id
            })
        }

        const cfg = getInitialConfig()
        const tmpDb = this.parseTmpDB()

        for (const def of defaults) {
            const entry = tmpDb.find(d => d.name === def.name)
            if (!entry) {
                await createDefault(def.name, path.join(cfg.server.fileStorage.path, def.path))
            }
        }
    }

    // remove
    private copyDefaults() {
        const cfg = getInitialConfig();
        try {
            const ico_path = path.join(
                cfg.server.fileStorage.path,
                "static", "manager-icon.png")
            const ico_static_path = path.join(
                "assets",
                "manager-icon.png")
            if (!fs.existsSync(ico_path)) {
                log.echo("Files::constructor() copying default manager icon...")
                if (!fs.existsSync(path.dirname(ico_path))) {
                    log.echo("Files::copyDefaults() creating default manager icon directory...")
                    fs.mkdirSync(path.dirname(ico_path), { recursive: true })
                }
                fs.copyFileSync(ico_static_path, ico_path)
            }
        } catch (e) {
            throw new Error(`Files::constructor() cannot copy default manager icon! ${JSON.stringify(e,null,4)} ${e}`)
        }
    }

    private parseTmpDB(): { name: string, id: string }[] {
        let obj
        try {
            obj = JSON.parse(fs.readFileSync(tmpDb).toString())
        } finally {
            return obj ?? []
        }
    }

    private appendTmpDB(d: { name: string, id: string }) {
        let current = this.parseTmpDB()
        current.push(d)
        fs.writeFileSync(tmpDb, JSON.stringify(current, null, 4))
    }

    async getFile(id: string) {
        return await File.findById(id)
    }

    async getFileByName(name: string) {
        return await File.findOne({ path: name })
    }

    async saveFile(url: string, group: string) {
        const cfg = await getConfig();

        const _mime = mime.lookup(url);
        const ext = _mime ? mime.extension(_mime) : null;
        const sufix = (ext ? "." + ext : "");
        const filename = genRandomString(10) + sufix;
        const path = cfg.server.fileStorage.path + '/' + filename;
        let res = await download(url, cfg.server.fileStorage.path, { filename: filename });

        let schema = {
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

    async getDefault(name: string) {
        if (!Files.defaultsInited) {
            await this.checkDefaults()
            Files.defaultsInited = true
        }

        const entry = this.parseTmpDB().find(f => f.name === name)
        if (!entry) {
            throw new Error("Files::getDefault() cannot find default file!")
        }
        return await this.getFile(entry.id)
    }

    async getDefaultAvatar() {
        return await this.getDefault("default-avatar")
    }
}

export const FilesWrapper = new Files();
