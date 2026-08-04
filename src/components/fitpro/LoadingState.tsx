export function LoadingState({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="fp-loading-state">
      <div className="fp-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
