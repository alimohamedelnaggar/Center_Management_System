import * as signalR from "@microsoft/signalr";

const baseURL = (import.meta.env.VITE_HUB_API_URL || "").replace(/\/$/, "");

export const incomeCategoryConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}/hubs/income-categories`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startIncomeCategoryConnection = async () => {
  if (incomeCategoryConnection.state !== signalR.HubConnectionState.Disconnected) {
    return;
  }

  try {
    await incomeCategoryConnection.start();
  } catch (err) {
    console.error("Income Category SignalR Connection Error:", err);
    setTimeout(startIncomeCategoryConnection, 5000);
  }
};