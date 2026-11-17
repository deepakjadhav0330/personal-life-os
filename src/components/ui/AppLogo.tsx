interface AppLogoProps {
  size?: number;
}

/** Uses the real Life OS icon (favicon.svg) — consistent across all pages */
export function AppLogo({ size = 56 }: AppLogoProps) {
  return (
    <img
      src="/favicon.svg"
      width={size}
      height={size}
      alt="Life OS"
      style={{ borderRadius: size * 0.25 }}
    />
  );
}
