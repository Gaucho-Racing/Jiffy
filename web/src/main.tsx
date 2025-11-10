import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Toaster } from "./components/ui/sonner.tsx";
import App from "./App.tsx";
import LoginPage from "@/pages/auth/LoginPage.tsx";
import NewPurchaseRequestPage from "@/pages/NewPurchaseRequestPage.tsx";
import PurchaseRequestDetailsPage from "@/pages/PurchaseRequestDetailsPage.tsx";
import EditPurchaseRequestPage from "@/pages/EditPurchaseRequestPage.tsx";
import ApproverGroupsPage from "@/pages/ApproverGroupsPage.tsx";
import ApproverGroupsEditPage from "@/pages/ApproverGroupsEditPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/auth/login",
    element: <LoginPage />,
  },

  {
    path: "/pr/:id",
    element: <PurchaseRequestDetailsPage />,
  },

  {
    path: "/pr/new",
    element: <NewPurchaseRequestPage />,
  },
  {
    path: "/pr/:id/edit",
    element: <EditPurchaseRequestPage />,
  },
  {
    path: "/approver-groups",
    element: <ApproverGroupsPage />,
  },
  {
    path: "/approver-groups/:id",
    element: <ApproverGroupsEditPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
