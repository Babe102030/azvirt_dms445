import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Documents from "./pages/Documents";
import Projects from "./pages/Projects";
import Materials from "./pages/Materials";
import Deliveries from "./pages/Deliveries";
import QualityControl from "./pages/QualityControl";
import Employees from "./pages/Employees";
import Machines from "./pages/Machines";
import Timesheets from "./pages/Timesheets";
import TimesheetSummary from "./pages/TimesheetSummary";
import Settings from "./pages/Settings";
import DriverDeliveries from "./pages/DriverDeliveries";
import ForecastingDashboard from "./pages/ForecastingDashboard";
import PurchaseOrders from "./pages/PurchaseOrders";
import ReportSettings from "./pages/ReportSettings";
import EmailBrandingSettings from "./pages/EmailBrandingSettings";
import AIAssistant from "./pages/AIAssistant";
import CustomizableDashboard from "./pages/CustomizableDashboard";
import NotificationTemplates from "./pages/NotificationTemplates";
import Recipes from "./pages/Recipes";
import MixingLog from "./pages/MixingLog";
import ProductionAnalytics from "./pages/ProductionAnalytics";
import TimesheetApproval from "./pages/TimesheetApproval";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/documents"} component={Documents} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/materials"} component={Materials} />
      <Route path={"/recipes"} component={Recipes} />
      <Route path={"/mixing-log"} component={MixingLog} />
      <Route path={"/production-analytics"} component={ProductionAnalytics} />
      <Route path={"/forecasting"} component={ForecastingDashboard} />
      <Route path={"/purchase-orders"} component={PurchaseOrders} />
      <Route path={"/deliveries"} component={Deliveries} />
      <Route path={"/driver-deliveries"} component={DriverDeliveries} />
      <Route path={"/quality"} component={QualityControl} />
      <Route path={"/employees"} component={Employees} />
      <Route path={"/machines"} component={Machines} />
      <Route path={"/timesheets"} component={Timesheets} />      <Route path={"/timesheet-summary"} component={TimesheetSummary} />
      <Route path={"/timesheet-approval"} component={TimesheetApproval} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/report-settings"} component={ReportSettings} />
      <Route path={"/email-branding"} component={EmailBrandingSettings} />
      <Route path={"/ai-assistant"} component={AIAssistant} />
      <Route path={"/dashboard-custom"} component={CustomizableDashboard} />
      <Route path={"/notification-templates"} component={NotificationTemplates} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
