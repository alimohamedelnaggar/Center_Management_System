using CenterManagement.Data.Entities.Notes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Notes;

namespace CenterManagement.Infrustructure.Repositories.Notes;

public class StudyNoteRepository :
    GenericRepository<StudyNote>, IStudyNoteRepository
{
    public StudyNoteRepository(AppDbContext context) : base(context)
    {
    }
}
