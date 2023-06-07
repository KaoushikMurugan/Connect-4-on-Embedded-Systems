// Taken from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/node/shadow/index.ts

import { iotshadow } from 'aws-iot-device-sdk-v2';
// import { stringify } from 'querystring';
// import { once } from 'events';
import {
    sub_to_shadow_update,
    sub_to_shadow_get,
    sub_to_shadow_delta,
    get_current_shadow,
    change_shadow_value,
    ShadowLocalState
} from './iot-event-stuff';
import { build_direct_mqtt_connection } from './mqtt-stuff';

// Import Device Shadow Data jsons
import * as DeviceShadowInfo1 from '../Device1.shadowinfo.json';
import * as DeviceShadowInfo2 from '../Device2.shadowinfo.json';
import { Connect4Game, GameState } from './game-logic';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    var shadow_property = 'GameData';
    var shadow_input_property = 'PlayerInput';

    var shadowLocalState1: ShadowLocalState = {
        value: null,
        property: shadow_property,
        inputProperty: shadow_input_property,
        updateComplete: false,
        playerInput: 0,
        playerInputTimestamp: -1,
        playerInputUsed: true,
        ready: 0
    };
    var shadowLocalState2: ShadowLocalState = {
        value: null,
        property: shadow_property,
        inputProperty: shadow_input_property,
        updateComplete: false,
        playerInput: 0,
        playerInputTimestamp: -1,
        playerInputUsed: true,
        ready: 0
    };

    // Intialize device shadow connections
    var connectionDevice1;
    var connectionDevice2;

    connectionDevice1 = build_direct_mqtt_connection(DeviceShadowInfo1);
    connectionDevice2 = build_direct_mqtt_connection(DeviceShadowInfo2);
    var deviceShadow1 = new iotshadow.IotShadowClient(connectionDevice1);
    var deviceShadow2 = new iotshadow.IotShadowClient(connectionDevice2);

    await connectionDevice1.connect();
    await connectionDevice2.connect();

    try {
        // subscribe to device 1 changes
        await sub_to_shadow_update(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await sub_to_shadow_get(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await sub_to_shadow_delta(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);

        // subscribe to device 2 changes
        await sub_to_shadow_update(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);
        await sub_to_shadow_get(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);
        await sub_to_shadow_delta(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);

        // Get current shadows
        await get_current_shadow(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await get_current_shadow(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);

        await sleep(500); // wait half a second
        let game = new Connect4Game();
        game.resetGame(); // redundent, but just in case
        // Send the initial game state to the devices
        let data_to_send: any = {};
        data_to_send[shadow_property] = game.gameStateToJSON(0);

        async function updateAndGetShadows(playerInput: number) {
            let data_to_send: any = {};
            data_to_send[shadow_property] = game.gameStateToJSON(playerInput);
            // Change the shadow state
            await change_shadow_value(
                deviceShadow1,
                DeviceShadowInfo1,
                shadowLocalState1,
                data_to_send
            );
            await change_shadow_value(
                deviceShadow2,
                DeviceShadowInfo2,
                shadowLocalState2,
                data_to_send
            );
            // Get the current shadow state
            await get_current_shadow(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
            await get_current_shadow(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);
        }

        // Change the shadow state
        updateAndGetShadows(0);

        let sentMessage = false;

        let readyResetBoard = false;

        let sentGameOver = false;

        let ready: number = 0;
        // if 0 - no-one is ready
        // if 1 - player 1 is ready
        // if 2 - player 2 is ready
        // if 3 - both players are ready

        // wait for both devices to be ready

        while (true) {
            // * GAME LOOP STARTS HERE

            // Wait for both devices to be ready

            await sleep(500); // wait half a second

            // Check if there is a winner
            if (game.getWinner() !== 0 && sentGameOver == false) {
                console.log(`Player ${game.getWinner()} won!`);
                // game.setGameState(GameState.GameOver);
                ready = 0;
                updateAndGetShadows(0);
                sentGameOver = true;
                readyResetBoard = false;
            }

            if (sentMessage == false) {
                if (ready === 3) {
                    console.log(
                        `Waiting for Player ${game.getCurrentPlayer()} to make a move`
                    );
                    sentMessage = true;
                } else {
                    console.log('Waiting for both players to be ready');
                    sentMessage = true;
                }
            }

            let playerInput: number = 0;

            // ready checks
            if (ready !== 3) {
                if (
                    ready !== 1 &&
                    !shadowLocalState1.playerInputUsed &&
                    shadowLocalState1.playerInput === -1
                ) {
                    shadowLocalState1.playerInputUsed = true;
                    shadowLocalState1.ready = 1;
                    ready += 1;
                    console.log('Player 1 is ready ' + ready);
                    sentMessage = false;
                } else if (
                    ready !== 2 &&
                    !shadowLocalState2.playerInputUsed &&
                    shadowLocalState2.playerInput === -1
                ) {
                    shadowLocalState1.playerInputUsed = true;
                    shadowLocalState2.ready = 1;
                    ready += 2;
                    console.log('Player 2 is ready ' + ready);
                    sentMessage = false;
                }
            }

            if (ready === 3) {
                // console.log('Both players are ready');
                if (readyResetBoard === false) {
                    game.resetGame();
                    game.setGameState(GameState.Playing);
                    updateAndGetShadows(0);
                    readyResetBoard = true;
                    sentGameOver = false;
                }
            }

            // new input checks
            if (game.getCurrentPlayer() === 1) {
                if (shadowLocalState1.playerInputUsed) {
                    // console.log("no new input detected for player 1");
                    continue;
                } else {
                    playerInput = shadowLocalState1.playerInput;
                    console.log('Player 1 input: ' + playerInput);
                }
            } else if (game.getCurrentPlayer() === 2) {
                if (shadowLocalState2.playerInputUsed) {
                    // console.log("no new input detected for player 2");
                    continue;
                } else {
                    playerInput = shadowLocalState2.playerInput;
                    console.log('Player 2 input: ' + playerInput);
                }
            } else {
                console.log('Invalid player');
                break;
            }

            switch (playerInput) {
                // * For Later
                // case -2:
                //     // -2 means restart game
                //     game.resetGame();
                //     // Send the initial game state to the devices
                //     updateAndGetShadows(0);
                //     break;
                case -1:
                    // -1 ready input
                    break;
                case 0:
                    // 0 means waiting for input
                    break;
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    if (game.playMove(playerInput - 1)) {
                        sentMessage = false;
                        // update state to let it know that the player input was used
                        if (game.getCurrentPlayer() === 1) {
                            shadowLocalState1.playerInputUsed = true;
                        } else if (game.getCurrentPlayer() === 2) {
                            shadowLocalState2.playerInputUsed = true;
                        }
                        updateAndGetShadows(0);
                    } else {
                        console.log('Invalid move');
                        if (game.getCurrentPlayer() === 1) {
                            shadowLocalState1.playerInputUsed = true;
                        } else if (game.getCurrentPlayer() === 2) {
                            shadowLocalState2.playerInputUsed = true;
                        }
                        updateAndGetShadows(0);
                    }
                    break;
                default:
                    console.log('Invalid input');
                    if (game.getCurrentPlayer() === 1) {
                        shadowLocalState1.playerInputUsed = true;
                    } else if (game.getCurrentPlayer() === 2) {
                        shadowLocalState2.playerInputUsed = true;
                    }
                    updateAndGetShadows(0);
            }
        }
    } catch (error) {
        console.log(error);
    }

    console.log('Disconnecting..');

    if (connectionDevice1) {
        await connectionDevice1.disconnect();
    }
    if (connectionDevice2) {
        await connectionDevice2.disconnect();
    }

    // force node to wait a second before quitting to finish any promises
    await sleep(1000);
    console.log('Disconnected');
    // Quit NodeJS
    process.exit(0);
}

main();
