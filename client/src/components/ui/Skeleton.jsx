export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>{Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton className="h-3 w-20" /></th>
            ))}</tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>{Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton className="h-3 w-full" /></td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
