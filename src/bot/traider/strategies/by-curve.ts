import { IClonable } from "types/clonable";
import { BaseTraderStrategy } from "./base";
import { MasterTraderCtrl } from "../mtc";

export class ByCurveStrategy extends BaseTraderStrategy implements IClonable {
    constructor() {
        super("by-curve", "Trade strategy using generated curve to setup trades sequence")
    }

    clone() {
        return new ByCurveStrategy()
    }

    execute(mtc: MasterTraderCtrl<any, any, any>) {

    }
}
