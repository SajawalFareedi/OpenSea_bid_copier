import sys
import json
import logging
import datetime
import subprocess

from requests import api
from random import randint
from logging import Logger
from threading import Thread

from time import sleep, time
from multiprocessing.dummy import Pool as ThreadPool


class OpenSeaBidder():
    
    def __init__(self, logger: Logger) -> None:
        self.logger = logger
        self.retries = 3
        
        self.accounts = []
        self.blacklist = []
        self.eth_to_add = 0.0001
        self.exp_time = 30
        
        self.proxies = {
            "http": "http://cdaaa782bccd4b64ac3f3ea16d2ec3d5:@proxy.zyte.com:8011/",
            "https": "http://cdaaa782bccd4b64ac3f3ea16d2ec3d5:@proxy.zyte.com:8011/"
        }
        
        self.api_endpoint = "https://opensea.io/__api/graphql/"
        self.headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-app-id": "opensea-web",
            "x-build-id": "26cf5054e75ab0f153139da8b723f2c7b507c4b9",
            "x-signed-query": "e948ab42cf4ec88838d8dd18b30c6e41b7ede49a40ee7b93e7a690370266a1a2",
            "referer": "https://opensea.io/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
        }
        
        self.payload = {
            "id": "EventHistoryPollQuery",
            "query": "query EventHistoryPollQuery(\n  $archetype: ArchetypeInputType\n  $categories: [CollectionSlug!]\n  $chains: [ChainScalar!]\n  $collections: [CollectionSlug!]\n  $count: Int = 10\n  $cursor: String\n  $eventTimestamp_Gt: DateTime\n  $eventTypes: [EventType!]\n  $identity: IdentityInputType\n  $showAll: Boolean = false\n  $stringTraits: [TraitInputType!]\n  $isRarityExpansionEnabled: Boolean!\n  $rarityFilter: RarityFilterType\n) {\n  eventActivity(after: $cursor, archetype: $archetype, categories: $categories, chains: $chains, collections: $collections, eventTimestamp_Gt: $eventTimestamp_Gt, eventTypes: $eventTypes, first: $count, identity: $identity, includeHidden: true, stringTraits: $stringTraits, rarityFilter: $rarityFilter) {\n    edges {\n      node {\n        collection {\n          ...CollectionCell_collection\n          id\n        }\n        traitCriteria {\n          ...CollectionCell_trait\n          id\n        }\n        itemQuantity\n        item @include(if: $showAll) {\n          __typename\n          relayId\n          verificationStatus\n          ...ItemCell_data\n          ...item_url\n          ...PortfolioTableItemCellTooltip_item\n          ... on AssetType {\n            defaultRarityData @include(if: $isRarityExpansionEnabled) {\n              rank\n              id\n            }\n            collection {\n              ...CollectionLink_collection\n              id\n            }\n            assetContract {\n              ...CollectionLink_assetContract\n              id\n            }\n          }\n          ... on AssetBundleType {\n            bundleCollection: collection {\n              ...CollectionLink_collection\n              id\n            }\n          }\n          ... on Node {\n            __isNode: __typename\n            id\n          }\n        }\n        relayId\n        eventTimestamp\n        eventType\n        customEventName\n        orderStatus\n        ...utilsAssetEventLabel\n        creatorFee {\n          unit\n        }\n        devFeePaymentEvent {\n          ...EventTimestamp_data\n          id\n        }\n        fromAccount {\n          address\n          ...AccountLink_data\n          id\n        }\n        perUnitPrice {\n          unit\n          eth\n          usd\n        }\n        endingPriceType {\n          unit\n        }\n        priceType {\n          unit\n        }\n        payment {\n          ...TokenPricePayment\n          id\n        }\n        seller {\n          ...AccountLink_data\n          id\n        }\n        sellOrder {\n          taker {\n            __typename\n            id\n          }\n          id\n        }\n        toAccount {\n          ...AccountLink_data\n          id\n        }\n        winnerAccount {\n          ...AccountLink_data\n          id\n        }\n        ...EventTimestamp_data\n        id\n      }\n    }\n  }\n}\n\nfragment AccountLink_data on AccountType {\n  address\n  config\n  isCompromised\n  user {\n    publicUsername\n    id\n  }\n  displayName\n  ...ProfileImage_data\n  ...wallet_accountKey\n  ...accounts_url\n}\n\nfragment AssetMediaAnimation_asset on AssetType {\n  ...AssetMediaImage_asset\n  ...AssetMediaContainer_asset\n  ...AssetMediaPlaceholderImage_asset\n}\n\nfragment AssetMediaAudio_asset on AssetType {\n  backgroundColor\n  ...AssetMediaImage_asset\n}\n\nfragment AssetMediaContainer_asset on AssetType {\n  backgroundColor\n  ...AssetMediaEditions_asset_2V84VL\n  collection {\n    ...useIsRarityEnabled_collection\n    id\n  }\n}\n\nfragment AssetMediaContainer_asset_1LaGDz on AssetType {\n  backgroundColor\n  ...AssetMediaEditions_asset_2V84VL\n  defaultRarityData {\n    ...RarityIndicator_data\n    id\n  }\n  collection {\n    ...useIsRarityEnabled_collection\n    id\n  }\n}\n\nfragment AssetMediaContainer_asset_1bRsaP on AssetType {\n  backgroundColor\n  ...AssetMediaEditions_asset_2V84VL\n  collection {\n    ...useIsRarityEnabled_collection\n    id\n  }\n}\n\nfragment AssetMediaEditions_asset_2V84VL on AssetType {\n  decimals\n}\n\nfragment AssetMediaImage_asset on AssetType {\n  backgroundColor\n  imageUrl\n  collection {\n    displayData {\n      cardDisplayStyle\n    }\n    id\n  }\n}\n\nfragment AssetMediaPlaceholderImage_asset on AssetType {\n  collection {\n    displayData {\n      cardDisplayStyle\n    }\n    id\n  }\n}\n\nfragment AssetMediaVideo_asset on AssetType {\n  backgroundColor\n  ...AssetMediaImage_asset\n}\n\nfragment AssetMediaWebgl_asset on AssetType {\n  backgroundColor\n  ...AssetMediaImage_asset\n}\n\nfragment AssetMedia_asset on AssetType {\n  animationUrl\n  displayImageUrl\n  imageUrl\n  isDelisted\n  ...AssetMediaAnimation_asset\n  ...AssetMediaAudio_asset\n  ...AssetMediaContainer_asset_1bRsaP\n  ...AssetMediaImage_asset\n  ...AssetMediaPlaceholderImage_asset\n  ...AssetMediaVideo_asset\n  ...AssetMediaWebgl_asset\n}\n\nfragment AssetMedia_asset_5MxNd on AssetType {\n  animationUrl\n  displayImageUrl\n  imageUrl\n  isDelisted\n  ...AssetMediaAnimation_asset\n  ...AssetMediaAudio_asset\n  ...AssetMediaContainer_asset_1LaGDz\n  ...AssetMediaImage_asset\n  ...AssetMediaPlaceholderImage_asset\n  ...AssetMediaVideo_asset\n  ...AssetMediaWebgl_asset\n}\n\nfragment CollectionCell_collection on CollectionType {\n  name\n  imageUrl\n  isVerified\n  ...collection_url\n}\n\nfragment CollectionCell_trait on TraitType {\n  traitType\n  value\n}\n\nfragment CollectionLink_assetContract on AssetContractType {\n  address\n  blockExplorerLink\n}\n\nfragment CollectionLink_collection on CollectionType {\n  name\n  slug\n  verificationStatus\n  ...collection_url\n}\n\nfragment EventTimestamp_data on AssetEventType {\n  eventTimestamp\n  transaction {\n    blockExplorerLink\n    id\n  }\n}\n\nfragment ItemCell_data on ItemType {\n  __isItemType: __typename\n  __typename\n  displayName\n  ...item_url\n  ...PortfolioTableItemCellTooltip_item\n  ... on AssetType {\n    ...AssetMedia_asset\n  }\n  ... on AssetBundleType {\n    assetQuantities(first: 30) {\n      edges {\n        node {\n          asset {\n            ...AssetMedia_asset\n            id\n          }\n          relayId\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment PortfolioTableItemCellTooltip_item on ItemType {\n  __isItemType: __typename\n  __typename\n  ...AssetMedia_asset_5MxNd\n  ...PortfolioTableTraitTable_asset\n  ...asset_url\n}\n\nfragment PortfolioTableTraitTable_asset on AssetType {\n  assetContract {\n    address\n    chain\n    id\n  }\n  isCurrentlyFungible\n  tokenId\n  ...asset_url\n}\n\nfragment ProfileImage_data on AccountType {\n  imageUrl\n}\n\nfragment RarityIndicator_data on RarityDataType {\n  rank\n  rankPercentile\n  rankCount\n  maxRank\n}\n\nfragment TokenPricePayment on PaymentAssetType {\n  symbol\n}\n\nfragment accounts_url on AccountType {\n  address\n  user {\n    publicUsername\n    id\n  }\n}\n\nfragment asset_url on AssetType {\n  assetContract {\n    address\n    id\n  }\n  tokenId\n  chain {\n    identifier\n  }\n}\n\nfragment bundle_url on AssetBundleType {\n  slug\n  chain {\n    identifier\n  }\n}\n\nfragment collection_url on CollectionType {\n  slug\n  isCategory\n}\n\nfragment item_url on ItemType {\n  __isItemType: __typename\n  __typename\n  ... on AssetType {\n    ...asset_url\n  }\n  ... on AssetBundleType {\n    ...bundle_url\n  }\n}\n\nfragment useIsRarityEnabled_collection on CollectionType {\n  slug\n  enabledRarities\n}\n\nfragment utilsAssetEventLabel on AssetEventType {\n  isMint\n  isAirdrop\n  eventType\n}\n\nfragment wallet_accountKey on AccountType {\n  address\n}\n",
            "variables": {
                "archetype": None,
                "categories": None,
                "chains": None,
                "collections": None,
                "count": 32,
                "cursor": None,
                "eventTimestamp_Gt": None,
                "eventTypes": [
                    "COLLECTION_OFFER",
                    "OFFER_ENTERED"
                ],
                "identity": {
                    "username": ""
                },
                "showAll": True,
                "stringTraits": [],
                "isRarityExpansionEnabled": True,
                "rarityFilter": None
            }
        }
    
    def log(self, lvl: int, msg: str):
        self.logger.log(level=lvl, msg=msg)
        print(msg)
    
    def load_config(self) -> 'tuple[bool, str]':
        
        try:
            with open("config.txt", encoding="utf8") as config:
                config = config.read().strip().replace("\r", "").split("\n")
                
                for item in config:
                    item = item.strip().split(" ")
                    
                    if item[0] == "user":
                        self.accounts.append(item[1])
                    elif item[0] == "blacklist":
                        self.blacklist.append(item[1])
                    elif item[0] == "eth_to_add":
                        self.eth_to_add = float(item[1])
                    elif item[0] == "exp_time":
                        self.exp_time = float(item[1])
                        
            return True, ""
        except Exception as e:
            return False, str(e)
        
    def send_offers(self, offers: 'list[dict]'):
        self.log(20, "Sending new offers...")
        
        offers: str = json.dumps(offers)
        p = subprocess.Popen(['node', './send_offers.js', offers])
        
        try:
            p.wait(60*30)
        except:
            p.terminate()
        
    def get_offers(self, account: str, fr: bool, et: str) -> 'tuple[bool, str] | tuple[bool, list[dict], str]':
        payload = self.payload
        payload["variables"]["identity"]["username"] = account
        
        if not fr:
            payload["variables"]["eventTimestamp_Gt"] = et
        
        for _ in range(self.retries):
            res = api.post(url=self.api_endpoint, json=payload, headers=self.headers, proxies=self.proxies, verify=False)
            
            try:
                if res.status_code == 200:
                    data = res.json()
                    
                    if data.get("data"):
                        data: list = data.get("data")["eventActivity"]["edges"]
                        
                        offers: 'list[dict]' = []
                        eventTimestamp = ""
                        
                        for i in range(len(data)):
                            offer: dict = data[i]["node"]
                            
                            if i == 0:
                                eventTimestamp = offer["eventTimestamp"]
                            
                            if self.blacklist.index(offer["collection"]["slug"]) != -1:
                               continue
                            
                            if offer["perUnitPrice"].get("eth", 0) == 0:
                                continue
                            
                            if offer["eventType"] == "TRAIT_OFFER":
                                offers.append(
                                    {
                                        "slug": offer["collection"]["slug"],
                                        "trait_type": offer["traitCriteria"]["traitType"],
                                        "trait_value": offer["traitCriteria"]["value"],
                                        "startAmount": float(offer["perUnitPrice"].get("eth", 0)) + self.eth_to_add,
                                        "quantity": offer["itemQuantity"],
                                        "type": "collection"
                                    }
                                )
                            else:
                                offers.append({
                                    "tokenId": offer["item"]["tokenId"],
                                    "tokenAddress": offer["assetContract"]["address"],
                                    "startAmount": float(offer["perUnitPrice"].get("eth", 0)) + self.eth_to_add,
                                    "type": "offer"
                                })
                        
                        return True, offers, eventTimestamp
                
            except Exception as e:
                return False, str(e), ""
            
            sleep(randint(3, 6))
        
        return False, "NO DATA & NO ERROR", ""
    
    def check_item_dont_exists(self, offer: dict, offers: 'list[dict]') -> 'tuple[bool, list]':
        for o in offers:
            if offer["type"] == "offer" and o["type"] == "offer":
                if offer["tokenId"] == o["tokenId"] and offer["tokenAddress"] == o["tokenAddress"]:
                    if offer["time"] + (60 * (self.exp_time + 3)) > round(time()):
                        return False, []
                    else:
                        offers = [_ for _ in offers if not (offer["tokenId"] == _["tokenId"] and offer["tokenAddress"] == _["tokenAddress"])]
                        return True, offers
            else:
                if offer["slug"] == o["slug"] and offer["trait_type"] == o["trait_type"] and offer["trait_value"] == o["trait_value"]:
                    if offer["time"] + (60 * (self.exp_time + 3)) > round(time()):
                        return False, []
                    else:
                        offers = [_ for _ in offers if not (offer["tokenId"] == _["tokenId"] and offer["tokenAddress"] == _["tokenAddress"])]
                        return True, offers
        
        return True, offers
    
    def filter_out_old_ones(self, offers: 'list[dict]') -> 'list[dict]':
        data = []
        with open("sent_offers.json", "r", encoding="utf8") as f:
            data = json.loads(f.read())
        
        if len(data) == 0:
            return offers
        
        filtered_offers = []
        
        for offer in offers:
            success, unique_offers = self.check_item_dont_exists(offer, data)
            
            if success:
                filtered_offers.append(offer)
                data = unique_offers
        
        with open("sent_offers.json", "w", encoding="utf8") as w_f:
            w_f.write(json.dumps(data))
        
        return filtered_offers
    
    def save_new_offers(self, offers: 'list[dict]', _time: int):
        data = []
        
        with open("sent_offers.json", "r", encoding="utf8") as f:
            data: 'list[dict]' = json.loads(f.read())
            
            for _ in offers:
                _["time"] = _time
            
            [data.append(offer) for offer in offers]
            
        with open("sent_offers.json", "w", encoding="utf8") as w_f:
            w_f.write(json.dumps(data))
    
    def monitor_account(self, account: str) -> None:
        fr = True
        et = ""
        
        while True:
            success, offers, eventTimestamp = self.get_offers(account, fr, et)
            
            if not success:
                self.log(40, offers)
                continue
            
            fr = False
            et = eventTimestamp
            
            offers = self.filter_out_old_ones(offers)
            offers_saving_time = round(time())
            
            if len(offers) == 0:
                continue
            
            self.save_new_offers(offers, offers_saving_time)
            
            Thread(target=self.send_offers, args=(offers, )).start()
            
            time_to_wait = (datetime.datetime.fromisoformat(eventTimestamp) - datetime.datetime.utcnow()).total_seconds() + 2
            
            if time_to_wait > 0:
                sleep(time_to_wait)
    
    def run(self):
        self.log(20, "Loading config & starting bot")
        success, error = self.load_config()
        
        if not success:
            self.log(40, error)
            sys.exit(1)
        
        pool = ThreadPool(len(self.accounts))
        results = pool.map(self.monitor_account, self.accounts)
        
        pool.close()
        pool.join()
        

if __name__ == "__main__":
    from shutup import mute_warnings
    mute_warnings()
    
    logging.basicConfig(filename="opensea_bidder.log", filemode='a', format='%(asctime)s,%(msecs)d %(name)s %(levelname)s %(message)s', datefmt='%H:%M:%S', level=logging.DEBUG)
    logger = logging.getLogger("OpenSeaBiddingLogger")
    
    bot = OpenSeaBidder(logger=logger)
    bot.run()
