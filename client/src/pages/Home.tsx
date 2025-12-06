import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import DeliveryTrendsChart from "@/components/DeliveryTrendsChart";
import MaterialConsumptionChart from "@/components/MaterialConsumptionChart";
import { FileText, Package, Truck, FlaskConical, Folder, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Učitavanje...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">
            AzVirt DMS
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow">
            Sistem za upravljanje dokumentima za izvrsnost u građevinarstvu
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <a href={getLoginUrl()}>Prijavite se za nastavak</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kontrolna tabla</h1>
          <p className="text-white/70">Dobrodošli u AzVirt sistem za upravljanje dokumentima</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktivni projekti</CardTitle>
              <Folder className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeProjects ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalProjects ?? 0} ukupno projekata
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dokumenti</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDocuments ?? 0}</div>
              <p className="text-xs text-muted-foreground">Ukupno sačuvanih fajlova</p>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Današnje isporuke</CardTitle>
              <Truck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayDeliveries ?? 0}</div>
              <p className="text-xs text-muted-foreground">Zakazano za danas</p>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Artikli sa niskim zalihama</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.lowStockMaterials ?? 0}</div>
              <p className="text-xs text-muted-foreground">Potrebna dopuna</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle>Brze akcije</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/documents">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FileText className="mr-2 h-5 w-5" />
                  Otpremi dokument
                </Button>
              </Link>
              <Link href="/deliveries">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Truck className="mr-2 h-5 w-5" />
                  Zakaži isporuku
                </Button>
              </Link>
              <Link href="/quality">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FlaskConical className="mr-2 h-5 w-5" />
                  Zabilježi test kvaliteta
                </Button>
              </Link>
              <Link href="/materials">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Package className="mr-2 h-5 w-5" />
                  Upravljaj zalihama
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle>Pregled sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ukupno materijala</span>
                <span className="font-medium">{stats?.totalMaterials ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Ukupno isporuka</span>
                <span className="font-medium">{stats?.totalDeliveries ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Testovi na čekanju</span>
                <span className="font-medium">{stats?.pendingTests ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Aktivni projekti</span>
                <span className="font-medium">{stats?.activeProjects ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <DeliveryTrendsChart />
          <MaterialConsumptionChart />
        </div>
      </div>
    </DashboardLayout>
  );
}
