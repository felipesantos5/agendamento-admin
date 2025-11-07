import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

// Componentes de UI e Ícones
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, UserCheck, Loader2, Banknote, BadgePercent, ClipboardList, Scissors } from "lucide-react";

// Helpers e Serviços
import apiClient from "@/services/api";
import { PriceFormater } from "@/helper/priceFormater";
import { API_BASE_URL } from "@/config/BackendUrl";

// --- Tipagens ---
interface AdminOutletContext {
  barbershopId: string;
}

interface Period {
  startDate: string;
  endDate: string;
}

// Métricas de visão geral para o barbeiro
interface OverviewMetrics {
  totalRevenue: number;
  totalBookings: number;
  commissionRate: number;
  totalCommission: number;
  averageTicket: number;
  totalUniqueCustomers: number;
}

// Detalhamento por serviço
interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  count: number;
  revenueFromService: number;
}

// Estrutura completa dos dados da API
interface BarberPerformanceData {
  period: Period;
  overview: OverviewMetrics;
  serviceBreakdown: ServiceBreakdown[];
}

// --- Componente Principal ---
export function BarberPerformancePage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const [data, setData] = useState<BarberPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Filtro
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Função para buscar os dados de performance
  const fetchPerformanceData = async (startDate: Date, endDate: Date) => {
    if (!barbershopId) return;
    setIsLoading(true);
    setError(null);

    const params = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };

    try {
      // A API /barber-performance identificará o barbeiro logado pelo token JWT
      const response = await apiClient.get<BarberPerformanceData>(`${API_BASE_URL}/api/barbershops/${barbershopId}/barber-performance`, { params });
      setData(response.data);
    } catch (err: any) {
      console.error("Erro ao buscar performance:", err);
      setError("Não foi possível carregar o relatório de performance.");
      toast.error(err.response?.data?.error || "Falha ao buscar dados.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect para buscar dados quando os filtros mudarem
  useEffect(() => {
    const yearNum = parseInt(selectedYear, 10);
    const monthNum = parseInt(selectedMonth, 10) - 1; // Mês é 0-indexado no Date

    if (!isNaN(yearNum) && !isNaN(monthNum)) {
      const start = startOfMonth(new Date(yearNum, monthNum));
      const end = endOfMonth(new Date(yearNum, monthNum));
      fetchPerformanceData(start, end);
    }
  }, [barbershopId, selectedMonth, selectedYear]);

  // Opções para os filtros de Select
  const availableYears = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push((currentYear - i).toString());
    }
    return years;
  }, [currentYear]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Formata o período selecionado para exibição
  const formatActivePeriodDisplay = (): string => {
    const yearNum = parseInt(selectedYear, 10);
    const monthNum = parseInt(selectedMonth, 10) - 1;
    if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 0 && monthNum < 12) {
      return `${monthNames[monthNum]} de ${yearNum}`;
    }
    return "Mês/Ano inválido";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Minha Performance</CardTitle>
            <CardDescription>{isLoading ? "Calculando..." : `Resumo dos seus resultados de ${formatActivePeriodDisplay()}.`}</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Calculando performance...</span>
          </div>
        )}

        {error && !isLoading && (
          <CardContent>
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        )}

        {data && !isLoading && !error && (
          <CardContent className="space-y-6">
            {/* --- Seção Visão Geral --- */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                <DollarSign size={20} />
                Visão Geral
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Receita Total Gerada"
                  value={PriceFormater(data.overview.totalRevenue)}
                  icon={Banknote}
                  description={`${data.overview.totalBookings} agendamentos concluídos`}
                  valueClassName="text-green-600"
                />
                <MetricCard
                  title="Sua Comissão"
                  value={PriceFormater(data.overview.totalCommission)}
                  icon={BadgePercent}
                  description={`Baseado em ${data.overview.commissionRate}% da receita`}
                  valueClassName="text-purple-600"
                />
                <MetricCard title="Total de Atendimentos" value={data.overview.totalBookings} icon={ClipboardList} />
                <MetricCard title="Clientes Únicos" value={data.overview.totalUniqueCustomers} icon={Users} description="Clientes que você atendeu" />
              </div>
            </div>

            {/* --- Detalhamento por Serviço --- */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                <Scissors size={20} />
                Serviços Realizados
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Receita Gerada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.serviceBreakdown.length > 0 ? (
                      data.serviceBreakdown.map((service) => (
                        <TableRow key={service.serviceId}>
                          <TableCell className="font-medium">{service.serviceName}</TableCell>
                          <TableCell className="text-center">{service.count}</TableCell>
                          <TableCell className="text-right font-semibold">{PriceFormater(service.revenueFromService)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          Nenhum serviço realizado neste período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// --- Componente Auxiliar MetricCard ---
// (Copiado de DashboardMetricsPage.tsx para reutilização)
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  className?: string;
  valueClassName?: string;
}

function MetricCard({ title, value, icon: Icon, description, className, valueClassName }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName ? valueClassName : ""}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
