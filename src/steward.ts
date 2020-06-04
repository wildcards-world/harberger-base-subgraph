import { log } from "@graphprotocol/graph-ts";
import {
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken,
  Buy,
  PriceChange,
  Foreclosure,
  RemainingDepositUpdate,
  CollectPatronage,
  Steward,
  CollectLoyalty,
} from "../generated/Steward/Steward";
import * as lib from "./logic/steward";
import * as NEW from "./rewrite/steward";

export function handleBuy(event: Buy): void {
  lib.handleBuy(event);
}
export function handlePriceChange(event: PriceChange): void {
  lib.handlePriceChange(event);
}
export function handleForeclosure(event: Foreclosure): void {
  lib.handleForeclosure(event);
}
export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  lib.handleRemainingDepositUpdate(event);
}
export function handleCollectPatronage(event: CollectPatronage): void {
  lib.handleCollectPatronage(event);
  NEW.genericUpdateTimeHeld(
    event.params.patron,
    event.block.timestamp,
    Steward.bind(event.address),
    event.params.tokenId
  );
}
export function handleAddToken(event: AddToken): void {
  log.warning("WE ARE ADDING A TOKEN!", []);
  lib.handleAddToken(event);
}

export function handleCollectLoyalty(event: CollectLoyalty): void {
  // NEW.handleCollectLoyalty(event);
}
