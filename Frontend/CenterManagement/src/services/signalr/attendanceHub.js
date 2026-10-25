import * as signalR from "@microsoft/signalr";
import { getAccessToken } from "../../api/axios";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const attendanceConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/attendance`, {
    // The hub is authorized, so the token has to travel with the handshake.
    accessTokenFactory: () => getAccessToken() ?? "",
  })
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startAttendanceConnection = async () => {
  if (attendanceConnection.state === signalR.HubConnectionState.Connected) return;

  try {
    await attendanceConnection.start();
    // console.log(" Attendance SignalR Connected");
  } catch (err) {
    console.error(" Attendance SignalR Connection Error:", err);
    setTimeout(startAttendanceConnection, 5000);
  }
};

attendanceConnection.onreconnecting(() => {
  // console.log(" SignalR Reconnecting...");
});

attendanceConnection.onreconnected(() => {
  // console.log(" SignalR Reconnected");
});

attendanceConnection.onclose(() => {
  // console.log(" SignalR Connection Closed");
});