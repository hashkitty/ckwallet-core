# Overview
CK wallet core library is a part of CK wallet community project to create an easy-to-use native application for interacting with cryptokitties smart contracts. Library, applications and its souce code can be used free of charge under MIT licences.

# CK Wallet design principals
- CK wallet is an open source and open contribution project
- CK wallet is autonomous application and its essential functions should not depend on availability of centralized services or APIs (e.g. api.cryptokitties.co)
- CK wallet provides user interface in form native desktop application. Native application should be able to execute on various platforms (cross-platform). Native application is not resource intensive and should be able to execute effectively on a PC with limited resources.
- CK wallet provides command line interface (cli) to allow task automation and custom scripting
- CK wallet provides reusable API for custom development.

# CK Wallet core library
- Provides API for creation of local database synchronized with CK smart contract
- Provides API for easy interaction with local database including: data synchronization with smart contract, querying data.
- Provides API for easy interaction with CK smart contracts

See [Architecture](/hashkitty/ckwallet-core/wiki/Architecture) for more info.

# Roadmap
- v0.1 - Kitty data synchronization to local database (synchronization worker).
- v0.2 - Auction data synchronization to local database. API to run simple read queries against database.
- v0.3 - Improved synchronization process


