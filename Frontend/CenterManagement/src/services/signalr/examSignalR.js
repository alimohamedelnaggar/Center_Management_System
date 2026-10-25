import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL;

export const examConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/exams`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startExamConnection = async () => {
  if (examConnection.state === signalR.HubConnectionState.Connected) return;

  try {
    await examConnection.start();
   } catch (err) {
    console.error("Exam SignalR Connection Error:", err);
    setTimeout(startExamConnection, 5000);
  }
};

examConnection.onreconnecting(() => {
  // console.log("Exam SignalR Reconnecting...");
});

examConnection.onreconnected(() => {
  // console.log("Exam SignalR Reconnected");
});

examConnection.onclose(() => {
  // console.log("Exam SignalR Connection Closed");
});