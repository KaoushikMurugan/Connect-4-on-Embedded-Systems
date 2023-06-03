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
        // mqtt device 1
        await sub_to_shadow_update(deviceShadow1, DeviceShadowInfo1);
        await sub_to_shadow_get(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await sub_to_shadow_delta(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        await get_current_shadow(deviceShadow1, DeviceShadowInfo1, shadowLocalState1);
        // mqtt device 2
        await sub_to_shadow_update(deviceShadow2, DeviceShadowInfo2);
        await sub_to_shadow_get(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);
        await sub_to_shadow_delta(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);
        await get_current_shadow(deviceShadow2, DeviceShadowInfo2, shadowLocalState2);

        // Get current shadows

        await sleep(500); // wait half a second

        while (true) {
            // * GAME LOOP STARTS HERE

            const userInput = await prompt('Enter desired value: ');
            if (userInput === 'quit') {
                break;
            } else {
                let data_to_send: any = {};

                if (userInput == 'clear_shadow') {
                    data_to_send = null;
                } else if (userInput == 'null') {
                    data_to_send[shadow_property] = null;
                } else {
                    data_to_send[shadow_property] = {
                        Board: [
                            [1, 1, 0, 1, 0, 1, 1],
                            [1, 1, 1, 1, 1, 1, 1],
                            [1, 1, 1, 1, 1, 1, 1]
                        ],
                        'Current Turn': 2,
                        Winner: -1
                    };
                }

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
            }
        }
    } catch (error) {
        console.log(error);
    }

    console.log('Disconnecting..');

    if (connectionDevice1) {
        await connectionDevice1.disconnect();
    }
    // if (connectionDevice2) {
    //     await connectionDevice2.disconnect();
    // }

    // force node to wait a second before quitting to finish any promises
    await sleep(1000);
    console.log('Disconnected');
    // Quit NodeJS
    process.exit(0);
}

main();
