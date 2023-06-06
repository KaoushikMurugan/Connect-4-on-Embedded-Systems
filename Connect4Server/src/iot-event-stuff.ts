// taken from https://github.com/aws/aws-iot-device-sdk-js-v2/blob/main/samples/node/shadow/index.ts
// modified to be depented on parameters instead of global variables, which allows for multiple devices to use these functions
// Also modified to keep track of player input

import { mqtt, iotshadow } from 'aws-iot-device-sdk-v2';
import { DeviceShadowInfo } from './device-shadow-data';

/**
 * Per shadow local state values
 */
type ShadowLocalState = {
    /** local shadow data */
    value: unknown;
    /** property within state.desired that we are modifying */
    property: string;
    /** input property name (must be sub-property of property) */
    inputProperty: string;
    /** mutex to ensure no other process runs during an update fetch */
    updateComplete: boolean;
    /** current input */
    playerInput: number;
    /** input timestamp */
    playerInputTimestamp: number;
    /** if the player Input value was used */
    playerInputUsed: boolean;
    /** if the player is ready */
    ready: number;
};

/**
 * Subscribes to shadow update events and creates a callback function to handle the event
 * @param shadow iot shadow object
 * @param deviceShadowInfo device shadow info see {@link DeviceShadowInfo}
 * @returns
 */
