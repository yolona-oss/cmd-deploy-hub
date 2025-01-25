import { BaseUIContext } from "ui/types";
import { AvailableUIsEnum } from "ui/types";

export interface CLIContext extends BaseUIContext {
    type: AvailableUIsEnum.CLI;
    userInput: string;
    userSession: {
        state: string;
        data: Record<string, any>;
    };
    sendOutput: (output: string) => void; // Mock reply function
}
