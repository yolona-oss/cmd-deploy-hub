import { IManager } from "db";
import { BaseUIContext } from "ui/types";
import { AvailableUIsEnum } from "ui/types";

export interface CLIContext extends BaseUIContext {
    type: AvailableUIsEnum.CLI;
    manager?: IManager & { userId: number|string }
    userSession: {
        state: string;
        data: Record<string, any>;
    };
    text: string,
    reply(message: string): Promise<void>;
}
