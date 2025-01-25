export interface ScenarioState {
    step: number
    data: Record<string, any>
}

export interface Scenario {
    [key: string]: ScenarioState
}
