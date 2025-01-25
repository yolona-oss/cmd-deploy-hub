import { IManager } from "db"
import { AvailableUIsType } from "ui/types"

export abstract class BaseUIContext {
    abstract type: AvailableUIsType
    abstract manager?: IManager & { userId: number|string }
    abstract text?: string
}
