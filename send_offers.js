/* This is for avoiding SSL and TLS errors */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/* Importing all of the required packages */
const Web3 = require("web3");
const ethers = require("ethers")
const WalletProvider = require("@truffle/hdwallet-provider");
const { OpenSeaSDK, Network, } = require("opensea-js");
const { makeBigNumber } = require("opensea-js/lib/utils/utils");
const { generateRandomSalt } = require("@opensea/seaport-js/lib/utils/order");
const { Seaport } = require("@opensea/seaport-js/lib/seaport.js");
const { BuildOfferResponse } = require("opensea-js/lib/orders/types");
const { readFileSync } = require("fs");
const axios = require("axios").default;

let web3;
let private_key = "";
let wallet_address = "";
let exp_time = 30;

const loadConfig = () => {
    return new Promise((resolve, reject) => {
        console.log("Loading config file...");
        try {
            const data = readFileSync("config.txt", { encoding: "utf8" }).trim().split("\r").join("").split("\n")

            for (let i = 0; i < data.length; i++) {
                const item = data[i].trim().split(" ");

                if (item[0] == "private_key") {
                    private_key = item[1]
                } else if (item[0] == "wallet_address") {
                    wallet_address = item[1].toLowerCase()
                } else if (item[0] == "exp_time") {
                    exp_time = Number(item[1])
                }
            }

            resolve("success")

        } catch (error) {
            reject(error)
        }
    })
}

/**
 * Sleep function for stopping the execution of a program for given number of seconds
 * @param {number} seconds Number of seconds to sleep for
 * @returns {Promise<void>}
 */
const sleep = (seconds) => {
    return new Promise((r) => setTimeout(r, seconds * 1000));
}

/**
 * Initializes the Wallet and the Provider
 * @returns {Promise<OpenSeaSDK>}
 */
const initProvider = async () => {
    console.info("\nInitializing...");

    try {
        const wallet = new WalletProvider({
            privateKeys: [private_key],
            providerOrUrl: "https://rpc.flashbots.net",
        });
        console.info("Wallet Connected!");
        console.info(`Wallet: ${wallet.getAddress()}`);

        web3 = new Web3(wallet, {
            reconnect: {
                auto: true,
                delay: 5000,
                maxAttempts: 5,
                onTimeout: false,
            },
        });

        console.info("Connected with flashbots Provider!");

        return new OpenSeaSDK(web3.currentProvider, { networkName: Network.Main, apiKey: "cc51fa67a8684f7eb7725b4f82fa1815" })

    } catch (e) {
        console.trace(e);
    }
};

/**
 * 
 * @param {object} offer 
 * @param {OpenSeaSDK} openSea
 * @returns {Promise<BuildOfferResponse>} data got from the OpenSeaAPI response
 */

const buildCollectionTraitOffer = async (offer, openSea) => {
    try {
        const api_endpoint = "https://api.opensea.io/v2/offers/build";
        const headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "X-API-KEY": "cc51fa67a8684f7eb7725b4f82fa1815"
        }

        const payload = {
            "offerer": wallet_address,
            "quantity": offer.quantity,
            "criteria": {
                "collection": {
                    "slug": offer.slug
                },
                "trait": {
                    "type": offer.trait_type,
                    // "value": offer.trait_value
                }
            }
        }

        if (!isNaN(offer.trait_value) && offer.trait_value.toString().indexOf('.') != -1) {
            payload.criteria.trait["float_value"] = offer.trait_value
        } else if (!isNaN(offer.trait_value)) {
            payload.criteria.trait["int_value"] = offer.trait_value
        } else {
            payload.criteria.trait["value"] = offer.trait_value
        }

        for (let i = 0; i < 3; i++) {
            const res = await axios.post(api_endpoint, JSON.stringify(payload), { headers: headers });

            if (res.status == 200) {
                return res.data;
            }
        }

        return null

    } catch (error) {
        console.error(`Error while trying to build collection offer data: ${error}`)
    }
}

/**
 * 
 * @param {object} offer 
 * @param {OpenSeaSDK} openSea
 */
