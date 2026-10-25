import * as signalR from "@microsoft/signalr";
import { getAccessToken } from "../../api/axios";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const notificationConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/notifications`, {
    accessTokenFactory: () => getAccessToken() ?? "",
  })
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Warning)
  .build();

export const startNotificationConnection = async () => {
  if (
    notificationConnection.state === signalR.HubConnectionState.Connected ||
    notificationConnection.state === signalR.HubConnectionState.Connecting
  ) {
    return;
  }

  try {
    await notificationConnection.start();
  } catch (err) {
    console.error("Notification SignalR Connection Error:", err);
  }
};

export const stopNotificationConnection = async () => {
  try {
    await notificationConnection.stop();
  } catch {
    // ignore
  }
};
