import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const expenseConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/expense`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startExpenseConnection = async () => {
  if (expenseConnection.state === signalR.HubConnectionState.Connected) return;

  try {
    await expenseConnection.start();
    //console.log("👌 Expense SignalR Connected");
  } catch (err) {
    console.error("😡 Expense SignalR Connection Error:", err);
    setTimeout(startExpenseConnection, 5000);
  }
};

expenseConnection.onreconnecting(() => {
  //console.log("Expense SignalR Reconnecting...");
});

expenseConnection.onreconnected(() => {
  //console.log("Expense SignalR Reconnected");
});

expenseConnection.onclose(() => {
  //console.log("Expense SignalR Connection Closed");
});
