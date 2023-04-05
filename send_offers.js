/* This is for avoiding SSL and TLS errors */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/* Importing all of the required packages */
const Web3 = require("web3");
const WalletProvider = require("@truffle/hdwallet-provider");
const { OpenSeaSDK, Network, } = require("opensea-js");
const { makeBigNumber } = require("opensea-js/lib/utils/utils");
const { BuildOfferResponse } = require("opensea-js/lib/orders/types");
const { readFileSync } = require("fs");
const axios = require("axios").default;

let web3;
let private_key = "";
let wallet_address = "";
let exp_time = 30;

const loadConfig = () => {
    return new Promise((resolve, reject) => {
        // console.log("Loading config file...");
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
    // console.info("\nInitializing...");

    try {
        const wallet = new WalletProvider({
            privateKeys: [private_key],
            providerOrUrl: "https://rpc.flashbots.net",
            pollingInterval: 10000
        });
        // console.info("Wallet Connected!");
        // console.info(`Wallet: ${wallet.getAddress()}`);

        web3 = new Web3(wallet, {
            reconnect: {
                auto: true,
                delay: 5000,
                maxAttempts: 5,
                onTimeout: false,
            },
        });

        // console.info("Connected with flashbots Provider!");

        return new OpenSeaSDK(web3.currentProvider, { networkName: Network.Main, apiKey: "cc51fa67a8684f7eb7725b4f82fa1815" })

    } catch (e) {
        console.trace(e);
    }
};

/**
 * 
 * @param {object} offer 
 * @returns {Promise<BuildOfferResponse>} data got from the OpenSeaAPI response
 */

const buildTraitOffer = async (offer) => {
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
        console.error(`Error while trying to build collection trait offer data: ${error}`)
    }
}

/**
 * 
 * @param {object} offer 
 * @param {OpenSeaSDK} openSea
 */
const sendTraitOffer = async (offer, openSea) => {
    try {
        const data = await buildTraitOffer(offer);

        const consideration = data.partialParameters.consideration[0];
        // const zone = data.partialParameters.zone;

        const collection = await openSea.api.getCollection(offer.slug);

        const fees = await openSea.getFees({
            collection: collection,
            paymentTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            startAmount: makeBigNumber((offer.startAmount * 10e17).toString()),
            endAmount: makeBigNumber((offer.startAmount * 10e17).toString()),
        })

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
            // zone: zone,
            restrictedByZone: false,
            allowPartialFills: true
        }

        if (fees.openseaSellerFees.length > 0) {
            order_payload.consideration.push(fees.openseaSellerFees[0])
        }

        const order = await openSea.seaport_v1_4.createOrder(order_payload, wallet_address)
        const _order = await order.executeAllActions();

        const final_payload = {
            "criteria": {
                "collection": {
                    "slug": offer.slug
                },
                "trait": {
                    "type": offer.trait_type,
                    "value": offer.trait_value
                },
            },
            "protocol_data": _order
        }

        for (let i = 0; i < 3; i++) {
            const res = await axios.post("https://api.opensea.io/v2/offers", JSON.stringify(final_payload), {
                headers: {
                    "accept": "application/json",
                    "content-type": "application/json",
                    "X-API-KEY": "cc51fa67a8684f7eb7725b4f82fa1815"
                }
            })

            if (res.status == 200) {
                console.log("Collection Trait Offer Sent successfuly!", res.data.criteria);
                break;
            }
        }

    } catch (error) {
        console.trace(`Error while sending collection trait offer: ${error}`)
    }
}

/**
 * 
 * @param {object} offer 
 * @param {OpenSeaSDK} openSea 
 */
const sendCollectionOffer = async (offer, openSea) => {
    try {
        // console.log(offer)
        const res = await openSea.createCollectionOffer({
            collectionSlug: offer.slug,
            accountAddress: wallet_address,
            amount: offer.startAmount,
            quantity: Number(offer.quantity),
            expirationTime: Math.round(new Date().getTime() / 1000) + (60 * exp_time), // 30 minutes
            paymentTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        })

        console.info("Collection Offer sent successfuly:", res.criteria);
    } catch (error) {
        console.error("Error while sending collection offer: ", error);
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

        console.info("Offer sent successfuly:", {
            tokenId: offer.tokenId,
            tokenAddress: offer.tokenAddress,
            price: offer.startAmount
        })

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

            if (offer.type == "trait") {
                sendTraitOffer(offer, openSea)
                await sleep(1.2)
            } else if (offer.type == "offer") {
                sendOffer(offer, openSea)
                await sleep(1.2)
            } else if (offer.type == "collection") {
                sendCollectionOffer(offer, openSea)
                await sleep(1.2)
            }
        }

    } catch (error) {
        console.error(error)
    }
}

main(JSON.parse(process.argv[2]))
// main([{
//     "tokenId": "11013",
//     "tokenAddress": "0x76be3b62873462d2142405439777e971754e8e77",
//     "startAmount": 0.01,
//     "type": "offer",
// }])
