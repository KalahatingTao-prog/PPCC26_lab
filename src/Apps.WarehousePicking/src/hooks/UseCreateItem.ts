import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import type { Lab_warehouseitems } from "@/generated/models/Lab_warehouseitemsModel";
import type { Lab_warehouselocations } from "@/generated/models/Lab_warehouselocationsModel";
import { LOCATIONS_KEY, PICK_ITEMS_KEY, toPickItems, type PickItem } from "@/hooks/UsePickItems";
import { servicePayload, serviceResult } from "@/utils/ServicePayload";

type CreateItemInput = {
  /** The New item form's values. */
  values: Record<string, unknown>;
};

// Creates a warehouse item at 0 on hand and hands back the new item as the quick-action screens list it.
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ values }: CreateItemInput): Promise<PickItem> => {
      // The items listed before the create: the new one is the match that isn't among them
      const known = new Set(
        (queryClient.getQueryData<Lab_warehouseitems[]>(PICK_ITEMS_KEY) ?? []).map((item) => item.lab_warehouseitemid)
      );
      await serviceResult(Lab_warehouseitemsService.create(
        servicePayload({
          lab_name: values.lab_name,
          lab_sku: values.lab_sku,
          lab_category: Number(values.lab_category),
          lab_availablequantity: "0",
          ...(values.lab_locationid
            ? { "lab_locationid@odata.bind": `/lab_warehouselocations(${values.lab_locationid})` }
            : {}),
        })
      ));

      await queryClient.refetchQueries({ queryKey: PICK_ITEMS_KEY });
      const items = queryClient.getQueryData<Lab_warehouseitems[]>(PICK_ITEMS_KEY) ?? [];
      const locations = queryClient.getQueryData<Lab_warehouselocations[]>(LOCATIONS_KEY) ?? [];
      // Name and SKU aren't unique: of the matches, take the one that wasn't there before
      const matches = toPickItems(items, locations)
        .filter((item) => item.name === values.lab_name && item.sku === values.lab_sku);
      const created = matches.find((item) => !known.has(item.id)) ?? matches.pop();
      if (!created) throw new Error("The item was created but could not be found again - search for it.");

      void queryClient.invalidateQueries({ queryKey: ["warehouseItems"] });
      return created;
    },
  });
}
