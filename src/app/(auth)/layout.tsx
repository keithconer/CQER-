import Image from "next/image";
import { Copyright } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="flex min-h-screen items-center justify-center px-4 pb-28 pt-6">
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
      <footer className="pointer-events-none absolute inset-x-0 bottom-3 px-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-[400px] flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/cvsuLogo.png"
              alt="CvSU Logo"
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
            />
            <Image
              src="/CQERFINAL.png"
              alt="CQER Final Logo"
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
            />
          </div>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Copyright className="h-3 w-3" />
            {new Date().getFullYear()} All rights reserved
          </p>
          <p className="text-[10px] font-medium text-foreground/80">
            Canata Coner Gonzalez Hizon
          </p>
        </div>
      </footer>
    </div>
  );
}
