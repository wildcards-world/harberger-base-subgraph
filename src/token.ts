import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  Token,
  MinterAdded,
  MinterRemoved,
  Transfer,
  Approval,
  ApprovalForAll,
} from "../generated/Token/Token";
import {} from "../generated/schema";

export function handleMinterAdded(event: MinterAdded): void {}

export function handleMinterRemoved(event: MinterRemoved): void {}

export function handleTransfer(event: Transfer): void {
  log.warning("Moving the token", []);
}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}
