# Final Project for EEC 172 - Embedded Systems
### For Lab 6

**Project by Ian Chuang and Kaoushik Murugan**

## A multiplayer Connect 4 game that plays on two TI CC3200 Boards

### `Connect4Client` is the code that is run on the CC3200 Boards 

It is an embeeded C project for the CC3200 board. All board-specfic C includes can be found in the SDK for the CC3200 board (correct this later). Our input device is an IR sensor + IR remote.

### `Connect4Server` is the code that is run on an AWS EC2 Server
It is a node.js project using Amazon's IoT SDK to communicate with the boards over MQTT

### `Device-1-certs` is the location where the certificates associated to the first CC3200 board are located

### `Device-2-certs` is the location where the certificates associated to the second CC3200 board are located

## As of this commit:

To build the Connect4Server project, run 
```console
$ npm run build
```
in the `Connect4Server` directory.

To test the Connect4Server project, fill in the `test_prog_template.sh` file with the appropriate paths to the certificates and keys. Then rename the file to `test_prog.sh`. Finally, run 
```console
$ npm run test
````
in the `Connect4Server` directory.

## Software Requirements
- CCS to run/test/debug embeded C code for the CC3200 board
- UniFlash to flash the program to the CC3200 board
- node.js
- Amazon AWS
    - EC2 server to run the server and connect to other AWS services
    - IoT Core to connect the CC3200 to other AWS services
    - AWS CLI to test code locally before sending it to the EC2 server
    - AWS IOT Device SDK v2 to connect to IoT devices on a node.js project
