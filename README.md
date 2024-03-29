# Final Project for an Embedded Systems Course
### For Lab 6

**Project by Ian Chuang and Kaoushik Murugan**

## A multiplayer Connect 4 game that plays on two TI CC3200 Boards

### `Connect4Client` is the code that is run on the CC3200 Boards 

It is an embeeded C project for the CC3200 board. All board-specfic C includes can be found in the SDK for the CC3200 board (correct this later). Our input device is an IR sensor + IR remote.

### `Connect4Server` is the code that is run on an AWS EC2 Server
It is a node.js project using Amazon's IoT SDK to communicate with the boards over MQTT

### `Device-1-certs` is the location where we store our certificates associated to the first CC3200 board

### `Device-2-certs` is the location where we store our certificates associated to the second CC3200 board

You do not have to store them in those directories, however it may help with organization. All code that requires the certificates and keys are based on user specified relative paths (see [intructions on how to run Connect4Server](https://github.com/KaoushikMurugan/Connect-4-on-Embedded-Systems#how-to-run-connect4server))

# Instructions

## How to run Connect4Server

###### This is the server on which the game logic is run. It subscribes to iot device shadow changes to recieve input information either device and send the updated game state to both devices

**1. Download the Connect4Server directory to the device where you'll host the server**
**2. Inside the Connect4Server directory, run:**
```sh
npm install
```

**3. Copy over (to a location of your choice) the necessary certificates and keys to connect to the server**
You'll need the following certificates for each device that you want to connect:
- Client Certificate
- RootCA (RootCA1 - RSA 2048)
- Private Key

**4. Create .shadowinfo.json for the devices you're using**
The template is provided in [Connect4Server/Device.shadowinfo.template.json](https://github.com/KaoushikMurugan/Connect-4-on-Embedded-Systems/blob/main/Connect4Server/Device.shadowinfo.template.json)

- The paths to the certificates and keys should be relative to the .shadowinfo.json's file location.
- `thing_name` is the name of the aws iot thing you want to connect to
- `shadow_name` is the name of the aws iot thing's device shadow. If you created an unnamed (classic) device shadow, then it's name will be `Classic Shadow`
- `endpoint` can be found on your within your things's ARN and/or your device shadow's URL. It is of the format `<random charecters>.iot.<region>.amazonaws.com`

Rename the files to `Device1.shadowinfo.json` and `Device2.shadowinfo.json`

**5. Run the following command to start the server**
```sh
npm run dev
```
Ensure that you're using **node v16.18.0** by running
```sh
node -v
```

## Setting up Connect4Client

## AWS Setup

When creating the policies for the device(s), use template provided in [PolicyPremissions.json](https://github.com/KaoushikMurugan/Connect-4-on-Embedded-Systems/blob/main/PolicyPremissions.json).
Replace:
- <region> with the region you are using (e.g. `us-east-1`)
- <aws_account_id> with your aws account id
- <thing_name> with the name of your thing

The permissions allows communication with the device shadow via HTTP (physical device to shadow) as well as MQTT (shadow to server)

## Software Requirements
- CCS to run/test/debug embeded C code for the CC3200 board (* not required if you aren't changing the code)
- UniFlash to flash the program to the CC3200 board
- node.js v16.18.0
- Amazon AWS
    - EC2 server to run the server and connect to other AWS services (* other services may work)
    - IoT Core to connect the CC3200 to other AWS services
    - AWS CLI configured with an IAM role that has admin permissions to test code locally before sending it to the EC2 server (* may not be required, we haven't tested it on a system that wasn't using aws cli without admin perms)
    - AWS IOT Device SDK v2 to connect to IoT devices on a node.js project
