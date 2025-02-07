import dotenv from 'dotenv'

//if (process.env.NODE_ENV === 'prod') {
//    dotenv.config({
//        path: `${process.env.npm_config_local_prefix}/.${process.env.NODE_ENV}.env`
//    })
//} else {
//    dotenv.config()
//}

export interface ConfigSchema {
    port: number,
    database: {
        connection_string: string,
        name: string;
    },
}

export default (): ConfigSchema => ({
    port: parseInt(<any>process.env.PORT, 10) || 4000,
    database: {
        connection_string: <string>process.env.DATABASE_CONNECTION_STRING,
        name: <string>process.env.DATABASE_NAME,
    },
})
