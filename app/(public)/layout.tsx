import { PublicNavbar } from "@/components/layout/public-navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-200">
      <PublicNavbar />
      {children}
      <footer className="border-t border-base-300 bg-base-100 px-6 py-8 text-center text-sm text-base-content/65">
        Barangay Bato, Mauban, Quezon. Certificate signatures, official stamp,
        and fee settlement remain physical office steps.
      </footer>
    </div>
  );
}
