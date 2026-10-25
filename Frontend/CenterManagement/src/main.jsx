// import { createRoot } from "react-dom/client";
// import { Toaster } from "react-hot-toast";
// import { BrowserRouter } from "react-router-dom";
// import App from "./App.jsx";
// import { AuthProvider } from "./context/AuthContext";
// import "./index.css";

// createRoot(document.getElementById("root")).render(
//   <AuthProvider>
//     <BrowserRouter>
//       <App />
//         <Toaster
//         position="top-center"
//         toastOptions={{
//           duration: 3000,
//           style: {
//             background: 'var(--color-card-val)',
//             color: 'var(--color-text-main-val)',
//             borderRadius: '12px',
//             border: '1px solid var(--color-border-val)',
//             fontFamily: 'Cairo, sans-serif',
//             direction: 'rtl'
//           },
//         }}
//       />
//     </BrowserRouter>
//   </AuthProvider>,
// );

import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { ThemeProvider } from "./context/ThemeContext";
import AccessBlockedOverlay from "./components/AccessBlockedOverlay";
import ErrorBoundary from "./components/common/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
            <App />

            <AccessBlockedOverlay />

            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "var(--color-card-val)",
                  color: "var(--color-text-main-val)",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border-val)",
                  fontFamily: "Cairo, sans-serif",
                  direction: "rtl",
                },
              }}
            />
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </ErrorBoundary>,
);
