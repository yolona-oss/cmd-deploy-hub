import { LiquidityPoolKeysV4, MARKET_STATE_LAYOUT_V3, Market, TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { Connection, Logs, ParsedInnerInstruction, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;

const connection = new Connection(RPC_ENDPOINT);
const seenTransactions : Array<string> = []; // The log listener is sometimes triggered multiple times for a single transaction, don't react to tranasctions we've already seen

subscribeToNewRaydiumPools();


function subscribeToNewRaydiumPools() : void
{
    connection.onLogs(new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async (txLogs: Logs) => {
        if (seenTransactions.includes(txLogs.signature)) {
            return;
        }
        seenTransactions.push(txLogs.signature);
        if (!findLogEntry('init_pc_amount', txLogs.logs)) {
            return; // If "init_pc_amount" is not in log entries then it's not LP initialization transaction
        }
        const poolKeys = await fetchPoolKeysForLPInitTransactionHash(txLogs.signature); // With poolKeys you can do a swap
        console.log(poolKeys);
    });
    console.log('Listening to new pools...');
}

function findLogEntry(needle: string, logEntries: Array<string>) : string|null
{
    for (let i = 0; i < logEntries.length; ++i) {
        if (logEntries[i].includes(needle)) {
            return logEntries[i];
        }
    }

    return null;
}

async function fetchPoolKeysForLPInitTransactionHash(txSignature: string) : Promise<LiquidityPoolKeysV4>
{
    const tx = await connection.getParsedTransaction(txSignature, {maxSupportedTransactionVersion: 0});
    if (!tx) {
        throw new Error('Failed to fetch transaction with signature ' + txSignature);
    }
    const poolInfo = parsePoolInfoFromLpTransaction(tx);
    const marketInfo = await fetchMarketInfo(poolInfo.marketId);

    return {
        id: poolInfo.id,
        baseMint: poolInfo.baseMint,
        quoteMint: poolInfo.quoteMint,
        lpMint: poolInfo.lpMint,
        baseDecimals: poolInfo.baseDecimals,
        quoteDecimals: poolInfo.quoteDecimals,
        lpDecimals: poolInfo.lpDecimals,
        version: 4,
        programId: poolInfo.programId,
        authority: poolInfo.authority,
        openOrders: poolInfo.openOrders,
        targetOrders: poolInfo.targetOrders,
        baseVault: poolInfo.baseVault,
        quoteVault: poolInfo.quoteVault,
        withdrawQueue: poolInfo.withdrawQueue,
        lpVault: poolInfo.lpVault,
        marketVersion: 3,
        marketProgramId: poolInfo.marketProgramId,
        marketId: poolInfo.marketId,
        marketAuthority: Market.getAssociatedAuthority({programId: poolInfo.marketProgramId, marketId: poolInfo.marketId}).publicKey,
        marketBaseVault: marketInfo.baseVault,
        marketQuoteVault: marketInfo.quoteVault,
        marketBids: marketInfo.bids,
        marketAsks: marketInfo.asks,
        marketEventQueue: marketInfo.eventQueue,
    } as LiquidityPoolKeysV4;
}

async function fetchMarketInfo(marketId: PublicKey) {
    const marketAccountInfo = await connection.getAccountInfo(marketId);
    if (!marketAccountInfo) {
        throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
    }
    
    return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
}


function parsePoolInfoFromLpTransaction(txData: ParsedTransactionWithMeta) 
{
    const initInstruction = findInstructionByProgramId(txData.transaction.message.instructions, new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as PartiallyDecodedInstruction|null;
    if (!initInstruction) {
        throw new Error('Failed to find lp init instruction in lp init tx');
    }
    const baseMint = initInstruction.accounts[8];
    const baseVault = initInstruction.accounts[10]; 
    const quoteMint = initInstruction.accounts[9];
    const quoteVault = initInstruction.accounts[11];
    const lpMint = initInstruction.accounts[7];
    const baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
    const lpMintInitInstruction = findInitializeMintInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
    if (!lpMintInitInstruction) {
        throw new Error('Failed to find lp mint init instruction in lp init tx');
    }
    const lpMintInstruction = findMintToInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
    if (!lpMintInstruction) {
        throw new Error('Failed to find lp mint to instruction in lp init tx');
    }
    const baseTransferInstruction = findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], baseVault, TOKEN_PROGRAM_ID);
    if (!baseTransferInstruction) {
        throw new Error('Failed to find base transfer instruction in lp init tx');
    }
    const quoteTransferInstruction = findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], quoteVault, TOKEN_PROGRAM_ID);
    if (!quoteTransferInstruction) {
        throw new Error('Failed to find quote transfer instruction in lp init tx');
    }
    const lpDecimals = lpMintInitInstruction.parsed.info.decimals;
    const lpInitializationLogEntryInfo = extractLPInitializationLogEntryInfoFromLogEntry(findLogEntry('init_pc_amount', txData.meta?.logMessages ?? []) ?? '');
    const basePreBalance = (txData.meta?.preTokenBalances ?? []).find(balance => balance.mint === baseMint.toBase58());
    if (!basePreBalance) {
        throw new Error('Failed to find base tokens preTokenBalance entry to parse the base tokens decimals');
    }
    const baseDecimals = basePreBalance.uiTokenAmount.decimals;

    return {
        id: initInstruction.accounts[4],
        baseMint,
        quoteMint,
        lpMint,
        baseDecimals: baseAndQuoteSwapped ? SOL_DECIMALS : baseDecimals,
        quoteDecimals: baseAndQuoteSwapped ? baseDecimals : SOL_DECIMALS,
        lpDecimals,
        version: 4,
        programId: new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID),
        authority: initInstruction.accounts[5],
        openOrders: initInstruction.accounts[6],
        targetOrders: initInstruction.accounts[13],
        baseVault,
        quoteVault,
        withdrawQueue: new PublicKey("11111111111111111111111111111111"),
        lpVault: new PublicKey(lpMintInstruction.parsed.info.account),
        marketVersion: 3,
        marketProgramId: initInstruction.accounts[15],
        marketId: initInstruction.accounts[16],
        baseReserve: parseInt(baseTransferInstruction.parsed.info.amount),
        quoteReserve: parseInt(quoteTransferInstruction.parsed.info.amount),
        lpReserve: parseInt(lpMintInstruction.parsed.info.amount),
        openTime: lpInitializationLogEntryInfo.open_time,
    }
}

