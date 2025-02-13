import { Account, Manager } from "db";
import { IRunnable } from "types/runnable";
import { EventEmitter, EventMap } from "utils/EventEmitter";
import { assignToCustomPath, getInterfacePathsWithTypes, isEmpty } from "utils/object";

export interface ICommandService extends IRunnable {
}

interface bcs_em<T> extends EventMap {
    message: T,
    error: string,
    done: void,
    liveLog: string
}

export abstract class BaseCommandService<CfgType extends Object, MsgType = string> extends EventEmitter<bcs_em<MsgType>> implements ICommandService {
    private isActive: boolean = false

    constructor(
        protected userId: string, // the user who execute this service
        protected config: CfgType,
        public readonly name: string = "common-cmd-hub-service",
    ) {
        super()
    }

    configEntries() {
        return getInterfacePathsWithTypes(this.config)
    }

    async initConfig(userId: string) {
        const user = (await Manager.findOne({userId}))!;
        const account = (await Account.findById(user.account))!;

        const accountConfig = await account.getModuleData<CfgType>(this.name, "")
        if (accountConfig && !isEmpty(accountConfig)) {
            this.config = accountConfig
        } else {
            await account.setModuleData(this.name, "", this.config)
        }
    }

    abstract clone(userId: string, newName?: string): BaseCommandService<CfgType, MsgType>

    async setConfigValue(forUserId: number, path: string, value: any) {
        const user = (await Manager.findOne({userId: forUserId}))!;
        const account = (await Account.findById(user.account))!;

        account.setModuleData(this.name, path, value)
        this.config = assignToCustomPath(this.config, path, value)
    }

    isRunning(): boolean {
        return this.isActive
    }

    async run(): Promise<void> {
        this.isActive = true
    }

    async terminate(): Promise<void> {
        this.isActive = false
        this.emit("done")
    }
}
