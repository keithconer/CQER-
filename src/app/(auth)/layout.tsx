import Image from "next/image";
import { Copyright } from "lucide-react";

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
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,252,0.92)_0%,rgba(236,242,239,0.9)_46%,rgba(21,158,68,0.16)_70%,rgba(21,158,68,0.34)_100%)] dark:bg-[linear-gradient(90deg,rgba(9,12,14,0.96)_0%,rgba(11,16,14,0.94)_46%,rgba(21,158,68,0.22)_70%,rgba(21,158,68,0.42)_100%)]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]">
        <div className="absolute bottom-[-56vh] right-[-7%] hidden h-[178vh] w-[72vw] lg:block">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom-right opacity-[0.30] saturate-[1.12] dark:opacity-[0.42]"
          />
        </div>
        <div className="absolute bottom-[-46vh] right-[-42%] h-[128vh] w-[142vw] lg:hidden">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom-right opacity-[0.20] dark:opacity-[0.28]"
          />
        </div>
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-32 pt-8">
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
      <footer className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-[520px] flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/88 px-5 py-3 text-center shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-center gap-4">
            <Image
              src="/cvsuLogo.png"
              alt="CvSU Logo"
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain"
            />
            <Image
              src="/CQERFINAL.png"
              alt="CQER Final Logo"
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain"
            />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Copyright className="h-3 w-3" />
            CQER 2026. All Rights Reserved
          </p>
          <p className="text-[11px] font-medium text-foreground/85">
            Canata Coner Gonzalez Hizon
          </p>
        </div>
      </footer>
    </div>
  );
}
