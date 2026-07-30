import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "./components/User/Layout";
import Home from "./pages/User/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const Signupoption = lazy(() => import("./pages/User/SignupOption"));
const UserSignup = lazy(() => import("./pages/User/UserSignup"));
const WorkerSignup = lazy(() => import("./pages/Worker/WorkerSignup"));
const WorkerVerifyStep = lazy(() => import("./pages/Worker/WorkerVerifyStep"));
const WorkerSignupSuccess = lazy(() => import("./pages/Worker/WorkerSignupSuccess"));
const Services = lazy(() => import("./pages/User/Services"));
const HowItWorks = lazy(() => import("./pages/User/HowItWorks"));
const Safety = lazy(() => import("./pages/User/Safety"));
const AboutUs = lazy(() => import("./pages/User/AboutUs"));
const Contact = lazy(() => import("./pages/User/Contact"));
const Terms = lazy(() => import("./pages/User/Terms"));
const Privacy = lazy(() => import("./pages/User/Privacy"));
const Blog = lazy(() => import("./pages/User/Blog"));
const WorkWithUs = lazy(() => import("./pages/User/WorkWithUs"));
const Help = lazy(() => import("./pages/User/Help"));

const DashboardLayout = lazy(() => import("./components/User/DashboardLayout"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const CustomerPostTask = lazy(() => import("./pages/CustomerPostTask"));
const CustomerMyTask = lazy(() => import("./pages/CustomerMyTask"));
const CustomerBrowseWorkers = lazy(() => import("./pages/CustomerBrowseWorkers"));
const CustomerMessage = lazy(() => import("./pages/CustomerMessage"));
const CustomerPayment = lazy(() => import("./pages/CustomerPayment"));
const CustomerCheckout = lazy(() => import("./pages/CustomerCheckout"));
const EsewaCallback = lazy(() => import("./pages/EsewaCallback"));
const KhaltiCallback = lazy(() => import("./pages/KhaltiCallback"));
const CustomerReview = lazy(() => import("./pages/CustomerReview"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity"));
// One screen, mounted under both dashboards: it reads the role off the session.
const MyProfile = lazy(() => import("./pages/MyProfile"));

const AdminLayout = lazy(() => import("./components/Admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/Admin/AdminOverview"));
const AdminVerificationQueue = lazy(() => import("./pages/Admin/AdminVerificationQueue"));
const AdminUserManagement = lazy(() => import("./pages/Admin/AdminUserManagement"));
const AdminAnalytics = lazy(() => import("./pages/Admin/AdminAnalytics"));

const WorkerLayout = lazy(() => import("./components/Worker/WorkerLayout"));
const WorkerOverview = lazy(() => import("./pages/Worker/WorkerOverview"));
const WorkerBrowseTasks = lazy(() => import("./pages/Worker/WorkerBrowseTasks"));
const WorkerMyJobs = lazy(() => import("./pages/Worker/WorkerMyJobs"));
const WorkerMessages = lazy(() => import("./pages/Worker/WorkerMessages"));
const WorkerProfileEdit = lazy(() => import("./pages/Worker/WorkerProfileEdit"));

function RouteFallback() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        theme="light"
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signupoption />} />
        <Route path="/signup/user" element={<UserSignup />} />
        <Route path="/signup/worker" element={<WorkerSignup />} />
        {/* Step 2 of worker signup. Authenticated because it uploads documents —
            WorkerSignup signs the new account in before routing here. */}
        <Route
          path="/signup/worker/verify"
          element={
            <ProtectedRoute role="WORKER">
              <WorkerVerifyStep />
            </ProtectedRoute>
          }
        />
        <Route path="/signup/worker/success" element={<WorkerSignupSuccess />} />

        <Route
          path="/services"
          element={
            <Layout>
              <Services />
            </Layout>
          }
        />
        <Route
          path="/how-it-works"
          element={
            <Layout>
              <HowItWorks />
            </Layout>
          }
        />
        <Route
          path="/safety"
          element={
            <Layout>
              <Safety />
            </Layout>
          }
        />
        <Route
          path="/about"
          element={
            <Layout>
              <AboutUs />
            </Layout>
          }
        />
        <Route
          path="/contact"
          element={
            <Layout>
              <Contact />
            </Layout>
          }
        />
        <Route
          path="/terms"
          element={
            <Layout>
              <Terms />
            </Layout>
          }
        />
        <Route
          path="/privacy"
          element={
            <Layout>
              <Privacy />
            </Layout>
          }
        />
        <Route
          path="/blog"
          element={
            <Layout>
              <Blog />
            </Layout>
          }
        />
        <Route
          path="/work-with-us"
          element={
            <Layout>
              <WorkWithUs />
            </Layout>
          }
        />
        <Route
          path="/help"
          element={
            <Layout>
              <Help />
            </Layout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="CUSTOMER">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerDashboard />} />
          <Route path="post-task" element={<CustomerPostTask />} />
          <Route path="tasks" element={<CustomerMyTask />} />
          <Route path="workers" element={<CustomerBrowseWorkers />} />
          <Route path="messages" element={<CustomerMessage />} />
          <Route path="payments" element={<CustomerPayment />} />
          <Route path="checkout/:taskId" element={<CustomerCheckout />} />
          {/* eSewa redirects the browser back to these after checkout. */}
          <Route path="payments/esewa/success" element={<EsewaCallback />} />
          <Route path="payments/esewa/failure/:taskId" element={<EsewaCallback />} />
          {/* Khalti has a single return URL, whatever the outcome. */}
          <Route path="payments/khalti/callback" element={<KhaltiCallback />} />
          <Route path="reviews" element={<CustomerReview />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="security" element={<AccountSecurity />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="verifications" element={<AdminVerificationQueue />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>
        <Route
          path="/worker"
          element={
            <ProtectedRoute role="WORKER">
              <WorkerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<WorkerOverview />} />
          <Route path="tasks" element={<WorkerBrowseTasks />} />
          <Route path="jobs" element={<WorkerMyJobs />} />
          <Route path="messages" element={<WorkerMessages />} />
          <Route path="profile" element={<WorkerProfileEdit />} />
        </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
