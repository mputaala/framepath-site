import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

// Max-width content wrapper. 80rem (1280px) is a comfortable cap for the
// hero / features on a 1440px laptop with breathing room. Horizontal padding
// steps up at sm / lg so mobile gets edge-to-edge feel.
export const Container = ({ children, className = "" }: ContainerProps) => {
  return (
    <div
      className={["mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};
