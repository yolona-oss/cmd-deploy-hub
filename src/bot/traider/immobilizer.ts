import { BaseImpl, ImplRegistry } from "./impl";

export class Immobilizer {
    impl: BaseImpl

    constructor(implName: string) {
        if (!ImplRegistry.Instance.has(implName)) {
            throw new Error(`Immobilizer::constructor() impl ${implName} not found`)
        }
        this.impl = ImplRegistry.Instance.get(implName)!
    }
}
