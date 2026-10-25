import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const groupConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/groupHub`) 
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startGroupConnection = async () => {
  if (groupConnection.state === signalR.HubConnectionState.Connected) return;

  try {
    await groupConnection.start();
    //console.log(" Group SignalR Connected");
  } catch (err) {
    console.error(" Group SignalR Connection Error:", err);

    setTimeout(startGroupConnection, 5000);
  }
};

groupConnection.onreconnecting(() => {
  //console.log(" Group SignalR Reconnecting...");
});

groupConnection.onreconnected(() => {
  //console.log("Group SignalR Reconnected");
});

groupConnection.onclose(() => {
  //console.log(" Group SignalR Connection Closed");
});