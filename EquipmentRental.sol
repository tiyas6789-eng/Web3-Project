// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EquipmentRental {

    // 1. Enum for Item Lifecycle States
    enum ItemStatus { Available, Rented, Completed, Cancelled }

    // 2. Struct to store Equipment and Rental details
    struct Item {
        uint id;
        address payable owner;
        string name;
        uint rentalFee;
        uint depositAmount;
        ItemStatus status;
        address payable renter;
    }

    // 3. State variables & Mappings
    uint public itemCount;
    mapping(uint => Item) public items;

    // 4. Events for auditability and frontend tracking
    event ItemCreated(uint indexed id, string name, uint rentalFee, uint depositAmount, address owner);
    event ItemRented(uint indexed id, address renter);
    event ItemCompleted(uint indexed id);
    event ItemCancelled(uint indexed id);

    // 5. Modifiers for strict Access Control
    modifier onlyOwner(uint _id) {
        require(msg.sender == items[_id].owner, "Only the item owner can perform this action");
        _;
    }

    // --- Core Functions ---

    // 1. List a new piece of equipment
    function createItem(string memory _name, uint _rentalFee, uint _depositAmount) public {
        require(_rentalFee > 0, "Rental fee must be greater than zero");
        require(_depositAmount > 0, "Deposit amount must be greater than zero");

        itemCount++;
        items[itemCount] = Item({
            id: itemCount,
            owner: payable(msg.sender),
            name: _name,
            rentalFee: _rentalFee,
            depositAmount: _depositAmount,
            status: ItemStatus.Available,
            renter: payable(address(0))
        });

        emit ItemCreated(itemCount, _name, _rentalFee, _depositAmount, msg.sender);
    }

    // 2. Rent an item by paying (Rental Fee + Security Deposit) upfront
    function rentItem(uint _id) public payable {
        Item storage item = items[_id];

        require(item.status == ItemStatus.Available, "Item is not available for rent");
        require(msg.value == item.rentalFee + item.depositAmount, "Incorrect payment: Must match Rental Fee + Deposit");
        require(msg.sender != item.owner, "Owner cannot rent their own equipment");

        item.status = ItemStatus.Rented;
        item.renter = payable(msg.sender);

        emit ItemRented(_id, msg.sender);
    }

    // 3. Complete Rental: Owner confirms safe return, deposit refunded to renter, fee goes to owner
    function completeRental(uint _id) public onlyOwner(_id) {
        Item storage item = items[_id];

        require(item.status == ItemStatus.Rented, "Item is not currently in rented state");

        item.status = ItemStatus.Completed;

        uint fee = item.rentalFee;
        uint deposit = item.depositAmount;
        address payable renterAddress = item.renter;
        address payable ownerAddress = item.owner;

        // Clear state before transferring funds (prevents re-entrancy)
        item.renter = payable(address(0));

        // Refund security deposit back to the renter
        (bool successRenter, ) = renterAddress.call{value: deposit}("");
        require(successRenter, "Failed to refund deposit to renter");

        // Send rental fee to the owner
        (bool successOwner, ) = ownerAddress.call{value: fee}("");
        require(successOwner, "Failed to send rental fee to owner");

        emit ItemCompleted(_id);
    }

    // 4. Cancel an item listing (Only if it hasn't been rented yet)
    function cancelItem(uint _id) public onlyOwner(_id) {
        Item storage item = items[_id];
        require(item.status == ItemStatus.Available, "Cannot cancel an item that is already rented or completed");

        item.status = ItemStatus.Cancelled;
        emit ItemCancelled(_id);
    }
}
