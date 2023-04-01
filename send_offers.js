/* This is for avoiding SSL and TLS errors */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/* Importing all of the required packages */
const Web3 = require("web3");
const WalletProvider = require("@truffle/hdwallet-provider");
const { OpenSeaSDK, Network, } = require("opensea-js");
const order = require("@opensea/seaport-js/lib/utils/order");
const { readFileSync } = require("fs");

let web3;
let private_key = "";
let wallet_address = "";

const loadConfig = () => {
    readFileSync("")
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
 * @returns {Promise<void>}
 */
const initProvider = async () => {
    console.info("\nInitializing...");

    try {
        const wallet = new WalletProvider({
            privateKeys: [PRIVATE_KEY],
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

        const OpenSea = new OpenSeaSDK(web3.currentProvider, { networkName: Network.Main, apiKey: "cc51fa67a8684f7eb7725b4f82fa1815" })
        OpenSea.createBuyOrder({
            asset: {}
        })
        OpenSea.createCollectionOffer()
        order.generateRandomSalt()
    } catch (e) {
        console.trace(e);
    }
};