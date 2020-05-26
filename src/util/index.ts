import { Steward } from "../../generated/Steward/Steward";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  Patron,
  StateChange,
  EventCounter,
  Global,
  Wildcard,
  TokenUri,
  Price,
} from "../../generated/schema";
import {
  ZERO_ADDRESS,
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT,
} from "../CONSTANTS";
import { Token } from "../../generated/Token/Token";

export function minBigInt(first: BigInt, second: BigInt): BigInt {
  if (BigInt.compare(first, second) < 0) {
    return first;
  } else {
    return second;
  }
}

// This currently only works with strings, because assembly script is shit... (the tests do pass when this is a template parameter though :) )
export function removeFromArrayAtIndex(
  array: Array<string>,
  index: i32
): Array<string> {
  if (array.length > index && index > -1) {
    return array.slice(0, index).concat(array.slice(index + 1, array.length));
  } else {
    return array;
  }
}

function createNO_OWNERPatron(address: Address, txTimestamp: BigInt): Patron {
  let addressString = address.toHexString();
  let patron = new Patron("NO_OWNER");
  patron.address = address;
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.totalContributed = BigInt.fromI32(0);
  patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
  patron.tokens = [];
  patron.lastUpdated = txTimestamp;
  patron.previouslyOwnedTokens = [];

  patron.availableDeposit = BigInt.fromI32(0);
  patron.foreclosureTime = BigInt.fromI32(0);
  // # deposit: BigInt!

  patron.save();
  return patron;
}

// export function updateGlobalState(steward: Steward, txTimestamp: BigInt): void {
//   let globalState = Global.load("1");
//   globalState.totalCollectedAccurate = getTotalCollectedAccurate(steward);
//   globalState.totalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
//     steward
//   );
//   let totalOwed = getTotalOwedAccurate(steward);
//   globalState.totalCollectedOrDueAccurate = globalState.totalCollectedAccurate.plus(
//     totalOwed
//   );
//   // BUG!
//   // This code below is inaccurate because the `timeLastCollected` isn't correct. Should have `timeLastCalculatedCollection` as separate variable
//   // globalState.totalCollectedOrDue = globalState.totalCollectedOrDue.plus(
//   //   totalTokenCostScaledNumerator
//   //     .times(txTimestamp.minus(globalState.timeLastCollected))
//   //     .div(
//   //       steward
//   //         .patronageDenominator()
//   //         .times(BigInt.fromI32(NUM_SECONDS_IN_YEAR))
//   //     )
//   // );
//   globalState.timeLastCollected = txTimestamp;
//   globalState.save();
// }

export function getForeclosureTimeSafe(
  steward: Steward,
  tokenPatron: Address
): BigInt {
  let tryForeclosureTime = steward.try_foreclosureTimePatron(tokenPatron); // this call can error if the combined price of the patrons token is zero (divide by zero error)!
  if (tryForeclosureTime.reverted) {
    return BigInt.fromI32(0);
  } else {
    let patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
      tokenPatron
    );
    if (patronTokenCostScaledNumerator.equals(BigInt.fromI32(0))) {
      // NOTE: this case is logically impossible, but just added for extra safety...
      return BigInt.fromI32(0);
    } else {
      return tryForeclosureTime.value;
    }
  }
}

export function initialiseDefaultPatronIfNull(
  steward: Steward,
  patronAddress: Address,
  txTimestamp: BigInt
): Patron {
  let patronId = patronAddress.toHexString();
  let patron = new Patron(patronId);
  patron.address = patronAddress;
  patron.lastUpdated = txTimestamp;
  patron.availableDeposit = steward.depositAbleToWithdraw(patronAddress);
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patronAddress
  );
  patron.foreclosureTime = getForeclosureTimeSafe(steward, patronAddress);
  patron.totalContributed = BigInt.fromI32(0);
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.tokens = [];
  patron.previouslyOwnedTokens = [];
  patron.save();
  return patron;
}

