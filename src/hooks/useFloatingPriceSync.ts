import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAuth } from "../contexts/AuthContext";
import { pricePatches } from "../lib/priceAnchor";
import { queryKeys } from "../lib/query-keys";
import { listAllProducts, patchProduct } from "../services/products";
import { useRateValue } from "./useRateValue";

/**
 * Keeps anchored selling prices in sync with the live exchange rate:
 * `unit_price = usd anchor × rate`, PATCHed once per rate change. Products with
 * no anchor get one written on first load, pinned to the price stored today.
 *
 * Silent by design — pricing runs in the background of an already-authenticated
 * session; a failed PATCH is remembered for the session instead of retrying so
 * an invalid product can never spin the invalidation loop.
 */
export function useFloatingPriceSync(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rate = useRateValue();
  const syncing = useRef(false);
  const failed = useRef(new Set<number>());

  const { data: products } = useQuery({
    queryKey: [...queryKeys.products.all, "sync"],
    queryFn: listAllProducts,
    enabled: user != null,
    staleTime: 5 * 60 * 1000,
  });

  const items = products;

  useEffect(() => {
    if (rate == null || !items || items.length === 0 || syncing.current) return;
    const patches = pricePatches(items, rate).filter((patch) => !failed.current.has(patch.id));
    if (patches.length === 0) return;

    let cancelled = false;
    syncing.current = true;
    void (async () => {
      try {
        const results = await Promise.allSettled(
          patches.map((patch) =>
            patchProduct(patch.id, { unitPrice: patch.unitPrice, description: patch.description })
          )
        );
        results.forEach((result, index) => {
          if (result.status === "rejected") failed.current.add(patches[index].id);
        });
      } finally {
        syncing.current = false;
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rate, items, queryClient]);
}
