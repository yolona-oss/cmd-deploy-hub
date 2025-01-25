import { BaseUIContext } from "ui/types";
import { AvailableUIsEnum } from "ui/types";

export interface CLIContext extends BaseUIContext {
    type: AvailableUIsEnum.CLI;
    userSession: {
        state: string;
        data: Record<string, any>;
    };
    text: string,
    reply(message: string): Promise<void>;
}