export function updateAvailableDepositAndForeclosureTime(
  steward: Steward,
  tokenPatron: Address,
  txTimestamp: BigInt
): void {
  // if the token patron is the zero address, return! (for example it will be the zero address if the token is foreclosed and )
  if (tokenPatron.equals(ZERO_ADDRESS)) {
    return;
  }

  // if the steward 'owns' the token, it means that the token was foreclosed. No need to update anything.
  if (steward._address.equals(tokenPatron)) {
    return;
  }

  let tokenPatronStr = tokenPatron.toHexString();

  let patron = Patron.load(tokenPatronStr);

  if (patron == null) {
    patron = initialiseDefaultPatronIfNull(steward, tokenPatron, txTimestamp);
    return;
  }

  let heldUntil = minBigInt(patron.foreclosureTime, txTimestamp);
  let timeSinceLastUpdate = heldUntil.minus(patron.lastUpdated);
  patron.totalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(GLOBAL_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  patron.totalTimeHeld = patron.totalTimeHeld.plus(
    timeSinceLastUpdate.times(BigInt.fromI32(patron.tokens.length))
  );
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patron.address as Address
  );
  patron.availableDeposit = steward.depositAbleToWithdraw(tokenPatron);
  patron.foreclosureTime = getForeclosureTimeSafe(steward, tokenPatron);
  patron.lastUpdated = txTimestamp;
  patron.save();
}

export function createEventCounter(): EventCounter {
  let eventCounter = new EventCounter("1");
  eventCounter.buyEventCount = BigInt.fromI32(0);
  eventCounter.changePriceEventCount = BigInt.fromI32(0);
  eventCounter.buyEvents = [];
  eventCounter.stateChanges = [];
  return eventCounter;
}

// NOTE: it is impossible for this code to return null, the compiler is just retarded!
export function getOrInitialiseStateChange(txId: string): StateChange | null {
  log.warning("ERROR 1", []);

  let stateChange = StateChange.load(txId);

  log.warning("ERROR 2", []);
  if (stateChange == null) {
    log.warning("ERROR 3", []);
    stateChange = new StateChange(txId);
    log.warning("ERROR 4", []);
    stateChange.txEventList = [];
    log.warning("ERROR 5", []);
    stateChange.patronChanges = [];
    log.warning("ERROR 6", []);
    stateChange.wildcardChanges = [];
    log.warning("ERROR 7", []);

    let eventCounter = EventCounter.load("1");
    if (eventCounter == null) {
      eventCounter = createEventCounter();
    }
    log.warning("ERROR 8", []);
    eventCounter.stateChanges = eventCounter.stateChanges.concat([
      stateChange.id,
    ]);
    log.warning("ERROR 9", []);
    eventCounter.save();
    log.warning("ERROR 10", []);

    return stateChange;
  } else {
    log.warning("ERROR SIMPLE RETURN", []);
    return stateChange;
  }
}

export function recognizeStateChange(
  txHash: string,
  changeType: string,
  changedPatrons: string[],
  changedWildcards: string[],
  txTimestamp: BigInt
): void {
  log.warning("state-change 1", []);
  let stateChange = getOrInitialiseStateChange(txHash);
  log.warning("state-change 2", []);
  stateChange.txEventList = stateChange.txEventList.concat([changeType]);
  log.warning("state-change 3", []);
  for (let i = 0, len = changedPatrons.length; i < len; i++) {
    log.warning("state-change 4", []);
    stateChange.patronChanges =
      stateChange.patronChanges.indexOf(changedPatrons[i]) === -1
        ? stateChange.patronChanges.concat([changedPatrons[i]])
        : stateChange.patronChanges;
  }
  log.warning("state-change 5", []);
  for (let i = 0, len = changedWildcards.length; i < len; i++) {
    log.warning("state-change 6", []);
    stateChange.wildcardChanges =
      stateChange.wildcardChanges.indexOf(changedWildcards[i]) === -1
        ? stateChange.wildcardChanges.concat([changedWildcards[i]])
        : stateChange.wildcardChanges;
  }
  log.warning("state-change 7", []);
  stateChange.timestamp = txTimestamp;
  log.warning("state-change 8", []);
  stateChange.save();
  log.warning("state-change 9", []);
}

export function updateForeclosedTokens(
  foreclosedPatron: Address,
  steward: Steward
): void {
  /**
   * PHASE 1 - load data
   */

  // TODO: this function isn't complete. Revisit.
  let foreclosedPatronString = foreclosedPatron.toHexString();
  let patronOld = Patron.load(foreclosedPatronString);

  /**
   * PHASE 2 - update data
   */
  // TODO: update Vitalik wildcard entity also.

  let prevTokens = patronOld.previouslyOwnedTokens;
  // NOTE: this shouldn't be necessary, `previouslyOwnedTokens` is updated for the patron when the token is bought.
  for (let i = 0; i < patronOld.previouslyOwnedTokens.length; ++i) {
    // patron
    let currentToken = prevTokens[i];
    patronOld.previouslyOwnedTokens =
      patronOld.previouslyOwnedTokens.indexOf(currentToken) === -1
        ? patronOld.previouslyOwnedTokens.concat([currentToken])
        : patronOld.previouslyOwnedTokens;
  }
  patronOld.tokens = []; // NOTE: Only safe to do this because Simon held Legacy vitalik the whole time (otherwise would need to check if this user held legacy vitalik).
  patronOld.lastUpdated = steward.timeLastCollectedPatron(foreclosedPatron); // TODO: double check this.

  /**
   * PHASE 3 - save data
   */
  patronOld.save();
}

