import express from 'express';
import { IRunnable } from 'types/runnable';
import { Application } from './app'

process.on('SIGTERM', () => {
    console.log('SIGTERM received');
});

export class TraiderServer implements IRunnable {
    private server?: any

    constructor() { }

    isRunning() {
        return this.server !== undefined;
    }

    async run() {
        const app = Application
        this.server = app.listen(4010, () => {
            console.log('Server started on port 4010');
        });
    }

    async terminate() {
        if (this.server) {
            this.server.close();
            this.server = undefined
        }
    }
}
