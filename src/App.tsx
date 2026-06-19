import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import OrderNew from "@/pages/OrderNew";
import OrderConfirm from "@/pages/OrderConfirm";
import Orders from "@/pages/Orders";
import Reminders from "@/pages/Reminders";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/new" element={<OrderNew />} />
          <Route path="/order/confirm/:id" element={<OrderConfirm />} />
          <Route path="/reminders" element={<Reminders />} />
        </Route>
      </Routes>
    </Router>
  );
}
