using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCenterIdToTenantEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudyNotes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudyNoteGroups",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudentGroups",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudentExamParentContacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudentExamComponents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudentExamAttempts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudentExamAnswers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "StudentAmounts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "QuestionOptions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "QuestionExams",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "QuestionExamQuestions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "QuestionExamQuestionOptions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "QuestionBanks",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Payments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Incomes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "IncomeCategories",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Expenses",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "ExpenseCategories",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Exams",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "ExamComponents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Attendances",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "AssistantPayments",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudyNotes");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudyNoteGroups");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudentGroups");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudentExamParentContacts");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudentExamComponents");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudentExamAttempts");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudentExamAnswers");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "StudentAmounts");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "QuestionOptions");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "QuestionExams");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "QuestionExamQuestions");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "QuestionExamQuestionOptions");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "QuestionBanks");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Incomes");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "IncomeCategories");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "ExpenseCategories");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "ExamComponents");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "AssistantPayments");
        }
    }
}
