import Image from "next/image";
import Link from "next/link";
import { BookOpenText, Building2, Code2, Copyright, ShieldCheck } from "lucide-react";
import { FooterControls } from "@/components/auth/footer-controls";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        <div className="absolute bottom-[-21vh] left-1/2 hidden h-[114vh] w-[60vw] -translate-x-1/2 lg:block">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom opacity-[0.30] saturate-[1.08]"
          />
        </div>
        <div className="absolute bottom-[-14vh] left-1/2 h-[76vh] w-[116vw] -translate-x-1/2 lg:hidden">
          <Image
            src="/layatdiwa.png"
            alt="Layat Diwa artwork background"
            fill
            priority
            className="object-contain object-bottom opacity-[0.22] saturate-[1.06]"
          />
        </div>
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-28 pt-16">
        <FooterControls />
        <div className="w-full max-w-[384px]">
          {children}
        </div>
      </div>
      <footer className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-4">
        <div className="pointer-events-auto relative mx-auto flex w-full max-w-[384px] items-center gap-3 rounded-xl border border-border/60 bg-background/88 px-4 py-3 shadow-sm backdrop-blur-md">
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
            <TooltipProvider delayDuration={120}>
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-foreground/80">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default">Coner K.</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-2 py-1">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <Code2 className="h-3 w-3" />
                      Lead Developer
                    </span>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default">Hizon S.</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-2 py-1">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <ShieldCheck className="h-3 w-3" />
                      System Analyst &amp; QA
                    </span>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default">Gonzalez D.</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-2 py-1">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <BookOpenText className="h-3 w-3" />
                      Documentation &amp; Wireframe
                    </span>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default">Canata B.</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-2 py-1">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <BookOpenText className="h-3 w-3" />
                      Documentation &amp; Wireframe
                    </span>
                  </TooltipContent>
                </Tooltip>
              </p>
            </TooltipProvider>
          </div>
        </div>
      </footer>
    </div>
  );
}
