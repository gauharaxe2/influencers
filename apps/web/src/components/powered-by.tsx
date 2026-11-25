const AXES_ERA_URL = "https://gauharaxe.org/";

export function PoweredBy({ className }: { className?: string }) {
  return (
    <p className={className ? `powered-by ${className}` : "powered-by"}>
      Powered by:{" "}
      <a href={AXES_ERA_URL} target="_blank" rel="noopener noreferrer">
        Axe&apos;s Era Enterprises
      </a>
    </p>
  );
}
