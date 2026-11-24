// ============================================================
//  CONFIG – paste your deployed contract address here
// ============================================================
const CONTRACT_ADDRESS = "0xB5189E1e6EbC4c4d27412Bd0b7102EA550Fba0Ff";

// Human-readable ABI (ethers v6) matching EquipmentRental.sol
const CONTRACT_ABI = [
    "function itemCount() view returns (uint256)",
    "function items(uint256) view returns (uint256 id, address owner, string name, uint256 rentalFee, uint256 depositAmount, uint8 status, address renter)",
    "function createItem(string _name, uint256 _rentalFee, uint256 _depositAmount)",
    "function rentItem(uint256 _id) payable",
    "function completeRental(uint256 _id)",
    "function cancelItem(uint256 _id)",
    "event ItemCreated(uint256 indexed id, string name, uint256 rentalFee, uint256 depositAmount, address owner)",
    "event ItemRented(uint256 indexed id, address renter)",
    "event ItemCompleted(uint256 indexed id)",
    "event ItemCancelled(uint256 indexed id)"
];

const STATUS = ["Available", "Rented", "Completed", "Cancelled"];

document.addEventListener("DOMContentLoaded", () => {

    // --- DOM elements ---
    const connectButton = document.getElementById("connectButton");
    const connectionStatus = document.getElementById("connectionStatus");
    const accountArea = document.getElementById("accountArea");
    const balanceArea = document.getElementById("balanceArea");
    const networkBadge = document.getElementById("networkBadge");
    const getDataButton = document.getElementById("getDataButton");
    const valueArea = document.getElementById("valueArea");
    const itemsGrid = document.getElementById("itemsGrid");
    const filterSelect = document.getElementById("filterSelect");
    const createForm = document.getElementById("createForm");
    const toastEl = document.getElementById("toast");

    // --- State ---
    let provider, signer, contract, userAddress;
    let allItems = [];

    // --- Helpers ---
    function toast(message, type = "") {
        toastEl.textContent = message;
        toastEl.className = "toast " + type;
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toastEl.classList.add("hidden"), 4500);
    }

    function shortAddr(a) {
        return a.slice(0, 6) + "…" + a.slice(-4);
    }

    function errMsg(e) {
        return e.reason || e.shortMessage || (e.info && e.info.error && e.info.error.message) || e.message || "Unknown error";
    }

    function iconFor(name) {
        const n = name.toLowerCase();
        if (n.includes("camera") || n.includes("lens")) return "📷";
        if (n.includes("fish")) return "🎣";
        if (n.includes("light") || n.includes("lamp") || n.includes("strobe")) return "💡";
        if (n.includes("chainsaw") || n.includes("saw")) return "🪚";
        if (n.includes("pressure") || n.includes("wash")) return "🚿";
        if (n.includes("drill") || n.includes("tool")) return "🛠️";
        if (n.includes("drone")) return "🚁";
        if (n.includes("tent") || n.includes("camp")) return "⛺";
        return "📦";
    }

    function requireContract() {
        if (!contract) {
            toast("Please connect your wallet first.", "error");
            return false;
        }
        return true;
    }

    // --- Connect Wallet ---
    connectButton.addEventListener("click", connectWallet);

    async function connectWallet() {
        if (typeof window.ethereum === "undefined") {
            alert("No wallet found! Please install MetaMask (or another browser wallet).");
            connectionStatus.innerText = "Wallet Not Found";
            return;
        }
        try {
            connectionStatus.innerText = "Connecting...";
            provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();

            if (!ethers.isAddress(CONTRACT_ADDRESS)) {
                connectionStatus.innerText = "Connected (contract address not set)";
                accountArea.innerText = userAddress;
                toast("Set CONTRACT_ADDRESS in app.js to your deployed contract.", "error");
                return;
            }

            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            connectionStatus.innerText = "Connected";
            accountArea.innerText = shortAddr(userAddress);
            accountArea.title = userAddress;
            connectButton.innerText = "Connected";
            connectButton.classList.add("connected");
            connectButton.disabled = true;

            await updateWalletInfo();
            await loadItems();
        } catch (error) {
            console.error("Connection failed:", error);
            connectionStatus.innerText = "Connection Rejected";
            toast(errMsg(error), "error");
        }
    }

    async function updateWalletInfo() {
        const [balance, network] = await Promise.all([
            provider.getBalance(userAddress),
            provider.getNetwork()
        ]);
        balanceArea.innerText = Number(ethers.formatEther(balance)).toFixed(4) + " ETH";
        networkBadge.innerText = network.name === "unknown" ? "Chain " + network.chainId : network.name;
        networkBadge.classList.remove("hidden");
    }

    // React to wallet changes
    if (window.ethereum) {
        window.ethereum.on("accountsChanged", () => window.location.reload());
        window.ethereum.on("chainChanged", () => window.location.reload());
    }

    // --- Load items ---
    getDataButton.addEventListener("click", loadItems);
    filterSelect.addEventListener("change", renderItems);

    async function loadItems() {
        if (!requireContract()) return;
        try {
            valueArea.innerText = "Fetching...";
            const count = Number(await contract.itemCount());
            valueArea.innerText = count;

            const fetched = [];
            for (let i = 1; i <= count; i++) {
                const it = await contract.items(i);
                fetched.push({
                    id: Number(it.id),
                    owner: it.owner,
                    name: it.name,
                    rentalFee: it.rentalFee,
                    depositAmount: it.depositAmount,
                    status: Number(it.status),
                    renter: it.renter
                });
            }
            allItems = fetched;
            renderItems();
            await updateWalletInfo();
        } catch (error) {
            console.error("Error loading items:", error);
            valueArea.innerText = "Error";
            toast("Could not load items. Check network & contract address.", "error");
        }
    }

    // --- Render ---
    function renderItems() {
        const filter = filterSelect.value;
        const me = (userAddress || "").toLowerCase();

        const list = allItems.filter(it => {
            if (filter === "available") return it.status === 0;
            if (filter === "mine") return it.owner.toLowerCase() === me;
            if (filter === "rented-by-me") return it.renter.toLowerCase() === me && it.status === 1;
            return true;
        });

        itemsGrid.innerHTML = "";
        if (list.length === 0) {
            const p = document.createElement("p");
            p.className = "muted";
            p.textContent = "No equipment to show.";
            itemsGrid.appendChild(p);
            return;
        }

        list.slice().reverse().forEach(it => itemsGrid.appendChild(buildCard(it, me)));
    }

    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function row(label, value, extraClass) {
        const r = el("div", "row" + (extraClass ? " " + extraClass : ""));
        r.appendChild(el("span", "", label));
        r.appendChild(el("span", "", value));
        return r;
    }

    function buildCard(it, me) {
        const card = el("div", "item-card");
        const isOwner = it.owner.toLowerCase() === me;
        const isRenter = it.renter.toLowerCase() === me;
        const total = it.rentalFee + it.depositAmount;

        card.appendChild(el("div", "item-icon", iconFor(it.name)));
        card.appendChild(el("h3", "item-title", it.name));
        card.appendChild(el("span", "status " + STATUS[it.status].toLowerCase(), STATUS[it.status]));

        card.appendChild(row("Rental fee", ethers.formatEther(it.rentalFee) + " ETH"));
        card.appendChild(row("Deposit (refundable)", ethers.formatEther(it.depositAmount) + " ETH"));
        card.appendChild(row("Pay upfront", ethers.formatEther(total) + " ETH", "total"));

        const ownerLine = el("div", "small-addr", "Owner: " + shortAddr(it.owner) + (isOwner ? " (you)" : ""));
        card.appendChild(ownerLine);
        if (it.status === 1) {
            card.appendChild(el("div", "small-addr", "Renter: " + shortAddr(it.renter) + (isRenter ? " (you)" : "")));
        }

        // Action buttons depending on role & state
        if (it.status === 0 && !isOwner) {
            const b = el("button", "btn-primary", "Rent now");
            b.addEventListener("click", () => rentItem(it, b));
            card.appendChild(b);
        }
        if (it.status === 1 && isOwner) {
            const b = el("button", "btn-success", "Confirm return & settle");
            b.addEventListener("click", () => completeRental(it, b));
            card.appendChild(b);
        }
        if (it.status === 0 && isOwner) {
            const b = el("button", "btn-danger", "Cancel listing");
            b.addEventListener("click", () => cancelItem(it, b));
            card.appendChild(b);
        }
        return card;
    }

    // --- Transactions ---
    async function sendTx(button, label, txFactory, successMsg) {
        const original = button ? button.textContent : "";
        try {
            if (button) { button.disabled = true; button.textContent = "Confirm in wallet..."; }
            const tx = await txFactory();
            toast(label + ": waiting for confirmation...");
            if (button) button.textContent = "Mining...";
            await tx.wait();
            toast(successMsg, "success");
            await loadItems();
        } catch (error) {
            console.error(label + " failed:", error);
            toast(errMsg(error), "error");
            if (button) { button.disabled = false; button.textContent = original; }
        }
    }

    function rentItem(it, button) {
        return sendTx(button, "Rent", () =>
            contract.rentItem(it.id, { value: it.rentalFee + it.depositAmount }),
            "Item rented! Deposit is held by the contract.");
    }

    function completeRental(it, button) {
        return sendTx(button, "Complete", () => contract.completeRental(it.id),
            "Rental completed: deposit refunded, fee paid to you.");
    }

    function cancelItem(it, button) {
        return sendTx(button, "Cancel", () => contract.cancelItem(it.id),
            "Listing cancelled.");
    }

    createForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!requireContract()) return;

        const name = document.getElementById("itemName").value.trim();
        const feeStr = document.getElementById("itemFee").value;
        const depStr = document.getElementById("itemDeposit").value;

        let fee, deposit;
        try {
            fee = ethers.parseEther(feeStr);
            deposit = ethers.parseEther(depStr);
        } catch {
            toast("Please enter valid ETH amounts.", "error");
            return;
        }
        if (!name || fee <= 0n || deposit <= 0n) {
            toast("Name, fee and deposit are all required and must be > 0.", "error");
            return;
        }

        const submitBtn = createForm.querySelector("button[type=submit]");
        await sendTx(submitBtn, "List", () => contract.createItem(name, fee, deposit),
            "Equipment listed!");
        submitBtn.disabled = false;
        submitBtn.textContent = "List item";
        createForm.reset();
    });
});
