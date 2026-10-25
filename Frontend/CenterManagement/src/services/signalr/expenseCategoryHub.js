import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const expenseCategoryConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/expense-categories`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startExpenseCategoryConnection = async () => {
  if (expenseCategoryConnection.state === signalR.HubConnectionState.Connected)
    return;

  try {
    await expenseCategoryConnection.start();
    //console.log(" 👌Expense Category SignalR Connected");
  } catch (err) {
    console.error("😡 Expense Category SignalR Connection Error:", err);
    setTimeout(startExpenseCategoryConnection, 5000);
  }
};

expenseCategoryConnection.onreconnecting(() => {
  //console.log("Expense Category SignalR Reconnecting...");
});

expenseCategoryConnection.onreconnected(() => {
  //console.log("Expense Category SignalR Reconnected");
});

expenseCategoryConnection.onclose(() => {
  //console.log("Expense Category SignalR Connection Closed");
});
