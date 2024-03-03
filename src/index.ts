import { bool, Canister, Err, ic, int, int64, nat, nat64, None, Null, Ok, Opt, Principal, query, Record, Result, StableBTreeMap, text, update, Variant, Vec, Void } from "azle";
import { v4 as uuidv4 } from "uuid";

const rentalContract = Record({
	id: Principal,
	equipment: text,
	owner: Principal,
	renter: Principal,
	startDate: int64, // Timestamp
	endDate: int64, // Timestamp
	rentalFee: int64,
	deposit: int64,
	isCompleted: bool,
	createdAt: nat64,
	updatedAt: Opt(nat64),
});

const contractCreatePayload = Record({
	equipment: text,
	owner: Principal,
	renter: Principal,
	startDate: int64, // Timestamp
	endDate: int64, // Timestamp
	rentalFee: int64,
	deposit: int64,
});

const updateStatusPayload = Record({
	isCompleted: bool,
});

const additionalCostPayload = Record({
	additionalCost: int64,
});

const rentContractError = Variant({
	NotFound: text,
	InvalidInput: text,
});

const rentStorage = StableBTreeMap(0, Principal, rentalContract);

export default Canister({
	getAllContracts: query([], Vec(rentalContract), () => {
		return rentStorage.values();
	}),

	getContractById: query([Principal], Result(Opt(rentalContract), rentContractError), (id) => {
		const rent = rentStorage.get(id);

		if ("None" in rent) {
			return Err({ NotFound: `A rent contract with id=${id} not found` });
		}

		return Ok(rent);
	}),

	createContract: update([contractCreatePayload], Result(rentalContract, rentContractError), (payload) => {
		// Validate inputs
		if (!payload.equipment || !payload.owner || !payload.renter || !payload.startDate || !payload.endDate || !payload.rentalFee || !payload.deposit) {
			return Err({ InvalidInput: "Missing required fields in the contract object" });
		}

		const contract: typeof rentalContract.tsType = { id: generateId(), createdAt: ic.time(), updatedAt: None, isCompleted: false, ...payload };
		rentStorage.insert(contract.id, contract);

		return Ok(contract);
	}),

	updateStatusContract: update([Principal, updateStatusPayload], Result(rentalContract, rentContractError), (id, payload) => {
		const rentOpt = rentStorage.get(id);

		if ("None" in rentOpt) {
			return Err({ NotFound: `A rent contract with id=${id} not found` });
		}

		const rent = rentOpt.Some;

		// Preserve the deposit
		const updatedContract = Object.assign(rent, Object.assign(payload, { updatedAt: ic.time() }));
		rentStorage.insert(rent.id, updatedContract);

		return Ok(updatedContract);
	}),

	addAdditionalCost: update([Principal, additionalCostPayload], Result(rentalContract, rentContractError), (id, payload) => {
		const rentOpt = rentStorage.get(id);

		if ("None" in rentOpt) {
			return Err({ NotFound: `A rent contract with id=${id} not found` });
		}

		const rent = rentOpt.Some;

		const updatedContract = Object.assign(rent, { updatedAt: ic.time(), rentalFee: rent.rentalFee + payload.additionalCost });
		rentStorage.insert(rent.id, updatedContract);

		return Ok(updatedContract);
	}),
});

function generateId(): Principal {
	// Use a more secure method like generating a UUID using a cryptographic library
	const randomBytes = Array.from(uuidv4(), (c) => c.charCodeAt(0));
	return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
