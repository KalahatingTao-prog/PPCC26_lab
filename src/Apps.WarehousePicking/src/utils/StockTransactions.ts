import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lab_warehousetransactionsService } from "@/generated/services/Lab_warehousetransactionsService";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import { PICK_ITEMS_KEY } from "@/hooks/UsePickItems";
import { servicePayload, serviceResult } from "@/utils/ServicePayload";

// The server applies the stock rules for each transaction type.
const TRANSACTION_TYPE = { inbound: 100000000, outbound: 100000001 } as const;

type StockTransactionInput = {
  itemId: string;
  type: keyof typeof TRANSACTION_TYPE;
  name: string;
  quantity: string;
};

// Posts one stock movement, then reads the updated item back from the server.
export function useStockTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, type, name, quantity }: StockTransactionInput) => {
      await serviceResult(Lab_warehousetransactionsService.create(servicePayload({
        lab_name: name,
        lab_quantity: quantity,
        lab_transactiontype: TRANSACTION_TYPE[type],
        lab_transactiondate: new Date().toISOString(),
        "lab_itemid@odata.bind": `/lab_warehouseitems(${itemId})`,
      })));
      return (await serviceResult(Lab_warehouseitemsService.get(itemId))).data;
    },
    onSuccess: async (_result, { itemId }) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: PICK_ITEMS_KEY }),
        queryClient.invalidateQueries({ queryKey: ["warehouseItems"] }),
        queryClient.invalidateQueries({ queryKey: ["allTransactions"] }),
        queryClient.invalidateQueries({ queryKey: ["itemTransactions", itemId] }),
        queryClient.invalidateQueries({ queryKey: ["warehouseItem", itemId] }),
      ]);
    },
  });
}
