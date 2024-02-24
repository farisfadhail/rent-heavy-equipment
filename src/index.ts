import { bool, Canister, Err, ic, int, int64, nat64, None, Null, Ok, Opt, Principal, query, Record, Result, StableBTreeMap, text, update, Vec, Void } from "azle";

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

const rentStorage = StableBTreeMap(0, Principal, rentalContract);

export default Canister({
	getAllContracts: query([], Vec(rentalContract), () => {
		return rentStorage.values();
	}),

	getContractById: query([Principal], Result(Opt(rentalContract), text), (id) => {
		const rent = rentStorage.get(id);

		if ("None" in rent) {
			return Err(`A rent contract with id=${id} not found`);
		}

		return Ok(rent);
	}),

	createContract: update([contractCreatePayload], Result(rentalContract, text), (payload) => {
		const contract: typeof rentalContract.tsType = { id: generateId(), createdAt: ic.time(), updatedAt: None, isCompleted: false, ...payload };
		rentStorage.insert(contract.id, contract);

		return Ok(contract);
	}),

	updateStatusContract: update([Principal, updateStatusPayload], Result(rentalContract, text), (id, payload) => {
		const rentOpt = rentStorage.get(id);

		if ("None" in rentOpt) {
			return Err(`A rent contract with id=${id} not found`);
		}

		const rent = rentOpt.Some;

		const updatedContract = Object.assign(rent, Object.assign(payload, { updatedAt: ic.time(), deposit: 0 }));
		rentStorage.insert(rent.id, updatedContract);

		return Ok(updatedContract);
	}),

	addAdditionalCost: update([Principal, additionalCostPayload], Result(rentalContract, text), (id, payload) => {
		const rentOpt = rentStorage.get(id);

		if ("None" in rentOpt) {
			return Err(`A rent contract with id=${id} not found`);
		}

		const rent = rentOpt.Some;

		const updatedContract = Object.assign(rent, { updatedAt: ic.time(), rentalFee: rent.rentalFee + payload.additionalCost });
		rentStorage.insert(rent.id, updatedContract);

		return Ok(updatedContract);
	}),
});

function generateId(): Principal {
	const randomBytes = new Array(29).fill(0).map((_) => Math.floor(Math.random() * 256));

	return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