export function handleAddTokenUtil(
  tokenId: BigInt,
  txTimestamp: BigInt,
  patronageNumerator: BigInt,
  wildcard: Wildcard,
  steward: Steward,
  txHashStr: string
): void {
  // log.warning("1", []);
  let tokenAddress = steward.assetToken();
  // log.warning("2", []);
  let erc721 = Token.bind(tokenAddress);
  // log.warning("3", []);

  let tokenInfo = erc721.tokenURI(tokenId);
  // log.warning("4", []);

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString());
  // log.warning("5", []);
  tokenUri.uriString = tokenInfo;
  // log.warning("6", []);
  tokenUri.save();
  // log.warning("7", []);

  wildcard.tokenUri = tokenUri.id;
  // log.warning("8", []);
  wildcard.tokenId = tokenId;
  // log.warning("9", []);
  wildcard.totalCollected = BigInt.fromI32(0);
  // log.warning("10", []);
  wildcard.timeCollected = txTimestamp;
  // log.warning("11", []);

  let price = new Price(txHashStr);
  // log.warning("12", []);
  price.price = BigInt.fromI32(0);
  // log.warning("13", []);
  price.timeSet = txTimestamp;
  // log.warning("14", []);
  price.save();
  // log.warning("15", []);

  let patron = Patron.load("NO_OWNER");
  // log.warning("16", []);
  if (patron == null) {
    patron = createNO_OWNERPatron(steward._address, txTimestamp);
  }
  // log.warning("17", []);

  wildcard.price = price.id;
  // log.warning("18", []);
  wildcard.owner = patron.id;
  // log.warning("19", []);
  wildcard.patronageNumerator = patronageNumerator;
  // log.warning("20", []);
  wildcard.patronageNumeratorPriceScaled = BigInt.fromI32(0);
  // log.warning("21", []);
  wildcard.timeAcquired = txTimestamp;
  // log.warning("22", []);
  wildcard.previousOwners = [];
  // log.warning("23", []);

  wildcard.save();
  // log.warning("24", []);
}

export function getTokenBalance(
  user: Address,
  loyaltyToken: LoyaltyToken
): BigInt {
  return loyaltyToken.balanceOf(user);
}

export function getTokenBalanceWithSteward(
  user: Address,
  stewardAddress: Address
): BigInt {
  let loyaltyToken: LoyaltyToken;
  if (
    stewardAddress.toHexString() == "0x6d47cf86f6a490c6410fc082fd1ad29cf61492d0"
  ) {
    loyaltyToken = LoyaltyToken.bind(
      Address.fromString("0x773c75c2277ed3e402bdefd28ec3b51a3afbd8a4")
    );
  } else if (
    stewardAddress.toHexString() == "0x0c00cfe8ebb34fe7c31d4915a43cde211e9f0f3b"
  ) {
    loyaltyToken = LoyaltyToken.bind(
      Address.fromString("0xd7d8c42ab5b83aa3d4114e5297989dc27bdfb715")
    );
  } else {
    log.critical("UNKNOWN NETWORK", []);
  }

  return getTokenBalance(user, loyaltyToken);
}

export function updateAllOfPatronsTokensLastUpdated(
  patron: Patron | null,
  steward: Steward,
  trackingString: string
): void {
  if (patron == null) {
    log.critical("patron should always be defined", []);
    return;
  }

  let patronsTokens: Array<string> = patron.tokens;

  for (let i = 0, len = patronsTokens.length; i < len; i++) {
    let wildcardId = patronsTokens[i];

    let wildcard = Wildcard.load(wildcardId);

    wildcard.timeCollected = steward.timeLastCollected(wildcard.tokenId);

    wildcard.save();
  }
  log.warning("6 updateAllOfPatronsTokens, patron {}, -- {}", [
    patron.id,
    trackingString,
  ]);
}
