import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const sessionConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/sessions`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startSessionConnection = async () => {
  if (sessionConnection.state === signalR.HubConnectionState.Connected) return;

  try {
    await sessionConnection.start();
    //console.log(" Sessions SignalR Connected");
  } catch (err) {
    console.error(" Sessions SignalR Connection Error:", err);
    setTimeout(startSessionConnection, 5000);
  }
};

sessionConnection.onreconnecting(() => {
  //console.log(" SignalR Reconnecting...");
});

sessionConnection.onreconnected(() => {
  //console.log(" SignalR Reconnected");
});

sessionConnection.onclose(() => {
  //console.log(" SignalR Connection Closed");
});