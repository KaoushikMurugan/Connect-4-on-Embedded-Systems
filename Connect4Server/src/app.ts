// Taken from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/node/shadow/index.ts

import { iotshadow } from 'aws-iot-device-sdk-v2';
//import { stringify } from 'querystring';
import { once } from 'events';
import yargs from 'yargs';
import {
    sub_to_shadow_update,
    sub_to_shadow_get,
    sub_to_shadow_delta,
    get_current_shadow,
    change_shadow_value,
    setShadowProperty,
    shadow_property
} from './iot-stuff';
import { Args, sleep } from './util/other-utils';

// The relative path is '../../util/cli_args' from here, but the compiled javascript file gets put one level
// deeper inside the 'dist' folder
const common_args = require('./util/cli_args');

yargs
    .command(
        '*',
        false,
        (yargs: any) => {
            common_args.add_direct_connection_establishment_arguments(yargs);
            common_args.add_shadow_arguments(yargs);
        },
        main
    )
    .parse();

async function main(argv: Args) {
    common_args.apply_sample_arguments(argv);

    setShadowProperty(argv.shadow_property);

    var connection;
    var client;
    var shadow;

    if (argv.mqtt5) {
        client = common_args.build_mqtt5_client_from_cli_args(argv);
        shadow = iotshadow.IotShadowClient.newFromMqtt5Client(client);

        const connectionSuccess = once(client, 'connectionSuccess');

        client.start();

        await connectionSuccess;
    } else {
        connection = common_args.build_connection_from_cli_args(argv);
        shadow = new iotshadow.IotShadowClient(connection);

        await connection.connect();
    }

    try {
        await sub_to_shadow_update(shadow, argv);
        await sub_to_shadow_get(shadow, argv);
        await sub_to_shadow_delta(shadow, argv);
        await get_current_shadow(shadow, argv);

        await sleep(500); // wait half a second

        // Take console input when this sample is not running in CI
        if (argv.is_ci == false) {
            while (true) {
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
                        data_to_send[shadow_property] = userInput;
                    }

                    await change_shadow_value(shadow, argv, data_to_send);
                    await get_current_shadow(shadow, argv);
                }
            }
        }
        // If this is running in CI, then automatically update the shadow
        else {
            var messages_sent = 0;
            while (messages_sent < 5) {
                let data_to_send: any = {};
                data_to_send[shadow_property] =
                    'Shadow_Value_' + messages_sent.toString();
                await change_shadow_value(shadow, argv, data_to_send);
                await get_current_shadow(shadow, argv);
                messages_sent += 1;
            }
        }
    } catch (error) {
        console.log(error);
    }

    console.log('Disconnecting..');

    if (connection) {
        await connection.disconnect();
    } else {
        let stopped = once(client, 'stopped');
        client.stop();
        await stopped;
        client.close();
    }

    // force node to wait a second before quitting to finish any promises
    await sleep(1000);
    console.log('Disconnected');
    // Quit NodeJS
    process.exit(0);
}
