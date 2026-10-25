import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { useCreateItem } from "@/hooks/UseCreateItem";
import { usePickItems, type PickItem } from "@/hooks/UsePickItems";
import type { IColumn } from "@talxis/client-libraries";
import { useToast } from "@/hooks/use-toast";
import { categoryOptionMetadata } from "@/utils/OptionSets";
import { errorText } from "@/utils/ServicePayload";

// A new item's name, SKU and category are required; its location is optional.
const fields: FormField[] = [
  { column: { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "lab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "lab_warehouselocation" },
];

type NewItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starting name typed in the item search. */
  defaults?: { name?: string };
  /** Present when a catalog knows the barcode: links the new item to its catalog record. */
  onCreated: (item: PickItem) => void;
};

// Creates a warehouse item from the Receive screen, then hands it back to carry on receiving it.
export function NewItemDialog({ open, onOpenChange, defaults, onCreated }: NewItemDialogProps) {
  const create = useCreateItem();
  const toast = useToast();
  const { locationRecords } = usePickItems();

  return (
    <RecordFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New item"
      entityName="lab_warehouseitem"
      fields={fields}
      lookupRecords={{ lab_locationid: locationRecords }}
      defaults={{ lab_name: defaults?.name }}
      pending={create.isPending}
      onCreate={async (values) => {
        try {
          onCreated(await create.mutateAsync({ values }));
        } catch (error) {
          // The form keeps the entered values; say why nothing was created
          toast.error(errorText(error));
          throw error;
        }
      }}
    />
  );
}
