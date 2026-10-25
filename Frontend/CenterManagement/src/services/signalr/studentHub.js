import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/students`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startConnection = async () => {
  if (connection.state === signalR.HubConnectionState.Connected) return;

  try {
    await connection.start();
    //console.log("✅ SignalR Connected");
  } catch (err) {
    console.error("❌ SignalR Connection Error:", err);

    setTimeout(startConnection, 5000);
  }
};

connection.onreconnecting(() => {
  //console.log("⚠️ Reconnecting...");
});

connection.onreconnected(() => {
  //console.log("✅ Reconnected");
});

connection.onclose(() => {
  //console.log("❌ Connection Closed");
});
