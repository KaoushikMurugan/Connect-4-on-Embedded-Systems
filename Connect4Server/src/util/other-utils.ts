// util stuff taken from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/node/shadow/index.ts

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
/**
 * Prints out `query` and waits for user input
 * @param query the string to print out
 * @returns a promise that resolves to the user input
 */
const prompt = (query: string) => new Promise(resolve => rl.question(query, resolve));
/**
 *
 * @param ms the number of milliseconds to sleep for
 * @returns a promise that resolves after `ms` milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export { prompt, sleep };
