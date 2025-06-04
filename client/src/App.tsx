import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import Quotations from "@/pages/Quotations";
import Customers from "@/pages/Customers";
import Settings from "@/pages/Settings";
import Layout from "@/components/Layout";
import PayInvoicePage from "@/pages/Pay";
import ThankYou from "@/pages/ThankYou";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/pay/:id" component={PayInvoicePage} />
      <Route path="/thank-you" component={ThankYou} />
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Login} />
        </>
      ) : (
        <Layout>
          <Route path="/" component={Dashboard} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/quotations" component={Quotations} />
          <Route path="/customers" component={Customers} />
          <Route path="/settings" component={Settings} />
          <Route path="/login" component={Dashboard} />
          <Route path="/register" component={Dashboard} />
        </Layout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
