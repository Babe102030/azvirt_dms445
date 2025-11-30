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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/documents"} component={Documents} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/materials"} component={Materials} />
      <Route path={"/deliveries"} component={Deliveries} />
      <Route path={"/quality"} component={QualityControl} />
      <Route path={"/employees"} component={Employees} />
      <Route path={"/machines"} component={Machines} />
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