async function sub_to_shadow_update(
    shadow: iotshadow.IotShadowClient,
    deviceShadowInfo: DeviceShadowInfo,
    //@ts-ignore
    shadowLocalState: ShadowLocalState
) {
    return new Promise(async (resolve, reject) => {
        try {
            function updateAccepted(
                error?: iotshadow.IotShadowError,
                response?: iotshadow.model.UpdateShadowResponse
            ) {
                console.log(
                    `\nReceived ${deviceShadowInfo.thing_name} shadow update event.`
                );
                if (response) {
                    if (response.clientToken !== undefined) {
                        console.log(
                            `Successfully updated ${deviceShadowInfo.thing_name} shadow for clientToken: ` +
                                response.clientToken +
                                '.'
                        );
                    } else {
                        console.log(
                            `Successfully updated ${deviceShadowInfo.thing_name} shadow.`
                        );
                    }
                    if (response.state?.desired !== undefined) {
                        // console.log(
                        //     '\t desired state: ' + JSON.stringify(response.state.desired)
                        // );
                    }
                    if (response.state?.reported !== undefined) {
                        // console.log(
                        //     '\t reported state: ' +
                        //         JSON.stringify(response.state.reported)
                        // );
                    }
                }

                if (error || !response) {
                    console.log(
                        `Updated ${deviceShadowInfo.thing_name} shadow is missing the target property.`
                    );
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
                    console.log('Error occurred...');
                }
                reject(error);
            }

            console.log(`Subscribing to ${deviceShadowInfo.thing_name} Update events...`);
            const updateShadowSubRequest: iotshadow.model.UpdateNamedShadowSubscriptionRequest =
                {
                    shadowName: deviceShadowInfo.shadow_name,
                    thingName: deviceShadowInfo.thing_name
                };

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

/**
 * Subscribes to shadow get events and creates a callback function to handle the event
 * @param shadow iot shadow object
 * @param deviceShadowInfo device shadow info see {@link deviceShadowInfo}
 * @param shadowLocalState shadow local state see {@link ShadowLocalState}
 * @returns
 */
async function sub_to_shadow_get(
    shadow: iotshadow.IotShadowClient,
    deviceShadowInfo: DeviceShadowInfo,
    shadowLocalState: ShadowLocalState
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
                                `${deviceShadowInfo.thing_name} Shadow contains delta value '` +
                                    JSON.stringify(value) +
                                    "'."
                            );
                            change_shadow_value(
                                shadow,
                                deviceShadowInfo,
                                shadowLocalState,
                                value
                            );
                        }
                    }
                    if (response?.state.reported) {
                        const value_any: any = response.state.reported;
                        if (value_any) {
                            let found_property = false;
                            for (var prop in value_any) {
                                if (prop === shadowLocalState.property) {
                                    found_property = true;
                                    // console.log(
                                    //     `${deviceShadowInfo.thing_name} Shadow contains '` +
                                    //         prop +
                                    //         "'. Reported value: '" +
                                    //         JSON.stringify(value_any[prop]) +
                                    //         "'."
                                    // );
                                    console.log('Received shadow state');
                                    break;
                                }
                            }
                            if (found_property === false) {
                                console.log(
                                    `${deviceShadowInfo.thing_name} Shadow does not contain '` +
                                        shadowLocalState.property +
                                        "' property."
                                );
                            }
                        }
                    }
                }

                if (error || !response) {
                    console.log('Error occurred...');
                }
                shadowLocalState.updateComplete = true;
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
                    console.log('Error occurred...');
                }

                shadowLocalState.updateComplete = true;
                reject(error);
            }

            console.log(`Subscribing to ${deviceShadowInfo.thing_name} Get events...`);
            const getShadowSubRequest: iotshadow.model.GetShadowSubscriptionRequest = {
                thingName: deviceShadowInfo.thing_name
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

/**
 * Subscribes to shadow delta events and creates a callback function to handle the event
 * @param shadow iot shadow object
 * @param deviceShadowInfo device shadow info see {@link deviceShadowInfo}
 * @param shadowLocalState shadow local state see {@link ShadowLocalState}
 * @returns
 */
async function sub_to_shadow_delta(
    shadow: iotshadow.IotShadowClient,
    deviceShadowInfo: DeviceShadowInfo,
    shadowLocalState: ShadowLocalState
) {
    return new Promise(async (resolve, reject) => {
        try {
            function deltaEvent(
                _error?: iotshadow.IotShadowError,
                response?: iotshadow.model.GetShadowResponse
            ) {
                console.log(
                    `\nReceived ${deviceShadowInfo.thing_name} shadow delta event.`
                );

                if (response?.clientToken != null) {
                    console.log('  ClientToken: ' + response.clientToken);
                }

                if (response?.state !== null) {
                    let value_any: any = response?.state;
                    if (value_any === null || value_any === undefined) {
                        console.log(
                            "Delta reports that '" +
                                shadowLocalState.property +
                                "' was deleted. Resetting defaults..."
                        );
                        let data_to_send: any = {};
                        data_to_send[shadowLocalState.property] = shadowLocalState.value;
                        change_shadow_value(
                            shadow,
                            deviceShadowInfo,
                            shadowLocalState,
                            data_to_send
                        );
                    } else {
                        if (value_any[shadowLocalState.property] !== undefined) {
                            if (
                                value_any[shadowLocalState.property] !==
                                shadowLocalState.value
                            ) {
                                console.log(
                                    "Delta reports that desired value is '" +
                                        value_any[shadowLocalState.property] +
                                        "'. Changing local value..."
                                );
                                // Check player input
                                let metadata: any = response?.metadata;
                                let inputTimestamp =
                                    metadata[shadowLocalState.property][
                                        shadowLocalState.inputProperty
                                    ];
                                let inputValue =
                                    value_any[shadowLocalState.property][
                                        shadowLocalState.inputProperty
                                    ];
                                if (metadata !== null && metadata !== undefined) {
                                    if (
                                        inputTimestamp !== undefined &&
                                        inputTimestamp !== null &&
                                        inputValue !== undefined &&
                                        inputValue !== null
                                    ) {
                                        if (
                                            inputTimestamp !==
                                            shadowLocalState.playerInputTimestamp
                                        ) {
                                            // New input was received
                                            shadowLocalState.playerInputTimestamp =
                                                inputTimestamp;
                                            shadowLocalState.playerInput = inputValue;
                                            shadowLocalState.playerInputUsed = false;
                                        }
                                    }
                                }
                                let data_to_send: any = {};
                                data_to_send[shadowLocalState.property] =
                                    value_any[shadowLocalState.property];
                                change_shadow_value(
                                    shadow,
                                    deviceShadowInfo,
                                    shadowLocalState,
                                    data_to_send
                                );
                            } else {
                                console.log(
                                    "Delta did not report a change in '" +
                                        shadowLocalState.property +
                                        "'."
                                );
                            }
                        } else {
                            console.log('Desired value not found in delta. Skipping...');
                        }
                    }
                } else {
                    console.log(
                        "Delta did not report a change in '" +
                            shadowLocalState.property +
                            "'."
                    );
                }

                resolve(true);
            }

            console.log(`Subscribing to ${deviceShadowInfo.thing_name} Delta events...`);
            const deltaShadowSubRequest: iotshadow.model.ShadowDeltaUpdatedSubscriptionRequest =
                {
                    thingName: deviceShadowInfo.thing_name
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

/**
 * Gets the current shadow state
 * @param shadow iot shadow object
 * @param deviceShadowInfo device shadow info see {@link deviceShadowInfo}
 * @param shadowLocalState shadow local state see {@link ShadowLocalState}
 * @returns
 */
async function get_current_shadow(
    shadow: iotshadow.IotShadowClient,
    deviceShadowInfo: DeviceShadowInfo,
    shadowLocalState: ShadowLocalState
) {
    return new Promise(async (resolve, reject) => {
        try {
            const getShadow: iotshadow.model.GetShadowRequest = {
                thingName: deviceShadowInfo.thing_name
            };

            shadowLocalState.updateComplete = false;
            console.log(
                `Requesting current shadow state for ${deviceShadowInfo.thing_name}...`
            );
            shadow.publishGetShadow(getShadow, mqtt.QoS.AtLeastOnce);

            await get_current_shadow_update_wait(shadowLocalState);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Waits until the shadow update is complete
 * @param shadowLocalState shadow local state see {@link ShadowLocalState}
 * @returns
 */
async function get_current_shadow_update_wait(shadowLocalState: ShadowLocalState) {
    // Wait until shadow_update_complete is true, showing the result returned
    return await new Promise(resolve => {
        const interval = setInterval(() => {
            if (shadowLocalState.updateComplete == true) {
                resolve(true);
                clearInterval(interval);
            }
        }, 200);
    });
}

/**
 * Changes the shadow value
 * @param shadow iot shadow object
 * @param deviceShadowInfo device shadow info see {@link deviceShadowInfo}
 * @param shadowLocalState shadow local state see {@link ShadowLocalState}
 * @param newValue new value to set the shadow to
 * @returns
 */
function change_shadow_value(
    shadow: iotshadow.IotShadowClient,
    deviceShadowInfo: DeviceShadowInfo,
    shadowLocalState: ShadowLocalState,
    newValue?: object
) {
    return new Promise(async (resolve, reject) => {
        try {
            if (typeof newValue !== 'undefined') {
                let new_value_any: any = newValue;
                let skip_send = false;

                if (new_value_any !== null) {
                    if (
                        new_value_any[shadowLocalState.property] == shadowLocalState.value
                    ) {
                        skip_send = true;
                    }
                }
                if (skip_send == false) {
                    if (new_value_any === null) {
                        shadowLocalState.value = new_value_any;
                    } else {
                        shadowLocalState.value = new_value_any[shadowLocalState.property];
                    }

                    console.log(
                        `Changed local ${deviceShadowInfo.thing_name} shadow value to '` +
                            shadowLocalState.value +
                            "'."
                    );

                    var updateShadow: iotshadow.model.UpdateShadowRequest = {
                        state: {
                            desired: newValue,
                            reported: newValue
                        },
                        thingName: deviceShadowInfo.thing_name
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
    ShadowLocalState,
    sub_to_shadow_update,
    sub_to_shadow_get,
    sub_to_shadow_delta,
    get_current_shadow,
    change_shadow_value
};
