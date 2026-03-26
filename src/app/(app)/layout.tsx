import { TopNav } from "@/components/layout/top-nav"
import { MobileNav } from "@/components/layout/mobile-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </>
  )
}
