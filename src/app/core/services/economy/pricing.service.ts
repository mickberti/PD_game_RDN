import { Injectable } from "@angular/core";

import { PriceItem, PriceType } from "../../models/game.models";

export interface CurrencyBalances { coin: number; gem: number; dust: number; }

/** Minimal currency utility retained for events; it has no item-catalog dependencies. */
@Injectable({ providedIn: "root" })
export class PricingService {
  createPrice(type: PriceType, amount: number): PriceItem {
    const frame = type === "coin" ? { name: "coin_single", effect: "none" as const } : type === "gem" ? { name: "crystal_single", effect: "none" as const } : { name: "magic_dust_single", effect: "none" as const };
    return { type, amount: Math.max(1, Math.floor(amount)), frame };
  }

  canAfford(price: PriceItem, balances: CurrencyBalances): boolean { return balances[price.type] >= price.amount; }

  debit(price: PriceItem, balances: CurrencyBalances): CurrencyBalances | null {
    if (!this.canAfford(price, balances)) return null;
    return { ...balances, [price.type]: balances[price.type] - price.amount };
  }
}
