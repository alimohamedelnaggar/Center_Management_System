using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts
{
    public interface IAssistantRepository:IGenericRepository<Assistent>
    {
        Task<IQueryable<Assistent>> GetAssistantsQueryableAsync();

        
    }
}
