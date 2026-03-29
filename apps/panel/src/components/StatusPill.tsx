interface StatusPillProps {
  stale?: boolean;
  reachable?: boolean;
}

export function StatusPill({ stale, reachable }: StatusPillProps) {
  if (reachable === false) {
    return <span className="status-pill danger">不可达</span>;
  }

  if (stale) {
    return <span className="status-pill warn">可能过期</span>;
  }

  return <span className="status-pill ok">最新快照</span>;
}
