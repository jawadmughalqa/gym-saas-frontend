interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Buttons/actions rendered top-right of the header */
  actions?: React.ReactNode;
}

/**
 * Standard page header used at the top of every feature page.
 *
 * Usage:
 *   <PageHeader title="Members" subtitle="Manage gym members" actions={<Button>Add member</Button>} />
 */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
