import "./globals.css";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { getUser } from "@/lib/auth";

export const metadata = {
  title: "Tradable",
  description: "Remote diagnostics with trusted pros.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-6">
              <Link className="text-lg font-semibold" href="/">
                Tradable
              </Link>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <Link href="/customer/request/new">Customer</Link>
                <Link href="/pro/dashboard">Pro</Link>
              </nav>
            </div>
            <AuthButton isAuthenticated={Boolean(user)} email={user?.email} />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