function findTransferInstructionInInnerInstructionsByDestination(innerInstructions: Array<ParsedInnerInstruction>, destinationAccount : PublicKey, programId?: PublicKey) : ParsedInstruction|null
{
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
            if (!instruction.parsed) {continue};
            if (instruction.parsed.type === 'transfer' && instruction.parsed.info.destination === destinationAccount.toBase58() && (!programId || instruction.programId.equals(programId))) {
                return instruction;
            }
        }
    }

    return null;
}

function findInitializeMintInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey) : ParsedInstruction|null
{
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
            if (!instruction.parsed) {continue};
            if (instruction.parsed.type === 'initializeMint' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }

    return null;
}

function findMintToInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey) : ParsedInstruction|null
{
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
            if (!instruction.parsed) {continue};
            if (instruction.parsed.type === 'mintTo' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }

    return null;
}

function findInstructionByProgramId(instructions: Array<ParsedInstruction|PartiallyDecodedInstruction>, programId: PublicKey) : ParsedInstruction|PartiallyDecodedInstruction|null
{
    for (let i = 0; i < instructions.length; i++) {
        if (instructions[i].programId.equals(programId)) {
            return instructions[i];
        }
    }

    return null;
}

function extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry: string) : {nonce: number, open_time: number, init_pc_amount: number, init_coin_amount: number} {
    const lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');

    return JSON.parse(fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
}

function fixRelaxedJsonInLpLogEntry(relaxedJson: string) : string
{
    return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
}
