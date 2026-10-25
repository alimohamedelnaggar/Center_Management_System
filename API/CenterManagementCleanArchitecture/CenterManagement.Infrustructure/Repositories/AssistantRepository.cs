using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.Repositories
{
    internal class AssistantRepository : GenericRepository<Assistent>, IAssistantRepository
    {
        private readonly AppDbContext context;
        private readonly ITenantContext tenantContext;

        public AssistantRepository(AppDbContext context, ITenantContext tenantContext): base(context)
        {
            this.context = context;
            this.tenantContext = tenantContext;
        }
        public Task<IQueryable<Assistent>> GetAssistantsQueryableAsync()
        {
            IQueryable<Assistent> query = context.Users
                .OfType<Assistent>()
                .AsNoTracking()
                .AsQueryable();

            // Assistents are a TPT derived type and have no global query filter,
            // so the center isolation has to be applied explicitly.
            if (!tenantContext.IsUnrestricted && tenantContext.CenterId is Guid centerId)
                query = query.Where(a => a.CenterId == centerId);

            return Task.FromResult(query);
        }
        
    }
}
