import { ImplRegistry, MasterTraderCtrl, IBaseImpl } from "bot/traider";
import { BaseCommandService } from "services/command-service";

import { IBCPS_Config, defaultCfg } from "./pump.fun.config";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const serviceName = 'bound-curv-pump'

// "Trade strategy based on pumping token with a lot of buy swap txs on start of bounding curve creation.\
// Profit will be gained after 100% progress of the bounding curve reached.\
// Also bots will be hold tokens until their token volume bigger than volume in others wallets.",
export class BoundCurvPump_Robot extends BaseCommandService<IBCPS_Config> {
    private impl: IBaseImpl
    private master?: MasterTraderCtrl

    constructor(userId: string, config: Partial<IBCPS_Config> = defaultCfg, name: string = serviceName) {
        const _config = {...defaultCfg, ...config}
        super(
            userId,
            _config,
            name,
        )

        this.impl = ImplRegistry.Instance.get("pump.fun")!
    }
    
    clone(userId: string, newName: string = serviceName) {
        return new BoundCurvPump_Robot(userId, this.config, newName)
    }

    private async createSlaves() {
        for (let i = 0; i < this.config.traiders.count; i++) {
            this.master!.addSlave(this.impl.stc.clone(serviceName+"_slave_"+i+"_id", {
                    wallet: await this.impl.walletManager.createWallet()
                }))
        }
    }

    private async createHolders() {
        for (let i = 0; i < this.config.holders.count; i++) {
            this.master!.addSlave(this.impl.stc.clone(serviceName+"_holder_slave_"+i+"_id", {
                    wallet: await this.impl.walletManager.createWallet()
                }))
        }
    }

    private async distribute() {
        const createDistributeMap = (sols: number, count: number) => {
            const n = count
            const S = sols * LAMPORTS_PER_SOL
            const a1 = S / (n*2)
            const d = (2*S/(n*(n-1)) - 2*a1/(n-1))
            return new Array<bigint>(n).fill(0n).map((_, i) => {
                return BigInt(
                    Math.floor(
                        a1 + d*(i)
                    )
                )
            })
        }
        const distribute = async (publicKeys: string[], amountMap: bigint[]) => {
            return await this.impl.walletManager.distribute(
                {
                    secretKey: this.config.motherShip.secretKey
                },
                publicKeys.map((key, i) => ({
                    wallet: {
                        publicKey: key
                    },
                    amount: amountMap[i]
                }))
            )
        }

        // TODO check balance for rest
        const masterBalanceLamports = await this.impl.walletManager.balance(this.config.motherShip)

        const holdersDistributePercent = this.config.holders.hold.percentFromInfusion
        const holdersDistributeSol = this.config.initialBuy.solAmount * holdersDistributePercent / 100

        const holderDistMap = createDistributeMap(holdersDistributeSol, this.config.holders.count)
        const traiderDistMap = createDistributeMap(this.config.initialBuy.solAmount-holdersDistributeSol, this.config.traiders.count)

        const holdersWallets = this.master!.Slaves.filter(s => s.id.includes("_holder_")).map(s => s.Wallet)
        const traidersWallets = this.master!.Slaves.filter(s => !s.id.includes("_holder_")).map(s => s.Wallet)

        await distribute(holdersWallets.map(s => s.publicKey), holderDistMap)
        await distribute(traidersWallets.map(s => s.publicKey), traiderDistMap)
    }

    async run() {
        await this.initConfig(this.userId)

        this.master = this.impl.mtc.clone(serviceName+"_master_id", this.config.targetAsset, [])
        await this.createSlaves()
        await this.createHolders()
        await this.distribute()

        super.run()
    }

    async terminate() {

        super.terminate()
    }
}
