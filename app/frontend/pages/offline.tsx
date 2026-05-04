export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-100 px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">You are offline</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Network connection is unavailable right now. Reconnect and refresh to continue using Drinks.
        </p>
      </div>
    </div>
  );
}
