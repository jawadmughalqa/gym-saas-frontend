import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Dumbbell, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Active Members', value: '—', icon: Users, color: 'text-blue-600' },
  { label: 'Revenue (Month)', value: '—', icon: CreditCard, color: 'text-green-600' },
  { label: 'Trainers', value: '—', icon: Dumbbell, color: 'text-purple-600' },
  { label: 'Growth', value: '—', icon: TrendingUp, color: 'text-orange-600' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back — here's what's happening at your gym.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Run <code className="bg-muted px-1 rounded">npm run api:gen</code> with the backend running to generate typed API hooks.</p>
          <p>Then import from <code className="bg-muted px-1 rounded">@/api/generated</code> to build out each feature page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
