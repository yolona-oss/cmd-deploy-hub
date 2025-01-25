export abstract class AbstractState<Ctx> {
    protected context?: Ctx

    public setContext(context: Ctx) {
        this.context = context
    }
}
