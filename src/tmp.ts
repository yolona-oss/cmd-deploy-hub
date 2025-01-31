import { randomizeWithScatter, genRandomNumberBetweenWithScatter, randomizeWithPercentScatter, genRandomNumberBetween } from 'utils/random'

function getRandomNumber(min: number | bigint, max: number | bigint): number | bigint {
    if (typeof min === 'number' && typeof max === 'number') {
        // Handle Number type
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (typeof min === 'bigint' && typeof max === 'bigint') {
        // Handle BigInt type
        const range = max - min + 1n;
        const randomBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        return min + (randomBits % range);
    } else {
        throw new Error("Both min and max must be of the same type (Number or BigInt)");
    }
}

for (let i = 0; i < 100; i++) {
    console.log(randomizeWithScatter(BigInt(1000000), BigInt(10)))
    //console.log(getRandomNumber(1000, 2000))
}
