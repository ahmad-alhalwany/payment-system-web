import ManagerSidebar from "@/components/shared/ManagerSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary-50">
      <div className="flex flex-col md:flex-row">
        <ManagerSidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
} 