import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppRoutes } from "../routes";

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1A1D26",
            color: "#F1F5F9",
            border: "1px solid #2D3352"
          }
        }}
      />
    </BrowserRouter>
  );
}
