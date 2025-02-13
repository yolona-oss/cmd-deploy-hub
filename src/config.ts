import * as fs from 'fs'
import { min, pattern, Infer, assert, boolean, object, number, string } from 'superstruct'
import { readFileSync } from 'fs'
import log from 'utils/logger'
import { main_config_path } from 'constants/path'
import Path from 'path'
import AsyncLock from 'async-lock';

const lock = new AsyncLock();

function writeConfig(newConfig: Infer<typeof ConfigSign>) {
    fs.writeFileSync(
        main_config_path,
        JSON.stringify(newConfig, null, " ".repeat(4))
    )
}

function parseConfig() {
    let config;
    try {
        config = JSON.parse(readFileSync(main_config_path).toString());
    } catch(e) {
        throw new Error("Config parse error: " + e);
    }

    assert(config, ConfigSign);

    return config
}

const keyPairSign = object({
    publicKey: string(),
    privateKey: string()
})

const ConfigSign = object({
    bot: object({
        token: pattern(string(), /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/),
        admin_id: number(),
        name: string(),
    }),

    server: object({
        ngrok: object({
            authtoken: string()
        }),

        database: object({
            mongoose: object({
                connectionUri: string(),
                connectionOptions: object(),
            }),
            path: string(),
        }),

        fileStorage: object({
            public_path: string(),
            path: string(),
        }),

        port: min(number(), 1000),
        uri: string(),
    }),

    log_level: string(),

    wallet: keyPairSign
})

if (!fs.existsSync(main_config_path)) {
    log.echo("Creating config with default params")
    let default_cfg: ConfigType = {
        bot: {
            token: "",
            admin_id: 0,
            name: "Barebuh"
        },

        server: {
            ngrok: {
                authtoken: ""
            },

            database: {
                mongoose: {
                    connectionUri: "mongodb://localhost:27017/",
                    connectionOptions: {
                        dbName: "cmd-deploy-hub-v1"
                    }
                },
                path: "./storage",
            },

            fileStorage: {
                public_path: Path.join("storage", "static"),
                path: Path.join("storage", "files"),
            },

            port: 7999,

            uri: 'http://localhost:7999',
        },

        log_level: "trace",

        wallet: {
            publicKey: "",
            privateKey: ""
        },
    }

    writeConfig(default_cfg)
}

type ConfigType = Infer<typeof ConfigSign>;

async function loadConfig(): Promise<ConfigType> {
    return await lock.acquire('config', async () => {
        return parseConfig();
    });
}

export function updateConfig(newConfig: Partial<ConfigType>): Promise<void> {
    return lock.acquire('config', async () => {
        let updatingConfig = loadConfig();
        updatingConfig = { ...updatingConfig, ...newConfig };
        assert(updatingConfig, ConfigSign);
        writeConfig(updatingConfig);
    })
}

let configPromise = loadConfig();

export async function getConfig(): Promise<ConfigType> {
    return await configPromise;
}

export function getInitialConfig() {
    return parseConfig();
}
