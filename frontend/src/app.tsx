import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "@/routes/protected-route";
import RoleRoute from "@/routes/role-route";

import AppShell from "@/components/layout/app-shell";

/* -------------------------
 * Pages
 * ------------------------- */

// Auth
import Login from "@/pages/login/login";

// Factory (FACTORY_ADMIN)
import Dealers from "@/pages/factory/dealers";
import InverterModels from "@/pages/factory/inverter-models";
import ModelDetails from "@/pages/factory/model-details";
import InverterRegistration from "@/pages/factory/inverter-registration";
import FactoryDispatch from "@/pages/factory/factory-dispatch";
import FactoryStock from "@/pages/factory/factory-stock";
import PartDispatch from "@/pages/factory/part-dispatch";
import ServiceCenters from "@/pages/factory/service-centers";
import Operators from "@/pages/factory/operators";

// Dealer
import DealerStock from "@/pages/dealer/stock";
import SubDealers from "@/pages/dealer/sub-dealers";
import DealerTransfer from "@/pages/dealer/transfer";
import DealerSales from "@/pages/dealer/sales";

// Sub-Dealer
import SubDealerStock from "@/pages/sub-dealer/stock";
import SubDealerSales from "@/pages/sub-dealer/sales";

// Service Center
import ServiceJobs from "@/pages/service-center/service-jobs";
import CreateServiceJob from "@/pages/service-center/create-job";
import ServiceJobDetails from "@/pages/service-center/service-job-details";
import ServiceCenterStock from "@/pages/service-center/stock";

// Lifecycle
import InverterLifecycle from "@/pages/lifecycle/inverter-lifecycle";

// Dashboard
import Dashboard from "@/pages/dashboard/dashboard";

// Operator
import OperatorSerialEntry from "@/pages/operator/serial-entry";

const App = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
          {/* ----------------------------------
           * Public
           * ---------------------------------- */}
          <Route path="/login" element={<Login />} />

          {/* ----------------------------------
           * Protected App Shell
           * ---------------------------------- */}
          <Route
            path="/"
            element={<ProtectedRoute />}
          >
            <Route element={<AppShell />}>
              {/* Dashboard */}
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* ----------------------------------
               * FACTORY ADMIN
               * ---------------------------------- */}
                  <Route
                    path="factory"
                    element={<RoleRoute allowedRoles={["FACTORY_ADMIN"]} />}
                  >
                    <Route path="dealers" element={<Dealers />} />
                    <Route path="service-centers" element={<ServiceCenters />} />
                    <Route path="operators" element={<Operators />} />
                    <Route path="inverter-models" element={<InverterModels />} />
                    <Route path="inverter-models/:modelId" element={<ModelDetails />} />
                    <Route path="inverter-registration" element={<InverterRegistration />} />
                    <Route path="dispatch" element={<FactoryDispatch />} />
                    <Route path="part-dispatch" element={<PartDispatch />} />
                    <Route path="stock" element={<FactoryStock />} />
                  </Route>

              {/* ----------------------------------
               * DEALER
               * ---------------------------------- */}
              <Route
                path="dealer"
                element={<RoleRoute allowedRoles={["DEALER"]} />}
              >
                <Route path="stock" element={<DealerStock />} />
                <Route path="sub-dealers" element={<SubDealers />} />
                <Route path="transfer" element={<DealerTransfer />} />
                <Route path="sales" element={<DealerSales />} />
              </Route>

              {/* ----------------------------------
               * SUB-DEALER
               * ---------------------------------- */}
              <Route
                path="sub-dealer"
                element={<RoleRoute allowedRoles={["SUB_DEALER"]} />}
              >
                <Route path="stock" element={<SubDealerStock />} />
                <Route path="sales" element={<SubDealerSales />} />
              </Route>

              {/* ----------------------------------
               * SERVICE CENTER
               * ---------------------------------- */}
              <Route
                path="service-center"
                element={<RoleRoute allowedRoles={["SERVICE_CENTER"]} />}
              >
                <Route path="jobs" element={<ServiceJobs />} />
                <Route path="jobs/create" element={<CreateServiceJob />} />
                <Route path="jobs/:serviceJobId" element={<ServiceJobDetails />} />
                <Route path="stock" element={<ServiceCenterStock />} />
              </Route>

              {/* ----------------------------------
               * DATA ENTRY OPERATOR
               * ---------------------------------- */}
              <Route
                path="operator"
                element={<RoleRoute allowedRoles={["DATA_ENTRY_OPERATOR"]} />}
              >
                <Route path="serial-entry" element={<OperatorSerialEntry />} />
              </Route>

              {/* ----------------------------------
               * LIFECYCLE (all authenticated roles)
               * ---------------------------------- */}
              <Route path="lifecycle" element={<InverterLifecycle />} />
              <Route path="lifecycle/:serialNumber" element={<InverterLifecycle />} />
            </Route>
          </Route>

          {/* ----------------------------------
           * Fallback
           * ---------------------------------- */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    </BrowserRouter>
  );
};

export default App;