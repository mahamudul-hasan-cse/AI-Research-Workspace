type PlaceholderCardProps = {
  title: string;
  description: string;
};

export function PlaceholderCard({ title, description }: PlaceholderCardProps) {
  return (
    <section className="rounded-card border border-dashed border-border bg-surface p-5">
      <span className="inline-block rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
        Coming soon
      </span>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </section>
  );
}

export function PlaceholderGrid({ items }: { items: PlaceholderCardProps[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <PlaceholderCard key={item.title} {...item} />
      ))}
    </div>
  );
}
