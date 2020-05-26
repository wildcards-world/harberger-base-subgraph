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
import * as V2 from "./v2/steward";
import * as NEW from "./rewrite/steward";
export function handleAddToken(event: AddToken): void {
  log.warning("WE ARE ADDING A TOKEN!", []);
  V2.handleAddToken(event);
}

export function handleBuy(event: Buy): void {
  V2.handleBuy(event);
}
export function handlePriceChange(event: PriceChange): void {
  V2.handlePriceChange(event);
}
export function handleForeclosure(event: Foreclosure): void {
  V2.handleForeclosure(event);
}
export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  V2.handleRemainingDepositUpdate(event);
}
export function handleCollectPatronage(event: CollectPatronage): void {
  V2.handleCollectPatronage(event);
  NEW.genericUpdateTimeHeld(
    event.params.patron,
    event.block.timestamp,
    Steward.bind(event.address),
    event.params.tokenId
  );
}
export function handleAddTokenV2(event: AddToken): void {
  V2.handleAddToken(event);
}

export function handleCollectLoyalty(event: CollectLoyalty): void {
  NEW.handleCollectLoyalty(event);
}
