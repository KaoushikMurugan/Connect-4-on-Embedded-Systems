type DeviceShadowData = {
    /** The name of the thing */
    thing_name: string;
    /**
     * The name of the device shadow
     *
     * Also called shadow_property
     * */
    shadow_name: string;
    /** idk */
    proxy_host?: string;
    /** idk */
    proxy_port?: string;
    /** Path to the certificate relative to this file*/
    certificate_path: string;
    /** Path to the private key relative to this file*/
    private_key_path: string;
    /** Path to the root CA relative to this file*/
    root_ca_path: string;
    /** client id, if not specified, it is randomly generated */
    client_id?: string;
    /** The aws endpoint */
    endpoint: string;
};

export { DeviceShadowData };
