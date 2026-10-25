import * as signalR from "@microsoft/signalr";

const baseURL = (import.meta.env.VITE_HUB_API_URL || "").replace(/\/$/, "");

export const incomeConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}/hubs/income`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startIncomeConnection = async () => {
  // منع إعادة الاتصال إذا كان يتصل بالفعل أو متصل مسبقاً
  if (incomeConnection.state !== signalR.HubConnectionState.Disconnected) {
    return;
  }

  try {
    await incomeConnection.start();
  } catch (err) {
    console.error("Income SignalR Connection Error:", err);
    setTimeout(startIncomeConnection, 5000);
  }
};