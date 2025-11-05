import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  Users,
  DollarSign,
  UserCheck,
  UserPlus,
  Loader2,
  UsersRound,
  ClipboardList,
  ClipboardCheck,
  ClipboardX,
  Banknote,
  BadgePercent,
  Clock,
  Package,
  Scissors,
  ShoppingCart,
  TrendingUp,
  Star,
} from "lucide-react";

// import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
// import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Helpers & Services
import apiClient from "@/services/api";
import { PriceFormater } from "@/helper/priceFormater";
import { API_BASE_URL } from "@/config/BackendUrl";
import { AdminOutletContext } from "@/types/AdminOutletContext";

interface Period {
  startDate: string;
  endDate: string;
}

// ATUALIZADO com os novos campos
interface OverviewMetrics {
  totalBookings: number;
  completedBookings: number;
  canceledBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  onlineRevenue: number;
  onlinePaymentsCount: number;
  cancellationRate: number;
  averageTicket: number;
  totalUniqueCustomers: number;
  revenueFromServices: number;
  revenueFromPlans: number;
  totalPlansSold: number;
  totalRewardsRedeemed: number;
}

interface BarberPerformance {
  barberId: string;
  name: string;
  commissionRate: number;
  totalRevenue: number;
  completedBookings: number;
  canceledBookings: number;
  totalCommission: number | null;
  averageTicket: number;
  totalRewardsRedeemed: number;
}

interface ServicePerformance {
  serviceId: string;
  name: string;
  totalRevenue: number;
  count: number;
  redeemedAsReward: number;
}

interface CustomerStats {
  new: number;
  returning: number;
}

interface ProductMetrics {
  totalItemsSold: number;
  totalGrossRevenue: number;
  totalCostOfGoods: number;
  totalNetProfit: number;
}
interface DashboardMetricsData {
  period: Period;
  overview: OverviewMetrics;
  barberPerformance: BarberPerformance[];
  servicePerformance: ServicePerformance[];
  customerStats: CustomerStats;
  productMetrics: ProductMetrics;
}

