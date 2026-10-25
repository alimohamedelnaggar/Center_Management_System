using CenterManagement.Core.Features.AttendenceFeature.Queries.Result;
using CenterManagement.Data.Enums;
using CenterManagement.Core.Hubs;
using CenterManagement.Core.Hubs.Abstractions;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Tests;

/// <summary>
/// The live attendance event carries student names and phone numbers, so it
/// must only ever reach the clients of the center it belongs to.
/// </summary>
public class AttendanceHubScopingTests
{
    #region Fakes

    private sealed class RecordingClientProxy : IClientProxy
    {
        public string? Method { get; private set; }

        public object?[]? Args { get; private set; }

        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        {
            Method = method;
            Args = args;

            return Task.CompletedTask;
        }
    }

    private sealed class FakeHubClients : IHubClients
    {
        public List<string> RequestedGroups { get; } = [];

        public List<RecordingClientProxy> Sent { get; } = [];

        private RecordingClientProxy Track(string? group)
        {
            if (group is not null)
                RequestedGroups.Add(group);

            var proxy = new RecordingClientProxy();

            Sent.Add(proxy);

            return proxy;
        }

        public IClientProxy All => Track(null);

        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => Track(null);

        public IClientProxy Client(string connectionId) => Track(null);

        public IClientProxy Clients(IReadOnlyList<string> connectionIds) => Track(null);

        public IClientProxy Group(string groupName) => Track(groupName);

        public IClientProxy Groups(IReadOnlyList<string> groupNames) => Track(null);

        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => Track(groupName);

        public IClientProxy GroupsExcept(IReadOnlyList<string> excludedGroupNames, IReadOnlyList<string> excludedConnectionIds) => Track(null);

        public IClientProxy User(string userId) => Track(null);

        public IClientProxy Users(IReadOnlyList<string> userIds) => Track(null);

        public IClientProxy UserExcept(string userId, IReadOnlyList<string> excludedConnectionIds) => Track(null);

        public IClientProxy UsersExcept(IReadOnlyList<string> userIds, IReadOnlyList<string> excludedConnectionIds) => Track(null);

        public IClientProxy OthersInGroup(string groupName) => Track(groupName);
    }

    private sealed class FakeGroupManager : IGroupManager
    {
        public List<string> AddedGroups { get; } = [];

        public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
        {
            AddedGroups.Add(groupName);

            return Task.CompletedTask;
        }

        public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public IEnumerable<string> GroupsConnectedTo(string connectionId) => [];
    }

    private sealed class FakeHubContext : IHubContext<StudentAttandanceHub>
    {
        public FakeHubClients RecordingClients { get; } = new();

        public FakeGroupManager RecordingGroups { get; } = new();

        public IHubClients Clients => RecordingClients;

        public IGroupManager Groups => RecordingGroups;
    }

    #endregion

    [Fact]
    public async Task AttendanceSaved_is_sent_to_the_group_of_the_center_only()
    {
        var hubContext = new FakeHubContext();
        var service = new StudentAttendanceNotification(hubContext);

        var centerId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await service.AttendanceSaved(
            centerId,
            sessionId,
            [
                new StudentAttendenceDTO
                {
                    Id = Guid.NewGuid(),
                    FullName = "أحمد محمد",
                    Phone = "01000000000",
                    Status = AttendanceStatus.Present
                }
            ]);

        Assert.Equal([StudentAttandanceHub.CenterGroup(centerId)], hubContext.RecordingClients.RequestedGroups);

        var sent = Assert.Single(hubContext.RecordingClients.Sent);

        Assert.Equal("AttendanceSaved", sent.Method);
    }

    [Fact]
    public async Task AttendanceSaved_of_a_center_is_never_broadcast_to_everyone()
    {
        var hubContext = new FakeHubContext();
        var service = new StudentAttendanceNotification(hubContext);

        await service.AttendanceSaved(
            Guid.NewGuid(),
            Guid.NewGuid(),
            [new StudentAttendenceDTO { Id = Guid.NewGuid(), FullName = "طالب" }]);

        // A single target was used - the center group - and never the "All"
        // client, which would hand the row to every connected center.
        Assert.Single(hubContext.RecordingClients.Sent);
        Assert.All(hubContext.RecordingClients.RequestedGroups, group =>
            Assert.StartsWith("center:", group));
    }

    [Fact]
    public async Task AttendanceSaved_without_a_center_is_not_sent_at_all()
    {
        var hubContext = new FakeHubContext();
        var service = new StudentAttendanceNotification(hubContext);

        await service.AttendanceSaved(
            Guid.Empty,
            Guid.NewGuid(),
            [new StudentAttendenceDTO { Id = Guid.NewGuid(), FullName = "طالب" }]);

        Assert.Empty(hubContext.RecordingClients.Sent);
    }
}
