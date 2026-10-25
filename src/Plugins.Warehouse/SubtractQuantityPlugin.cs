using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using TALXIS.DevKit.Build.Dataverse.Plugin;

namespace Plugins.Warehouse
{
    [PluginStep("Create", "lab_warehousetransaction", PluginStage.PostOperation)]
    public class SubtractQuantityPlugin : PluginBase
    {
        public SubtractQuantityPlugin(string unsecureConfiguration, string secureConfiguration)
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
            {
                throw new ArgumentNullException(nameof(localPluginContext));
            }

            var context = localPluginContext.PluginExecutionContext;
            if (!context.InputParameters.Contains("Target")
                || !(context.InputParameters["Target"] is Entity target)
                || target.LogicalName != "lab_warehousetransaction")
            {
                return;
            }

            if (!target.Contains("lab_quantity")
                || !target.Contains("lab_itemid")
                || !target.Contains("lab_transactiontype"))
            {
                return;
            }

            var quantity = (int)target["lab_quantity"];
            var itemReference = (EntityReference)target["lab_itemid"];
            var transactionType = (OptionSetValue)target["lab_transactiontype"];
            int adjustment;

            if (transactionType.Value == 100000000)
            {
                adjustment = quantity;
            }
            else if (transactionType.Value == 100000001)
            {
                adjustment = -quantity;
            }
            else
            {
                return;
            }

            var service = localPluginContext.OrgSvcFactory.CreateOrganizationService(context.UserId);
            var item = service.Retrieve(
                "lab_warehouseitem",
                itemReference.Id,
                new ColumnSet("lab_availablequantity"));
            var available = item.GetAttributeValue<int>("lab_availablequantity");

            var update = new Entity("lab_warehouseitem", itemReference.Id)
            {
                ["lab_availablequantity"] = available + adjustment
            };
            service.Update(update);
        }
    }
}
