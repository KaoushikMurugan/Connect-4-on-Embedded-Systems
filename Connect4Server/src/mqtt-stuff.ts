// Modified function from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/util/cli_args.js
// but using json args instead of command line args

import { DeviceShadowInfo } from './device-shadow-data';

const awscrt = require('aws-crt');
const http = awscrt.http;
const iot = awscrt.iot;
const mqtt = awscrt.mqtt;

/**
 * Build a direct mqtt connection using mtls, (http) proxy optional
 * @param deviceShadowInfo
 * @returns a direct mqtt connection object
 */
function build_direct_mqtt_connection(deviceShadowInfo: DeviceShadowInfo) {
    let config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(
        deviceShadowInfo.certificate_path,
        deviceShadowInfo.private_key_path
    );

    if (deviceShadowInfo.proxy_host) {
        config_builder.with_http_proxy_options(
            new http.HttpProxyOptions(
                deviceShadowInfo.proxy_host,
                deviceShadowInfo.proxy_port
            )
        );
    }

    if (deviceShadowInfo.root_ca_path != null) {
        config_builder.with_certificate_authority_from_path(
            undefined,
            deviceShadowInfo.root_ca_path
        );
    }

    config_builder.with_clean_session(false);
    config_builder.with_client_id(
        deviceShadowInfo.client_id || 'test-' + Math.floor(Math.random() * 100000000)
    );
    config_builder.with_endpoint(deviceShadowInfo.endpoint);
    const config = config_builder.build();

    const client = new mqtt.MqttClient();
    return client.new_connection(config);
}

export { build_direct_mqtt_connection };
