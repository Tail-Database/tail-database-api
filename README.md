# Tail Database API

This REST API is used by [taildatabase.com](https://www.taildatabase.com/) as well as Wallets, Exchanges, DEXs, Blockchain Explorers, and other applications that want to interact with Tail Database on DataLayer.

## Endpoints

* `GET /tail` - get all tails
* `GET /tail/:hash` - get a specific tail
* `POST /tail` - add a tail (only works from store owner)
* `GET /batch/insert` - add many tails (only works from store owner)
* `GET /tail/reveal/:eveCoinId` - get CLVM tail reveal from any CAT coin (eve coin is fastest)
* `GET /nft/:launcherId` - get URI of a NFT from the launcher id
