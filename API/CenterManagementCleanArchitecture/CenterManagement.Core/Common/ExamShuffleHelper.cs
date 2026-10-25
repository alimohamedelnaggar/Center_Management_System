using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Core.Common;

// Deterministic per-attempt shuffling so each student sees a stable order
// (survives page reloads / server restarts) while orders differ between students.
public static class ExamShuffleHelper
{
    public static List<QuestionExamQuestion> OrderQuestions(
        IEnumerable<QuestionExamQuestion> questions,
        Guid examId,
        Guid studentId,
        bool shuffle)
    {
        var list = questions.OrderBy(q => q.Order).ToList();

        if (!shuffle || list.Count < 2)
            return list;

        var random = new Random(StableSeed(examId, studentId));
        return list.OrderBy(_ => random.Next()).ToList();
    }

    public static List<QuestionExamQuestionOption> OrderOptions(
        IEnumerable<QuestionExamQuestionOption> options,
        Guid examId,
        Guid studentId,
        Guid questionId,
        bool shuffle)
    {
        var list = options.OrderBy(o => o.Order).ToList();

        if (!shuffle || list.Count < 2)
            return list;

        var random = new Random(StableSeed(examId, studentId, questionId));
        return list.OrderBy(_ => random.Next()).ToList();
    }

    private static int StableSeed(params Guid[] parts)
    {
        unchecked
        {
            var hash = 17;

            foreach (var part in parts)
            {
                foreach (var value in part.ToByteArray())
                    hash = hash * 31 + value;
            }

            return hash;
        }
    }
}
