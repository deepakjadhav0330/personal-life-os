interface AppLogoProps {
  size?: number;
}

/** Uses the real Life OS app icon — matches the PWA home screen icon */
export function AppLogo({ size = 64 }: AppLogoProps) {
  return (
    <img
      src="/icons/icon.svg"
      width={size}
      height={size}
      alt="Life OS"
      style={{ borderRadius: size * 0.2 }}
    />
  );
}
