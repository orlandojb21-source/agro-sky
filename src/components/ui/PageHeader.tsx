export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