// --- Componente Principal ---
export default function DashboardMetricsPage() {
  const { barbershopId, paymentsEnabled, loyaltyProgramEnable } = useOutletContext<AdminOutletContext>();
  const [data, setData] = useState<DashboardMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Filtro (mantidos)
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // graph data

  // Função fetchDashboardMetrics (mantida)
  const fetchDashboardMetrics = async (startDate: Date, endDate: Date) => {
    if (!barbershopId) return;
    setIsLoading(true);
    setError(null);

    const params = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };

    try {
      const response = await apiClient.get<DashboardMetricsData>(`${API_BASE_URL}/api/barbershops/${barbershopId}/dashboard-metrics`, { params });
      setData(response.data);
    } catch (err: any) {
      console.error("Erro ao buscar métricas:", err);
      setError("Não foi possível carregar as métricas.");
      toast.error(err.response?.data?.error || "Falha ao buscar métricas.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect para buscar dados (mantido)
  useEffect(() => {
    let start: Date | undefined;
    let end: Date | undefined;

    if (filterMode === "month") {
      const yearNum = parseInt(selectedYear, 10);
      const monthNum = parseInt(selectedMonth, 10) - 1; // Mês é 0-indexado no Date
      if (!isNaN(yearNum) && !isNaN(monthNum)) {
        start = startOfMonth(new Date(yearNum, monthNum));
        end = endOfMonth(new Date(yearNum, monthNum));
      }
    } else if (filterMode === "range" && dateRange?.from && dateRange?.to) {
      start = dateRange.from;
      end = dateRange.to;
    } else if (filterMode === "range" && dateRange?.from && !dateRange?.to) {
      start = dateRange.from;
      end = dateRange.from;
    }

    if (start && end) {
      fetchDashboardMetrics(start, end);
    } else {
      const now = new Date();
      fetchDashboardMetrics(startOfMonth(now), endOfMonth(now));
    }
  }, [barbershopId, selectedMonth, selectedYear, dateRange, filterMode]);

  const availableYears = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push((currentYear - i).toString());
    }
    return years;
  }, [currentYear]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Formatação de display (mantido)
  const formatActivePeriodDisplay = (): string => {
    if (filterMode === "month") {
      const yearNum = parseInt(selectedYear, 10);
      const monthNum = parseInt(selectedMonth, 10) - 1;
      if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 0 && monthNum < 12) {
        return `${monthNames[monthNum]} de ${yearNum}`;
      }
      return "Mês/Ano inválido";
    }
    return formatDateRangeDisplay(dateRange);
  };

  const formatDateRangeDisplay = (range: DateRange | undefined): string => {
    if (!range?.from) return "Selecione o intervalo";
    if (!range.to) return format(range.from, "PPP", { locale: ptBR });
    return `${format(range.from, "PPP", { locale: ptBR })} - ${format(range.to, "PPP", { locale: ptBR })}`;
  };

  return (
    <div className="space-y-6">
      {/* Filtros - mantidos */}
      {/* Loading e Error (mantidos) */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando métricas...</span>
        </div>
      )}
      {error && !isLoading && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao Carregar</CardTitle>
            <CardDescription className="text-destructive">Período: {formatActivePeriodDisplay()}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                if (filterMode === "month") {
                  const yearNum = parseInt(selectedYear, 10);
                  const monthNum = parseInt(selectedMonth, 10) - 1;
                  if (!isNaN(yearNum) && !isNaN(monthNum)) {
                    fetchDashboardMetrics(startOfMonth(new Date(yearNum, monthNum)), endOfMonth(new Date(yearNum, monthNum)));
                  }
                } else if (dateRange?.from && dateRange?.to) {
                  fetchDashboardMetrics(dateRange.from, dateRange.to);
                } else if (dateRange?.from) {
                  fetchDashboardMetrics(dateRange.from, dateRange.from);
                }
              }}
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {data && !isLoading && !error && (
        <>
          {/* --- Seção Visão Geral ATUALIZADA --- */}
          <Card>
            <CardHeader className="flex justify-between flex-row">
              <div>
                <CardTitle>Visão Geral do Período</CardTitle>
                <CardDescription>Resumo dos resultados de {formatActivePeriodDisplay()}.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={selectedMonth}
                    onValueChange={(value) => {
                      setSelectedMonth(value);
                      setFilterMode("month");
                    }}
                  >
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
                  <Select
                    value={selectedYear}
                    onValueChange={(value) => {
                      setSelectedYear(value);
                      setFilterMode("month");
                    }}
                  >
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range-popover"
                        variant={"outline"}
                        className={`w-full sm:w-auto justify-start text-left font-normal ${
                          filterMode === "range" ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                        onClick={() => setFilterMode("range")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterMode === "range" ? formatDateRangeDisplay(dateRange) : "Intervalo Específico"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from ?? new Date()}
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          if (range?.from) {
                            setFilterMode("range");
                          }
                        }}
                        numberOfMonths={2}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grupo de Receita e Financeiro (ATUALIZADO) */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                  <DollarSign size={20} />
                  Financeiro
                </h3>
                {/* ATUALIZADO para grid com mais colunas */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <MetricCard
                    title="Receita Total"
                    value={PriceFormater(data.overview.totalRevenue)}
                    icon={Banknote}
                    description={`${data.overview.completedBookings} agendamentos concluídos`}
                    valueClassName="text-green-600"
                  />
                  {/* --- NOVOS CARDS --- */}
                  <MetricCard
                    title="Receita de Serviços"
                    value={PriceFormater(data.overview.revenueFromServices)}
                    icon={Scissors}
                    description="Receita de agendamentos avulsos"
                    valueClassName="text-blue-600"
                  />
                  <MetricCard
                    title="Receita de Planos"
                    value={PriceFormater(data.overview.revenueFromPlans)}
                    icon={Package}
                    description={`${data.overview.totalPlansSold} planos vendidos`}
                    valueClassName="text-violet-600"
                  />
                  {/* --- FIM NOVOS CARDS --- */}
                  <MetricCard
                    title="Comissão Total"
                    value={PriceFormater(data.barberPerformance.reduce((acc, barber) => acc + (barber.totalCommission ?? 0), 0))}
                    icon={BadgePercent}
                    description="Valor pago aos profissionais"
                    valueClassName="text-purple-600"
                  />
                  {paymentsEnabled && (
                    <MetricCard
                      title="Receita Online"
                      value={PriceFormater(data.overview.onlineRevenue)}
                      icon={DollarSign}
                      description={`${data.overview.onlinePaymentsCount} pagamentos via app`}
                      valueClassName="text-teal-600"
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Grupo de Agendamentos */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                  <ClipboardList size={20} /> Agendamentos
                </h3>
                <div className={`grid gap-4 md:grid-cols-3 lg:grid-cols-4 ${loyaltyProgramEnable && `lg:grid-cols-5`}`}>
                  <MetricCard title="Total Criados" value={data.overview.totalBookings} icon={ClipboardList} />
                  <MetricCard title="Concluídos" value={data.overview.completedBookings} icon={ClipboardCheck} valueClassName="text-green-600" />
                  <MetricCard
                    title="Cancelados"
                    value={data.overview.canceledBookings}
                    icon={ClipboardX}
                    description={`${data.overview.cancellationRate.toFixed(1)}% taxa`}
                    valueClassName="text-red-600"
                  />
                  <MetricCard
                    title="Pendentes"
                    value={data.overview.pendingBookings}
                    icon={Clock}
                    description="Aguardando status final"
                    valueClassName="text-orange-600"
                  />
                  {loyaltyProgramEnable && (
                    <MetricCard
                      title="Prêmios Resgatados"
                      value={data.overview.totalRewardsRedeemed}
                      icon={Star}
                      description="Usados no período"
                      valueClassName="text-yellow-600"
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Grupo de Clientes (mantido) */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                  <UsersRound size={20} /> Clientes
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Clientes Únicos" value={data.overview.totalUniqueCustomers} icon={Users} description="Atendidos no período" />
                  <MetricCard
                    title="Novos Clientes"
                    value={data.customerStats.new}
                    icon={UserPlus}
                    description="Cadastrados no período"
                    valueClassName="text-cyan-600"
                  />
                  <MetricCard
                    title="Clientes Recorrentes"
                    value={data.customerStats.returning}
                    icon={UserCheck}
                    description="Já eram clientes antes"
                    valueClassName="text-indigo-600"
                  />
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                  <ShoppingCart size={20} /> Métricas de Produtos
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard title="Itens Vendidos" value={data.productMetrics.totalItemsSold} icon={ShoppingCart} />
                  <MetricCard
                    title="Receita Bruta (Produtos)"
                    value={PriceFormater(data.productMetrics.totalGrossRevenue)}
                    icon={Banknote}
                    valueClassName="text-green-600"
                  />
                  <MetricCard
                    title="Custo (Produtos)"
                    value={PriceFormater(data.productMetrics.totalCostOfGoods)}
                    icon={DollarSign}
                    valueClassName="text-red-600"
                  />
                  <MetricCard
                    title="Lucro Líquido (Produtos)"
                    value={PriceFormater(data.productMetrics.totalNetProfit)}
                    icon={BadgePercent}
                    valueClassName="text-purple-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
              <TrendingUp size={20} />
              Faturamento Anual ({selectedYear})
            </h3>
          </div>

          {/* --- Desempenho dos Barbeiros (mantido) --- */}
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Profissional</CardTitle>
              <CardDescription>Resultados individuais dos profissionais no período.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-center text-blue-600">Atendidos</TableHead>
                    <TableHead className="text-center text-red-600 hidden md:table-cell">Cancelados</TableHead>
                    <TableHead className="text-right text-green-600">Receita</TableHead>
                    <TableHead className="text-right text-green-600 hidden lg:table-cell">Ticket Médio</TableHead>
                    <TableHead className="text-center text-purple-600 hidden md:table-cell">Comissão (%)</TableHead>
                    <TableHead className="text-right text-purple-600">Comissão (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.barberPerformance.length > 0 ? (
                    data.barberPerformance.map((barber) => (
                      <TableRow key={barber.barberId}>
                        <TableCell className="font-medium">{barber.name}</TableCell>
                        <TableCell className="text-center">{barber.completedBookings}</TableCell>
                        <TableCell className="text-center text-red-700 hidden md:table-cell">{barber.canceledBookings}</TableCell>
                        <TableCell className="text-right text-green-700">{PriceFormater(barber.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-green-700 hidden lg:table-cell">{PriceFormater(barber.averageTicket)}</TableCell>
                        <TableCell className="text-center text-purple-700 hidden md:table-cell">{barber.commissionRate}%</TableCell>
                        <TableCell className="text-right font-semibold text-purple-700">{PriceFormater(barber.totalCommission ?? 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhum dado de profissional para este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Desempenho dos Serviços (mantido) */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços Mais Populares</CardTitle>
              <CardDescription>Receita e quantidade por serviço no período.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Receita Gerada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.servicePerformance.length > 0 ? (
                    data.servicePerformance.map((service) => (
                      <TableRow key={service.serviceId}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell className="text-center">{service.count}</TableCell>
                        <TableCell className="text-right font-semibold">{PriceFormater(service.totalRevenue)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Nenhum dado de serviço para este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// --- Componente MetricCard (mantido) ---
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
