import { useState } from "react";
import { Button, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { ItemPicker } from "@/components/mobile/ItemPicker";
import { ItemSummary } from "@/components/mobile/ItemSummary";
import { MobilePage } from "@/components/mobile/MobilePage";
import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { ReceiveItemChooser } from "@/components/mobile/ReceiveItemChooser";
import { ResultPanel } from "@/components/mobile/ResultPanel";
import type { PickItem } from "@/hooks/UsePickItems";
import { useToast } from "@/hooks/use-toast";
import { transactionTypeOptionMetadata } from "@/utils/OptionSets";
import { errorText } from "@/utils/ServicePayload";
import { useStockTransaction } from "@/utils/StockTransactions";
import type { IColumn } from "@talxis/client-libraries";
import { useStyles } from "@/styles/QuickTransaction.styles";

type Mode = "receive" | "pick";

const CONFIG = {
  receive: { title: "Receive stock", verb: "Receive", past: "Received", type: "inbound", option: 100000000 },
  pick: { title: "Pick stock", verb: "Pick", past: "Picked", type: "outbound", option: 100000001 },
} as const;

const transactionFields: FormField[] = [
  { column: { name: "lab_name", displayName: "Transaction Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_quantity", displayName: "Quantity", dataType: "Whole.None" }, required: true },
  {
    column: {
      name: "lab_transactiontype",
      displayName: "Transaction Type",
      dataType: "OptionSet",
      metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"],
    },
    required: true,
    disabled: true,
  },
];

// Receive and Pick choose a movement type; stock rules remain on the server.
function QuickTransactionFlow({ mode }: { mode: Mode }) {
  const styles = useStyles();
  const config = CONFIG[mode];
  const stock = useStockTransaction();
  const toast = useToast();
  const [item, setItem] = useState<PickItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<{ title: string; detail: string } | null>(null);

  const restart = () => {
    setItem(null);
    setDialogOpen(false);
    setResult(null);
    stock.reset();
  };

  if (result) {
    return (
      <MobilePage title={config.title}>
        <ResultPanel title={result.title} detail={result.detail} onAgain={restart} />
      </MobilePage>
    );
  }

  if (!item) {
    return (
      <MobilePage title={config.title}>
        {mode === "receive" ? <ReceiveItemChooser onSelect={setItem} /> : <ItemPicker onSelect={setItem} />}
      </MobilePage>
    );
  }

  const createTransaction = async (values: Record<string, unknown>) => {
    try {
      const updatedItem = await stock.mutateAsync({
        itemId: item.id,
        type: config.type,
        name: String(values.lab_name),
        quantity: String(values.lab_quantity),
      });
      setResult({
        title: config.past,
        detail: `${item.name} - ${updatedItem?.lab_availablequantity ?? "Unavailable"} on hand now`,
      });
    } catch (error) {
      toast.error(errorText(error));
      throw error;
    }
  };

  return (
    <MobilePage
      title={config.title}
      footer={
        <Button
          className={styles.confirm}
          appearance="primary"
          size="large"
          onClick={() => setDialogOpen(true)}
          data-testid="open-transaction-form"
        >
          {config.verb}
        </Button>
      }
    >
      <ItemSummary item={item} onChange={restart} />
      {stock.error && (
        <MessageBar intent="error">
          <MessageBarBody>{errorText(stock.error)}</MessageBarBody>
        </MessageBar>
      )}
      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${config.verb} ${item.name}`}
        entityName="lab_warehousetransaction"
        fields={transactionFields}
        defaults={{ lab_transactiontype: config.option }}
        pending={stock.isPending}
        onCreate={createTransaction}
        submitTestId="flow-confirm"
      />
    </MobilePage>
  );
}

// Keyed by mode so switching between /receive and /pick never carries an item or quantity over
export default function QuickTransactionPage({ mode }: { mode: Mode }) {
  return <QuickTransactionFlow key={mode} mode={mode} />;
}
