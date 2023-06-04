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
} from './iot-stuff';
import { prompt, sleep } from './util/other-utils';
import { build_direct_mqtt_connection } from './mqtt-stuff';

// Import Device Shadow Data jsons
import * as DeviceShadowInfo1 from '../Device1.shadowinfo.json';
import * as DeviceShadowInfo2 from '../Device2.shadowinfo.json';
import { Connect4Game } from './gameLogic';

async function main() {
    var shadow_property = 'GameData';

    var shadowLocalState1: ShadowLocalState = {
        value: null,
        property: shadow_property,
        update_complete: false
    };
    var shadowLocalState2: ShadowLocalState = {
        value: null,
        property: shadow_property,
        update_complete: false
    };

    // Intialize device shadow connections
    var connectionDevice1;
    var connectionDevice2;

    var deviceShadow1;
    var deviceShadow2;

    connectionDevice1 = build_direct_mqtt_connection(DeviceShadowInfo1);
    connectionDevice2 = build_direct_mqtt_connection(DeviceShadowInfo2);
    deviceShadow1 = new iotshadow.IotShadowClient(connectionDevice1);
    deviceShadow2 = new iotshadow.IotShadowClient(connectionDevice2);

    await connectionDevice1.connect();
    await connectionDevice2.connect();

    try {
        // subscribe to device 1 changes
        await sub_to_shadow_update(deviceShadow1, DeviceShadowInfo1);
        await sub_to_shadow_get(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await sub_to_shadow_delta(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);

        // subscribe to device 2 changes
        await sub_to_shadow_update(deviceShadow2, DeviceShadowInfo2);
        await sub_to_shadow_get(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);
        await sub_to_shadow_delta(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);

        // Get current shadows
        await get_current_shadow(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await get_current_shadow(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);

        await sleep(500); // wait half a second
        let game = new Connect4Game();
        let currentPlayer = 1;
        let winner = 0;
        game.resetGame();
        // Send the initial game state to the devices
        let data_to_send: any = {};
        data_to_send[shadow_property] = game.gameStateToJSON();
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

        while (true) {
            // * GAME LOOP STARTS HERE

            // Check if there is a winner
            if (winner !== 0) {
                console.log(`Player ${winner} won!`);
                break;
            }
            // TODO: replace console input with device shadow state check
            const userInput = await prompt(
                `Player ${currentPlayer}, enter the column you want to place your piece: `
            );
            if (userInput === 'quit') {
                break;
            } else {
                switch (userInput) {
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                    case '7':
                        if (game.playMove(parseInt(userInput) - 1, currentPlayer)) {
                            currentPlayer = game.getTurn();
                            winner = game.getWinner();
                        }
                        let data_to_send: any = {};

                        data_to_send[shadow_property] = game.gameStateToJSON();
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
                        await get_current_shadow(
                            deviceShadow1,
                            DeviceShadowInfo1,
                            shadowLocalState1
                        );
                        await get_current_shadow(
                            deviceShadow2,
                            DeviceShadowInfo2,
                            shadowLocalState2
                        );
                        break;
                    default:
                        console.log('Invalid input');
                }
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