const sendCollectionOffer = async (offer, openSea) => {
    try {
        // const o = await openSea.api.buildOffer(wallet_address, "1", "azuki");
        // console.info("Consideration_1:", o.partialParameters.consideration[0])

        const data = await buildCollectionTraitOffer(offer, openSea);

        const consideration = data.partialParameters.consideration[0];
        const zone = data.partialParameters.zone;
        // const zoneHash = data.partialParameters.zoneHash;

        // console.info("Consideration:", consideration)

        const collection = await openSea.api.getCollection(offer.slug);
        // console.info("Got collection:", collection)
        const fees = await openSea.getFees({
            collection: collection,
            paymentTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            startAmount: makeBigNumber((offer.startAmount * 10e17).toString()),
            endAmount: makeBigNumber((offer.startAmount * 10e17).toString()),
        })
        // console.info("Got Fees:", fees)

        const order_payload = {
            offerer: wallet_address,
            offer: [
                {
                    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    amount: makeBigNumber((offer.startAmount * 10e17).toString()).toString(),
                },
            ],
            consideration: [
                {
                    itemType: consideration.itemType,
                    identifier: consideration.identifierOrCriteria,
                    token: consideration.token,
                    amount: consideration.endAmount,
                    recipient: consideration.recipient
                },
                fees.collectionSellerFees[0]
            ],
            endTime: Math.round(new Date().getTime() / 1000) + (60 * exp_time),
            zone: zone,
            restrictedByZone: false,
            allowPartialFills: true
        }

        if (fees.openseaSellerFees.length > 0) {
            order_payload.consideration.push(fees.openseaSellerFees[0])
        }

        console.log("Payload:", order_payload)

        // const eth_provider = new ethers.JsonRpcProvider(web3.currentProvider);
        // const signer = await eth_provider.getSigner(wallet_address)
        // // let signer = await openSea.seaport_v1_4._getSigner(wallet_address)

        // await openSea.seaport_v1_4._formatOrder(signer, wallet_address, false, order_payload)


        // const payload = {
        //     "criteria": {
        //         "collection": {
        //             "slug": offer.slug
        //         },
        //         "trait": {
        //             "type": offer.trait_type,
        //             "value": offer.trait_value
        //         },
        //     },
        //     "protocol_data": {
        //         "parameters": {
        //             "offerer": wallet_address,
        //             "offer": [
        //                 {
        //                     "itemType": 1,
        //                     "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //                     "identifierOrCriteria": 0,
        //                     "startAmount": offer.startAmount * 10e18,
        //                     "endAmount": offer.startAmount * 10e18
        //                 }
        //             ],
        //             "consideration": [
        //                 consideration[0],
        //                 {
        //                     "itemType": 1,
        //                     "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //                     "identifierOrCriteria": 0,
        //                     "startAmount": 250000000000000,
        //                     "endAmount": 250000000000000,
        //                     "recipient": "0x0000a26b00c1F0DF003000390027140000fAa719"
        //                 },
        //                 {
        //                     "itemType": 1,
        //                     "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //                     "identifierOrCriteria": 0,
        //                     "startAmount": 250000000000000,
        //                     "endAmount": 250000000000000,
        //                     "recipient": "0xA858DDc0445d8131daC4d1DE01f834ffcbA52Ef1"
        //                 }
        //             ],
        //             "startTime": Math.floor(Date.now() / 1000).toString(),
        //             "endTime": Math.round(new Date().getTime() / 1000) + (60 * exp_time),
        //             "orderType": 0,
        //             "zone": zone,
        //             "zoneHash": zoneHash,
        //             "salt": generateRandomSalt(),
        //             "conduitKey": openSea.seaport_v1_4.OPENSEA_CONDUIT_KEY,
        //             "totalOriginalConsiderationItems": 3,
        //             "counter": 0
        //         },
        //         "signature": "0x0"
        //     }
        // }


        // const _seaport = new Seaport(web3.currentProvider);
        // console.info(_seaport._formatOrder)



        // consideration.push({
        //     "itemType": 1,
        //     "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //     "identifierOrCriteria": 0,
        //     "startAmount": 250000000000000,
        //     "endAmount": 250000000000000,
        //     "recipient": "0x0000a26b00c1F0DF003000390027140000fAa719"
        // })

        // consideration.push({
        //     "itemType": 1,
        //     "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //     "identifierOrCriteria": 0,
        //     "startAmount": 250000000000000,
        //     "endAmount": 250000000000000,
        //     "recipient": "0xA858DDc0445d8131daC4d1DE01f834ffcbA52Ef1"
        // })

        // const _offer = [{
        //     "itemType": 1,
        //     "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //     "identifierOrCriteria": 0,
        //     "startAmount": offer.startAmount * 10e18,
        //     "endAmount": offer.startAmount * 10e18
        // }]

        const order = await openSea.seaport_v1_4.createOrder(order_payload, wallet_address)

        console.info(order)
        console.info("\n\n")
        console.info(order.actions)

        // const _order = await order.actions[0].createOrder();
        // 

    } catch (error) {
        console.trace(`Error while sending collections offer: ${error}`)
    }
}

/**
 * 
 * @param {object} offer 
 * @param {OpenSeaSDK} openSea 
 */
const sendOffer = async (offer, openSea) => {
    try {
        const _offer = await openSea.createBuyOrder({
            asset: {
                tokenId: offer.tokenId,
                tokenAddress: offer.tokenAddress
            },
            accountAddress: wallet_address,
            startAmount: offer.startAmount,
            expirationTime: Math.round(new Date().getTime() / 1000) + (60 * exp_time) // 30 minutes
        })

        console.info("Offer sent successfuly:", _offer.protocolData.parameters.offer[0])
    } catch (error) {
        console.error(`Failed to send an offer! reason: ${error}`)
    }
}

/**
 * 
 * @param {Array<object>} offers 
 */

const main = async (offers) => {
    try {
        await loadConfig()
        const openSea = await initProvider()

        for (let i = 0; i < offers.length; i++) {
            const offer = offers[i];

            if (offer.type == "collection") {
                sendCollectionOffer(offer, openSea)
                await sleep(0.6)
            } else {
                sendOffer(offer, openSea)
                await sleep(0.6)
            }
        }

    } catch (error) {
        console.error(error)
    }
}

main([
    // {
    //     tokenId: "1396",
    //     tokenAddress: "0x65800baea6d0b06c031c384598aa782bf9e5209a",
    //     startAmount: 0.003,
    //     type: "offer"
    // },
    // {
    //     tokenId: "2717",
    //     tokenAddress: "0x0e8d5ad992b37f145ed1985d4bffcbc3d5bd6be3",
    //     startAmount: 0.004,
    //     type: "offer"
    // }
    {
        slug: "azuki",
        trait_type: "Offhand",
        trait_value: "Water Orb",
        startAmount: 0.05,
        quantity: "1",
        type: "collection"
    }
]);
