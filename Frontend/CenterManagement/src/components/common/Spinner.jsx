export default function Spinner({ msg }) {
      return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>

          <p className="text-sm font-medium text-text-muted">{ msg }</p>
        </div>
      </div>
    </>
  );
}
