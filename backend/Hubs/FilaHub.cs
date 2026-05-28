using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs
{
    public class FilaHub : Hub
    {
        public async Task JoinQueueGroup(string filaId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, filaId);
        }

        public async Task LeaveQueueGroup(string filaId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, filaId);
        }
    }
}