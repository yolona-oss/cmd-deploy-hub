export { type Network } from 'blockchain/types/network'

//export const configSign = object({
//    concurrency: number(),
//    bscscanAPIKey: string(),
//    motherShip: keyPair, // wallet whitch included in token transfering
//    transactionMinting: object({ // sending transaction fee config
//        maxGasPrice: string(),
//        gasLimit: string() // number or "auto" for calculating est min gas limits
//    }),
//
//    //transfer: object({
//    //    direction: enums([ "IN", "OUT" ]), // OUT cause sending from motherShip, IN - to motherShip
//    //    contract: optional(string()), // For all ERC-20 tokens. if unset transfers will be performed with native token
//    //    chain: optional(AvalibleChains), // Chain name acronim: "bsc", "eth"... default: "bsc"
//    //    amount: string(), // value or "all" for transfer all, zero cause fall throw
//    //}),
//    path: object({
//        storage: string(), // All files will be parsed
//        log: string(),
//    })
//})
//
//export type ConfigType = Infer<typeof configSign>;
