export const dynamic = "force-dynamic";

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth wrapper - system routes bypass login enforcement
  return children;
}
