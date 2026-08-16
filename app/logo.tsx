// eslint-disable-next-line @next/next/no-img-element
export default function Logo({
  logoUrl,
  size = 36,
  className = "",
}: {
  logoUrl: string | null;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl || "/icon-192.png"}
      alt=""
      width={size}
      height={size}
      className={`rounded-md object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
