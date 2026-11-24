# RentChain – Decentralized Equipment Rental DApp

RentChain is a Web3 application where people can rent out and rent expensive equipment (cameras, fishing rods, studio lights, chainsaws, pressure washers and more) using a crypto wallet such as MetaMask. A Solidity smart contract holds the security deposit in escrow and releases funds automatically when the owner confirms the equipment was returned, so no middleman is needed.

## Features

- Connect a MetaMask (or other browser) wallet and view your address, balance and network
- List equipment with a name, rental fee and security deposit (in ETH)
- Browse all listings with live status: Available, Rented, Completed or Cancelled
- Rent an item by paying the rental fee plus deposit in a single transaction
- Owner confirms the return: the deposit is refunded to the renter and the fee is paid to the owner
- Owner can cancel a listing that has not been rented yet
- Filter listings: all, available, my listings, rented by me
- Transaction feedback (pending, success, error) and automatic reload when the account or network changes

## Tech Stack

- **Smart contract:** Solidity ^0.8.0
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Blockchain library:** [ethers.js v6](https://docs.ethers.org/v6/) (loaded from a CDN)
- **Wallet:** MetaMask
- **Fonts:** Space Grotesk and JetBrains Mono (Google Fonts)

## Project Structure

```
.
├── index.html            # Page layout
├── style.css             # Styling (dark glassmorphism theme)
├── app.js                # Wallet connection and contract interaction
├── EquipmentRental.sol   # Smart contract
└── README.md
```

## How the Contract Works

Each item moves through a simple state machine:

```
Available ──rentItem──▶ Rented ──completeRental──▶ Completed
    │
    └──cancelItem──▶ Cancelled
```

| Function | Who can call | What it does |
|---|---|---|
| `createItem(name, fee, deposit)` | Anyone | Lists a new item as Available |
| `rentItem(id)` | Anyone except the owner | Pays fee + deposit (exact amount required); status becomes Rented |
| `completeRental(id)` | Item owner only | Refunds the deposit to the renter, pays the fee to the owner; status becomes Completed |
| `cancelItem(id)` | Item owner only | Cancels an Available item |

Events (`ItemCreated`, `ItemRented`, `ItemCompleted`, `ItemCancelled`) are emitted for every state change. State is updated before funds are transferred to guard against re-entrancy.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (only used to run a local web server and test chain)
- A browser with the [MetaMask](https://metamask.io/) extension

### 1. Start a local test blockchain

```bash
npx hardhat node
```

This runs a fake chain at `http://127.0.0.1:8545` with 20 test accounts, each holding 10,000 fake ETH. Keep this terminal open.

### 2. Configure MetaMask

Add a network manually:

- Network name: `Localhost`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Then import two of the test accounts using the private keys printed by Hardhat (Account menu, then Add account, then Import account). You need two accounts because an owner cannot rent their own item: one acts as the owner, the other as the renter.

> Only use the Hardhat test keys on the local chain. They are public and must never hold real funds.

### 3. Deploy the contract

1. Open [Remix IDE](https://remix.ethereum.org) and paste in `EquipmentRental.sol`
2. Compile it
3. Under Deploy & Run, set Environment to **Injected Provider – MetaMask** (with the Localhost network and the owner account selected)
4. Click **Deploy** and copy the deployed contract address

### 4. Configure the frontend

Open `app.js` and paste the address at the top:

```js
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
```

### 5. Serve the website

Do not open `index.html` by double-clicking it; wallet extensions usually do not work on `file://` pages. Serve the folder instead:

```bash
npx serve .
```

Then open the printed link (for example `http://localhost:3000`) in your browser.

## Demo Walkthrough

1. Connect as the **owner** and list an item, for example "Canon camera" with fee 1 and deposit 2.
2. Switch to the **renter** account in MetaMask, reload, connect, and click **Rent now**. The renter pays 3 ETH.
3. Switch back to the **owner** and click **Confirm return & settle**. The renter gets the 2 ETH deposit back and the owner receives the 1 ETH fee.

## Using a Public Testnet Instead

To deploy on Sepolia, select the Sepolia network in MetaMask and Remix, get free test ETH from a Sepolia faucet, deploy the contract, and paste the address into `app.js`. Transactions will take around 12 seconds each and can be viewed on Etherscan.

## Troubleshooting

| Problem | Fix |
|---|---|
| "No wallet found" alert | Serve the site via `localhost` instead of opening the file directly, or enable "Allow access to file URLs" for MetaMask in `edge://extensions` / `chrome://extensions`. Disable other wallet extensions that may conflict. |
| "Set CONTRACT_ADDRESS in app.js" | Deploy the contract and paste its address into `app.js`. |
| Items do not load | Make sure MetaMask is on the same network the contract was deployed to. |
| Nonce or transaction errors after restarting the Hardhat node | Redeploy the contract, update the address, and in MetaMask use Settings, Advanced, Clear activity tab data. |

## Known Limitations

- A completed item cannot be rented again; the owner must list it as a new item.
- The deposit is always refunded in full; there is no mechanism to deduct for damage or late returns.
- Only the owner can mark a rental as complete, so an unresponsive owner leaves the deposit locked.
- This project is a prototype for learning and demonstration and has not been security audited. Do not use it with real funds.

## License

MIT
