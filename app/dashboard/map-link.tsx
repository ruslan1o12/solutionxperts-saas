export default function MapLink({
  address,
  className,
  label,
}: {
  address: string;
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "text-steel underline"}
    >
      {label ?? address}
    </a>
  );
}
