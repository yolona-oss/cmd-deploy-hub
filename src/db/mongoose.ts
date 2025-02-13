import { getInitialConfig } from 'config';
import mongoose from 'mongoose';

import log from 'utils/logger'

export const MongoConnect = async (uri: string, options: any): Promise<void> => {
    try {
        log.echo("Connecting to mongoose...")
        await mongoose.connect(uri, options);
        log.echo("DB connected.")
    } catch (error) {
        log.error('Error connecting to MongoDB: ', error)
        process.exit(1);
    }
};
