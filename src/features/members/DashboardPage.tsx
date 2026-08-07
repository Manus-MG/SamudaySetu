import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/client.ts';

interface HealthReport {
  status: string;
  environment: string;
  dependencies: { mongo: string; redis: string };
}

export function DashboardPage(): React.JSX.Element {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => get<HealthReport>('/health/ready'),
  });

  return (
    <main className="page">
      <h1>Dashboard</h1>
      {isPending && <p>Loading…</p>}
      {isError && <p>API unreachable. Is the backend running on port 4000?</p>}
      {data && (
        <ul>
          <li>Status: {data.status}</li>
          <li>Environment: {data.environment}</li>
          <li>Mongo: {data.dependencies.mongo}</li>
          <li>Redis: {data.dependencies.redis}</li>
        </ul>
      )}
    </main>
  );
}
