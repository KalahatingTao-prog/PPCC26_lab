using Microsoft.Xrm.Sdk;
using System;

namespace Plugins.Warehouse
{
    public interface ILocalPluginContext
    {
        IPluginExecutionContext PluginExecutionContext { get; }
        IOrganizationServiceFactory OrgSvcFactory { get; }
        ITracingService TracingService { get; }
    }

    internal sealed class LocalPluginContext : ILocalPluginContext
    {
        public LocalPluginContext(IServiceProvider serviceProvider)
        {
            PluginExecutionContext = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            OrgSvcFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            TracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
        }

        public IPluginExecutionContext PluginExecutionContext { get; }
        public IOrganizationServiceFactory OrgSvcFactory { get; }
        public ITracingService TracingService { get; }
    }

    public abstract class PluginBase : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            if (serviceProvider == null)
            {
                throw new ArgumentNullException(nameof(serviceProvider));
            }

            ExecuteDataversePlugin(new LocalPluginContext(serviceProvider));
        }

        protected abstract void ExecuteDataversePlugin(ILocalPluginContext localPluginContext);
    }
}
