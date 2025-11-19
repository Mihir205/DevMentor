export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-background]">
      {/* No header here */}
      <div className="max-w-5xl mx-auto py-6">
        {children}
      </div>
    </div>
  );
}
