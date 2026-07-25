import AdminHeader from "../../components/Admin/AdminHeader";

export default function AdminAnalytics() {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="Analytics" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Analytics</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Platform-wide trends and reporting.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">
            Analytics will be available once task tracking is built.
          </p>
        </div>
      </main>
    </div>
  );
}
