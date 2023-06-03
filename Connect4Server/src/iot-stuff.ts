// taken from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/node/shadow/index.ts

import { mqtt, iotshadow } from 'aws-iot-device-sdk-v2';
import { DeviceShadowData } from './device-shadow-data';

type ShadowMQTTStates = {
    value: unknown;
    property: string;
    update_complete: boolean;
};

async function sub_to_shadow_update(
    shadow: iotshadow.IotShadowClient,
    deviceShadowData: DeviceShadowData
) {
    return new Promise(async (resolve, reject) => {
        try {
            function updateAccepted(
                error?: iotshadow.IotShadowError,
                response?: iotshadow.model.UpdateShadowResponse
            ) {
                console.log('\nReceived shadow update event.');
                if (response) {
                    if (response.clientToken !== undefined) {
                        console.log(
                            'Succcessfully updated shadow for clientToken: ' +
                                response.clientToken +
                                '.'
                        );
                    } else {
                        console.log('Succcessfully updated shadow.');
                    }
                    if (response.state?.desired !== undefined) {
                        console.log(
                            '\t desired state: ' + JSON.stringify(response.state.desired)
                        );
                    }
                    if (response.state?.reported !== undefined) {
                        console.log(
                            '\t reported state: ' +
                                JSON.stringify(response.state.reported)
                        );
                    }
                }

                if (error || !response) {
                    console.log('Updated shadow is missing the target property.');
                }
                resolve(true);
            }

            function updateRejected(
                error?: iotshadow.IotShadowError,
                response?: iotshadow.model.ErrorResponse
            ) {
                if (response) {
                    console.log('Update request was rejected.');
                }

                if (error) {
                    console.log('Error occurred..');
                }
                reject(error);
            }

            console.log(`Subscribing to ${deviceShadowData.thing_name} Update events..`);
            const updateShadowSubRequest: iotshadow.model.UpdateNamedShadowSubscriptionRequest =
                {
                    shadowName: deviceShadowData.shadow_name,
                    thingName: deviceShadowData.thing_name
                };

            // console.log(JSON.stringify(shadow));

            await shadow.subscribeToUpdateShadowAccepted(
                updateShadowSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => updateAccepted(error, response)
            );

            await shadow.subscribeToUpdateShadowRejected(
                updateShadowSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => updateRejected(error, response)
            );

            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

async function sub_to_shadow_get(
    shadow: iotshadow.IotShadowClient,
    deviceShadowData: DeviceShadowData,
    shadowMQTTState: ShadowMQTTStates
) {
    return new Promise(async (resolve, reject) => {
        try {
            function getAccepted(
                error?: iotshadow.IotShadowError,
                response?: iotshadow.model.GetShadowResponse
            ) {
                if (response?.state) {
                    if (response?.state.delta) {
                        const value = response.state.delta;
                        if (value) {
                            console.log(
                                "Shadow contains delta value '" +
                                    JSON.stringify(value) +
                                    "'."
                            );
                            change_shadow_value(
                                shadow,
                                deviceShadowData,
                                shadowMQTTState,
                                value
                            );
                        }
                    }
                    if (response?.state.reported) {
                        const value_any: any = response.state.reported;
                        if (value_any) {
                            let found_property = false;
                            for (var prop in value_any) {
                                if (prop === shadowMQTTState.property) {
                                    found_property = true;
                                    console.log(
                                        "Shadow contains '" +
                                            prop +
                                            "'. Reported value: '" +
                                            String(value_any[prop]) +
                                            "'."
                                    );
                                    break;
                                }
                            }
                            if (found_property === false) {
                                console.log(
                                    "Shadow does not contain '" +
                                        shadowMQTTState.property +
                                        "' property."
                                );
                            }
                        }
                    }
                }

                if (error || !response) {
                    console.log('Error occurred..');
                }
                shadowMQTTState.update_complete = true;
                resolve(true);
            }

            function getRejected(
                error?: iotshadow.IotShadowError,
                response?: iotshadow.model.ErrorResponse
            ) {
                if (response) {
                    console.log('In getRejected response.');
                }

                if (error) {
                    console.log('Error occurred..');
                }

                shadowMQTTState.update_complete = true;
                reject(error);
            }

            console.log(`Subscribing to ${deviceShadowData.thing_name} Get events..`);
            const getShadowSubRequest: iotshadow.model.GetShadowSubscriptionRequest = {
                thingName: deviceShadowData.thing_name
            };

            await shadow.subscribeToGetShadowAccepted(
                getShadowSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => getAccepted(error, response)
            );

            await shadow.subscribeToGetShadowRejected(
                getShadowSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => getRejected(error, response)
            );

            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

async function sub_to_shadow_delta(
    shadow: iotshadow.IotShadowClient,
    deviceShadowData: DeviceShadowData,
    shadowMQTTState: ShadowMQTTStates
) {
    return new Promise(async (resolve, reject) => {
        try {
            function deltaEvent(
                _error?: iotshadow.IotShadowError,
                response?: iotshadow.model.GetShadowResponse
            ) {
                console.log('\nReceived shadow delta event.');

                if (response?.clientToken != null) {
                    console.log('  ClientToken: ' + response.clientToken);
                }

                if (response?.state !== null) {
                    let value_any: any = response?.state;
                    if (value_any === null || value_any === undefined) {
                        console.log(
                            "Delta reports that '" +
                                shadowMQTTState.property +
                                "' was deleted. Resetting defaults.."
                        );
                        let data_to_send: any = {};
                        data_to_send[shadowMQTTState.property] = shadowMQTTState.value;
                        change_shadow_value(
                            shadow,
                            deviceShadowData,
                            shadowMQTTState,
                            data_to_send
                        );
                    } else {
                        if (value_any[shadowMQTTState.property] !== undefined) {
                            if (
                                value_any[shadowMQTTState.property] !==
                                shadowMQTTState.value
                            ) {
                                console.log(
                                    "Delta reports that desired value is '" +
                                        value_any[shadowMQTTState.property] +
                                        "'. Changing local value.."
                                );
                                let data_to_send: any = {};
                                data_to_send[shadowMQTTState.property] =
                                    value_any[shadowMQTTState.property];
                                change_shadow_value(
                                    shadow,
                                    deviceShadowData,
                                    shadowMQTTState,
                                    data_to_send
                                );
                            } else {
                                console.log(
                                    "Delta did not report a change in '" +
                                        shadowMQTTState.property +
                                        "'."
                                );
                            }
                        } else {
                            console.log('Desired value not found in delta. Skipping..');
                        }
                    }
                } else {
                    console.log(
                        "Delta did not report a change in '" +
                            shadowMQTTState.property +
                            "'."
                    );
                }

                resolve(true);
            }

            console.log(`Subscribing to ${deviceShadowData.thing_name} Delta events..`);
            const deltaShadowSubRequest: iotshadow.model.ShadowDeltaUpdatedSubscriptionRequest =
                {
                    thingName: deviceShadowData.thing_name
                };

            await shadow.subscribeToShadowDeltaUpdatedEvents(
                deltaShadowSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => deltaEvent(error, response)
            );

            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

async function get_current_shadow(
    shadow: iotshadow.IotShadowClient,
    deviceShadowData: DeviceShadowData,
    shadowMQTTState: ShadowMQTTStates
) {
    return new Promise(async (resolve, reject) => {
        try {
            const getShadow: iotshadow.model.GetShadowRequest = {
                thingName: deviceShadowData.thing_name
            };

            shadowMQTTState.update_complete = false;
            console.log(
                `Requesting current shadow state for ${deviceShadowData.thing_name}..`
            );
            shadow.publishGetShadow(getShadow, mqtt.QoS.AtLeastOnce);

            await get_current_shadow_update_wait(shadowMQTTState);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

async function get_current_shadow_update_wait(shadowMQTTState: ShadowMQTTStates) {
    // Wait until shadow_update_complete is true, showing the result returned
    return await new Promise(resolve => {
        const interval = setInterval(() => {
            if (shadowMQTTState.update_complete == true) {
                resolve(true);
                clearInterval(interval);
            }
        }, 200);
    });
}

function change_shadow_value(
    shadow: iotshadow.IotShadowClient,
    deviceShadowData: DeviceShadowData,
    shadowMQTTState: ShadowMQTTStates,
    new_value?: object
) {
    return new Promise(async (resolve, reject) => {
        try {
            if (typeof new_value !== 'undefined') {
                let new_value_any: any = new_value;
                let skip_send = false;

                if (new_value_any !== null) {
                    if (
                        new_value_any[shadowMQTTState.property] == shadowMQTTState.value
                    ) {
                        skip_send = true;
                    }
                }
                if (skip_send == false) {
                    if (new_value_any === null) {
                        shadowMQTTState.value = new_value_any;
                    } else {
                        shadowMQTTState.value = new_value_any[shadowMQTTState.property];
                    }

                    console.log(
                        "Changed local shadow value to '" + shadowMQTTState.value + "'."
                    );

                    var updateShadow: iotshadow.model.UpdateShadowRequest = {
                        state: {
                            desired: new_value,
                            reported: new_value
                        },
                        thingName: deviceShadowData.thing_name
                    };

                    await shadow.publishUpdateShadow(updateShadow, mqtt.QoS.AtLeastOnce);

                    console.log('Update request published.');
                }
            }
        } catch (error) {
            console.log('Failed to publish update request.');
            reject(error);
        }
        resolve(true);
    });
}

export {
    ShadowMQTTStates,
    sub_to_shadow_update,
    sub_to_shadow_get,
    sub_to_shadow_delta,
    get_current_shadow,
    change_shadow_value
};
