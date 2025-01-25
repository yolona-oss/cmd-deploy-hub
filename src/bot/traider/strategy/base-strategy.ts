import { BasePlatform } from "bot/traider/platform/base-platform"

export abstract class BaseStrategy {
    protected platform: BasePlatform;

    constructor(platform: BasePlatform) {
        this.platform = platform;
    }

    abstract execute(): Promise<void>;
}
