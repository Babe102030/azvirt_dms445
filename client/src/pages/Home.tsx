import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { SignInButton } from "@clerk/clerk-react";
import DashboardLayout from "@/components/DashboardLayout";
import DeliveryTrendsChart from "@/components/DeliveryTrendsChart";
import MaterialConsumptionChart from "@/components/MaterialConsumptionChart";
import DashboardFilters from "@/components/DashboardFilters";
import {
  FileText, Package, Truck, FlaskConical, Folder, TrendingUp,
  AlertCircle, CheckCircle, Clock, Search, Filter, Download, Activity
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadExcelFile, generateExportFilename } from "@/lib/exportUtils";
import { toast } from "sonner";

export default function Home() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});

  const exportAllMutation = trpc.export.all.useMutation({
    onSuccess: (data) => {
      downloadExcelFile(data.data, generateExportFilename("azvirt_dms_all_data"));
      toast.success("Svi podaci uspješno izvezeni");
    },
    onError: (error) => {
      toast.error(`Neuspjeli izvoz: ${error.message}`);
    },
  });

  const handleExportAll = () => {
    exportAllMutation.mutate();
  };
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/azvirt-35years-bg.png)' }}
      >
        <div className="text-center max-w-2xl bg-black/40 backdrop-blur-sm p-12 rounded-2xl">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            AzVirt DMS
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 drop-shadow-lg">
            {t("dashboard.welcome")}
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="text-lg px-8 py-6 bg-orange-600 hover:bg-orange-700">
              {t("auth.loginToContinue")}
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with Search and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t("dashboard.title")}</h1>
            <p className="text-white/70">{t("dashboard.welcome")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 md:flex-initial min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-primary/20"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleExportAll}
              disabled={exportAllMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {exportAllMutation.isPending ? "Izvoz..." : "Izvezi sve podatke"}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <DashboardFilters
            onFilterChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Alert Banners */}
        <div className="space-y-3">
          {(stats?.lowStockMaterials ?? 0) > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-yellow-500/10 border-yellow-500/20 text-yellow-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Niska zaliha</h3>
                <p className="text-sm">{stats?.lowStockMaterials} artikala ima nisku zalihu. Preporučuje se dopuna.</p>
              </div>
            </div>
          )}
          {(stats?.todayDeliveries ?? 0) > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-700">
              <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Zakazane isporuke</h3>
                <p className="text-sm">Danas je zakazano {stats?.todayDeliveries} isporuke. Proverite status.</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/projects">
            <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-all cursor-pointer hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.activeProjects")}</CardTitle>
                <Folder className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeProjects ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalProjects ?? 0} {t("dashboard.totalProjects")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/documents">
            <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-all cursor-pointer hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.documents")}</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalDocuments ?? 0}</div>
                <p className="text-xs text-muted-foreground">{t("dashboard.totalDocuments")}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/deliveries">
            <Card className={`bg-card/90 backdrop-blur transition-all cursor-pointer hover:shadow-lg ${(stats?.todayDeliveries ?? 0) > 0
              ? "border-yellow-500/20 hover:border-yellow-500/40"
              : "border-primary/20 hover:border-primary/40"
              }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.todayDeliveries")}</CardTitle>
                <Truck className={`h-4 w-4 ${(stats?.todayDeliveries ?? 0) > 0 ? "text-yellow-500" : "text-primary"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.todayDeliveries ?? 0}</div>
                <p className="text-xs text-muted-foreground">{t("dashboard.scheduledToday")}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/materials">
            <Card className={`bg-card/90 backdrop-blur transition-all cursor-pointer hover:shadow-lg ${(stats?.lowStockMaterials ?? 0) > 0
              ? "border-red-500/20 hover:border-red-500/40"
              : "border-primary/20 hover:border-primary/40"
              }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.lowStockItems")}</CardTitle>
                <Package className={`h-4 w-4 ${(stats?.lowStockMaterials ?? 0) > 0 ? "text-red-500" : "text-primary"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.lowStockMaterials ?? 0}</div>
                <p className="text-xs text-muted-foreground">{t("dashboard.needsReplenishment")}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/90 backdrop-blur border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.totalMaterials")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMaterials ?? 0}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.inStock")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.pendingTests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pendingTests ?? 0}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.awaitingProcessing")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.totalDeliveries")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDeliveries ?? 0}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.allDeliveries")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/documents">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FileText className="mr-2 h-5 w-5" />
                  {t("dashboard.uploadDocument")}
                </Button>
              </Link>
              <Link href="/deliveries">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Truck className="mr-2 h-5 w-5" />
                  {t("dashboard.scheduleDelivery")}
                </Button>
              </Link>
              <Link href="/quality">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FlaskConical className="mr-2 h-5 w-5" />
                  {t("dashboard.recordQualityTest")}
                </Button>
              </Link>
              <Link href="/materials">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Package className="mr-2 h-5 w-5" />
                  {t("dashboard.manageInventory")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle>{t("dashboard.systemOverview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("dashboard.totalMaterials")}</span>
                <span className="font-medium">{stats?.totalMaterials ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("dashboard.totalDeliveries")}</span>
                <span className="font-medium">{stats?.totalDeliveries ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("dashboard.pendingTests")}</span>
                <span className="font-medium">{stats?.pendingTests ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("dashboard.activeProjects")}</span>
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
