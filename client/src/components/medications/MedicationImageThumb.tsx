type MedicationImageThumbProps = {
  url: string | null | undefined;
  alt?: string;
  className?: string;
};

export function MedicationImageThumb({ url, alt = "Medication package", className }: MedicationImageThumbProps) {
  if (!url?.trim()) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
      <img
        src={url}
        alt={alt}
        className={className ?? "h-16 w-16 rounded border object-cover"}
      />
    </a>
  );
}
