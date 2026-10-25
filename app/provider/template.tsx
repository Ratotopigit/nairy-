// Remounted by Next on every route change (not on ?query changes), so the fade
// plays per page while the navbar in layout.tsx stays mounted.
export default function ProviderTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
