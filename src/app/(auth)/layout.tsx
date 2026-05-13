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
        <div className="absolute inset-0 bg-[radial-gradient(56rem_34rem_at_10%_18%,rgba(21,158,68,0.10),transparent_60%),radial-gradient(46rem_28rem_at_82%_22%,rgba(21,158,68,0.12),transparent_62%),radial-gradient(52rem_30rem_at_72%_78%,rgba(21,158,68,0.10),transparent_64%),radial-gradient(40rem_24rem_at_28%_82%,rgba(21,158,68,0.08),transparent_62%),linear-gradient(135deg,rgba(248,250,252,0.94)_0%,rgba(236,242,239,0.92)_100%)] dark:bg-[radial-gradient(56rem_34rem_at_10%_18%,rgba(21,158,68,0.16),transparent_60%),radial-gradient(46rem_28rem_at_82%_22%,rgba(21,158,68,0.20),transparent_62%),radial-gradient(52rem_30rem_at_72%_78%,rgba(21,158,68,0.16),transparent_64%),radial-gradient(40rem_24rem_at_28%_82%,rgba(21,158,68,0.12),transparent_62%),linear-gradient(135deg,rgba(9,12,14,0.96)_0%,rgba(11,16,14,0.95)_100%)]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]">
        <div className="absolute bottom-[-34vh] left-1/2 hidden h-[158vh] w-[78vw] -translate-x-1/2 lg:block">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom opacity-[0.30] saturate-[1.08]"
          />
        </div>
        <div className="absolute bottom-[-26vh] left-1/2 h-[98vh] w-[152vw] -translate-x-1/2 lg:hidden">
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
        <div className="pointer-events-auto mx-auto flex w-full max-w-[384px] flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/88 px-5 py-3 text-center shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-center">
            <Image
              src="/cvsuLogo.png"
              alt="CvSU Logo"
              width={42}
              height={42}
              className="h-[42px] w-[42px] object-contain"
            />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Copyright className="h-3 w-3" />
            CQER {new Date().getFullYear()}. All rights Reserved.
          </p>
          <p className="text-[11px] font-medium text-foreground/85">
            Canata Coner Gonzalez Hizon
          </p>
        </div>
      </footer>
    </div>
  );
}
