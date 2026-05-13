import Image from "next/image";
import Link from "next/link";
import { Building2, Copyright } from "lucide-react";
import { FooterControls } from "@/components/auth/footer-controls";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-[linear-gradient(132deg,rgba(248,250,252,0.95)_0%,rgba(236,242,239,0.92)_32%,rgba(21,158,68,0.14)_58%,rgba(21,158,68,0.26)_100%)] dark:bg-[linear-gradient(132deg,rgba(9,12,14,0.97)_0%,rgba(11,16,14,0.95)_32%,rgba(21,158,68,0.20)_58%,rgba(21,158,68,0.36)_100%)]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]">
        <div className="absolute bottom-[-21vh] left-[54%] hidden h-[114vh] w-[60vw] -translate-x-1/2 lg:block">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom opacity-[0.30] saturate-[1.08]"
          />
        </div>
        <div className="absolute bottom-[-14vh] left-[53%] h-[76vh] w-[116vw] -translate-x-1/2 lg:hidden">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom opacity-[0.22] saturate-[1.06]"
          />
        </div>
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-32 pt-8">
        <div className="w-full max-w-[384px]">
          {children}
        </div>
      </div>
      <footer className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-4">
        <div className="pointer-events-auto relative mx-auto flex w-full max-w-[384px] items-center gap-3 rounded-xl border border-border/60 bg-background/88 px-4 py-3 shadow-sm backdrop-blur-md">
          <FooterControls />
          <div className="flex shrink-0 items-center gap-2">
            <Link href="https://www.bagongpilipinastayo.com/" className="cursor-pointer" target="_blank" rel="noreferrer">
              <Image
                src="/bagongpilipinas.png"
                alt="Bagong Pilipinas Logo"
                width={40}
                height={40}
                className="h-[40px] w-[40px] object-contain"
              />
            </Link>
            <Link href="https://cvsu.edu.ph/" className="cursor-pointer" target="_blank" rel="noreferrer">
              <Image
                src="/cvsuLogo.png"
                alt="CvSU Logo"
                width={40}
                height={40}
                className="h-[40px] w-[40px] object-contain"
              />
            </Link>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Copyright className="h-3 w-3 shrink-0" />
              CQER {new Date().getFullYear()}. All rights Reserved.
            </p>
            <p className="flex items-center gap-1 text-[10px] font-medium text-foreground/85">
              <Building2 className="h-3 w-3 shrink-0" />
              DIT Interns
            </p>
            <p className="text-[10px] text-foreground/80">
              Canata B. Coner K. Gonzalez D. Hizon S.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
