pragma solidity ^0.4.21;
pragma experimental ABIEncoderV2;

contract Finorm {
	struct Bill {
		int status;
		address to;
		uint 	amount;
		uint 	latestTime;
	}

	struct User {
		uint 	balance;
		uint 	bill;
		uint 	reputation;		// true->good, false->bad
		string  password;
		Bill [] bills;
		bool isValid;
	}

	address public issuer;
	mapping (address => User) public users;

	event CreateBill(uint time, address from, address to, uint amount);
	event TransferBill(uint time, address from, address mid, address to, uint amount);
	event RequestFinancing(address from, uint amount);
	event SettleBill(uint time, address from, address to, uint amount);
	event Log(uint index, Bill bill);

	function Finorm() public {
	}
	
	function setIssuer(address iss) public {
	    issuer = iss;
	}
	
	
	function Signin(address userAddr, string password) public view returns(bool pass, uint balance, uint bill, uint reputation) {
	    if (users[userAddr].isValid && keccak256(users[userAddr].password) == keccak256(password)) {
	        return (true, users[userAddr].balance, users[userAddr].bill, users[userAddr].reputation);
	    }
	    return (false, 0, 0, 0);
	}


	function SignUp(address newUser, string newKey) public returns(bool pass) {
	    if (users[newUser].isValid) {
	        return false;
	    }
		users[newUser].balance = 0;
		users[newUser].bill = 0;
		users[newUser].reputation = 1;
		users[newUser].isValid = true;
		users[newUser].password = newKey;
		return true;
	}


	function issue(address iss, address receiver, uint amount) public {
		if (iss != issuer && receiver == issuer) return;
		users[receiver].balance += amount;
	}
	
	
	function getBill(address querier, address ones) public {
	    for (uint i = 0; i < users[ones].bills.length; ++i) {
	        emit Log(i, users[ones].bills[i]);
	    }
	}


	function createBill(address payer, address payee, uint amount) public returns (uint, address, address, uint) {
	    uint time = now;
	    uint len = users[payer].bills.length;
	    (users[payer].bills.length)++;
		users[payer].bills[len] = (Bill(0, payee, amount, time));
		if (users[payer].reputation > users[payee].reputation)
			users[payee].reputation = users[payer].reputation;
		
		emit CreateBill(time, payer, payee, amount);
		return (time, payer, payee, amount);
	}


	function transferBill(uint time, address payer, address mid, address payee) public returns (uint, address, uint) {
		uint len = users[payer].bills.length;
		uint a;
		for (uint i = 0; i < len; ++i) {
			if (users[payer].bills[i].latestTime == time && users[payer].bills[i].to == payee) {
				uint amount = users[payer].bills[i].amount;
				uint len2 = users[mid].bills.length;
				a = amount;

				for (uint j = 0; j < len2 && amount > 0;) {
					if (users[mid].bills[j].to == payer) {
						if (amount >= users[mid].bills[j].amount) {
							amount -= users[mid].bills[j].amount;
							if (len2 > 1)
								users[mid].bills[j] = users[mid].bills[len2 - 1];
							delete users[mid].bills[--len2];
							--(users[mid].bills.length);
						}
						else {
							users[mid].bills[j].amount -= amount;
							amount = 0;
							++j;
						}
					}
					else {++j;}
				}
                
                if (amount > 0) {
                    users[payer].bills[i].amount = amount;
                }
				else if (a > 0 && amount <= 0) {
					if (len > 1)
						users[payer].bills[i] = users[payer].bills[len - 1];
					delete users[payer].bills[--len];
					--(users[payer].bills.length);
				}
				if (a - amount > 0) {
				    uint time1 = now;
				    len = users[mid].bills.length;
				    users[mid].bills.length++;
					users[mid].bills[len] = Bill(0, payee, a - amount, time1);
				}
				emit TransferBill(time1, payer, mid, payee, a - amount);
				return (time1, mid, a - amount);
			}
		}
	}


	function settleBill(address payer, uint time) public returns(uint) {
		uint len = users[payer].bills.length;
		uint amount;
		address payee;
		for(uint i = 0; i < len; ++i) {
			if (users[payer].bills[i].latestTime == time) {
				amount = users[payer].bills[i].amount;
				if (amount <= 0 || amount > users[payer].balance) {return 0;}
				payee = users[payer].bills[i].to;
				users[users[payer].bills[i].to].balance += amount;
				users[payer].balance -= amount;

				if (len > 1) {
					users[payer].bills[i] = users[payer].bills[len - 1];
				}
				delete users[payer].bills[len - 1];
				if (users[payer].bills.length > 0) {
				    (users[payer].bills.length)--;
				}
				
				emit SettleBill(time, payer, payee, amount);
				return amount;
			}
		}
		return 0;
	}


	function requestFinancing(address payer, address payee, uint time, uint amount) public returns (bool, uint) {
		if (payee == issuer || users[payer].reputation == 0) return;
		uint len = users[payer].bills.length;
		for (uint i = 0; i < len; ++i) {
			if (users[payer].bills[i].latestTime == time) {
				if (users[payer].bills[i].to == payee
				&& users[payer].bills[i].amount >= amount
				&& users[payer].bills[i].status == 0) {
				    users[payer].bills[i].status = 1;
					users[payee].balance += amount;
					users[payee].bill += amount;
					emit RequestFinancing(payee, amount);
				}
				return (true, amount);
			}
		}
		return (false, 0);		
	}


	function setRepution(address user, uint pre) public {
		if (msg.sender != issuer) return;
		users[user].reputation = pre;
	}
}
