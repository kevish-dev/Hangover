export function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center bg-[#f5f0e6] p-6">
      <div role="alert" className="text-center">
        <p className="mb-4">Your session could not be checked. Check your connection and try again.</p>
        <button type="button" className="rounded-md bg-[#781216] px-4 py-2 text-white" onClick={onRetry}>
          Retry session
        </button>
      </div>
    </main>
  );
}
