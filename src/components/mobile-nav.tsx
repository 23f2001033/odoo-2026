"use client";

import { useState } from "react";
import { Role } from "@prisma/client";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NavLinks } from "@/components/app-sidebar";

// The desktop sidebar (app-sidebar.tsx) is entirely `hidden` below the `md`
// breakpoint — this is its replacement, so mobile users have a way to
// navigate at all instead of only reachable-by-typing-the-URL screens.
export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader className="border-b">
            <SheetTitle>
              Asset<span className="text-primary">Flow</span>
            </SheetTitle>
          </SheetHeader>
          <NavLinks role={role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
