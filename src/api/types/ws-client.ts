import { IConnection } from "api/types/connection";
import log from 'utils/logger'

export interface IWebSocetClient extends IConnection { }

export class BaseWebSocetClient implements IWebSocetClient {
      private socket?: WebSocket;

    constructor(private uri: string) { }

    async connect(): Promise<void> {
        this.socket = new WebSocket(this.uri);

        this.socket.onopen = function(this: WebSocket, e: Event) {
            e
        }

        this.socket.onmessage = function(this: WebSocket, e: MessageEvent) {
            e
        }

        this.socket.onclose = function(this: WebSocket, e: CloseEvent) {
            e
        }

        this.socket.onerror = function(this: WebSocket, error: Event) {
            e
        }
    }

    async disconnect(): Promise<void> {
        if (this.socket) {
            this.socket.close();
            log.echo('WebSocket connection closed manually');
        } else {
            log.error('WebSocket client not connected');
        }
    }
}
