import type { ReactNode } from "react";

import { RefractRuntimeBootstrap } from "./refract-bootstrap";
import "./globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <RefractRuntimeBootstrap />
        {children}
      </body>
    </html>
  );
}
