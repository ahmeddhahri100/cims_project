export function Spinner({ size = 'md', color = 'primary' }) {
  const sizeMap = { sm: 16, md: 24, lg: 40, xl: 56 };
  return (
    <div className={`spinner spinner--${size} spinner--${color}`}>
      <svg width={sizeMap[size]} height={sizeMap[size]} viewBox="0 0 24 24">
        <circle 
          cx="12" cy="12" r="10" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeDasharray="50 50" 
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner size="xl" />
      <p className="page-loader__text">Chargement...</p>
    </div>
  );
}

export function ButtonLoader() {
  return (
    <span className="button-loader">
      <Spinner size="sm" color="white" />
    </span>
  );
}

export function Skeleton({ width, height, variant = 'rect', className = '' }) {
  return (
    <div 
      className={`skeleton skeleton--${variant} ${className}`}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card-skeleton">
      <div className="card-skeleton__header">
        <Skeleton variant="circle" width={48} height={48} />
        <div className="card-skeleton__title">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="card-skeleton__content">
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} />
        <Skeleton width="90%" height={12} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-skeleton">
      <div className="table-skeleton__header">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} width="100%" height={14} />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="table-skeleton__row">
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton width="70%" height={12} />
          <Skeleton width="50%" height={12} />
          <Skeleton width="30%" height={12} />
        </div>
      ))}
    </div>
  );
}
