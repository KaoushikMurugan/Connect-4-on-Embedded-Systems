// util stuff taken from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/node/shadow/index.ts

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const prompt = (query: string) => new Promise(resolve => rl.question(query, resolve));
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export { rl, prompt, sleep };
