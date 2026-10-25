import * as signalR from "@microsoft/signalr";

const baseURL = import.meta.env.VITE_HUB_API_URL || "https://localhost:7089/";

export const financeConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${baseURL}hubs/payments`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startFinanceConnection = async () => {
  if (financeConnection.state === signalR.HubConnectionState.Connected) return;

  try {
    await financeConnection.start();
    //console.log("✅  Finance SignalR Connected");

    // financeConnection.on("ReceivePaymentNotification", (paymentData) => {
    //   if (onPaymentReceived) onPaymentReceived(paymentData);
    // });
  } catch (err) {
    console.error("❌ Finance SignalR Connection Error:", err);
    setTimeout(startFinanceConnection, 5000);
    // setTimeout(() => startFinanceConnection(onPaymentReceived), 5000);
  }
};

financeConnection.onreconnecting(() => {
  //console.log("⚠️ Reconnecting...");
});

financeConnection.onreconnected(() => {
  //console.log("✅ Reconnected");
});

financeConnection.onclose(() => {
  //console.log("❌ Connection Closed");
});
