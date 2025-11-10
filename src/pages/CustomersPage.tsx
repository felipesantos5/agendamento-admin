// src/pages/CustomersPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Imports de UI e Ícones
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  MoreHorizontal,
  User,
  Filter,
  Search,
  CalendarDays,
  Clock,
  Scissors,
  Calendar,
  History,
  Contact, // ✅ Ícone adicionado
} from "lucide-react";
import { PhoneFormat } from "@/helper/phoneFormater";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dateFormatter } from "@/helper/dateFormatter";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { API_BASE_URL } from "@/config/BackendUrl";
import { PriceFormater } from "@/helper/priceFormater";
import { AdminOutletContext } from "@/types/AdminOutletContext";

interface LoyaltyData {
  barbershop: string;
  progress: number;
  rewards: number;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  imageUrl?: string;
  createdAt: string;
  subscriptions?: Subscription[];
  lastBookingTime?: string;
  loyaltyData?: LoyaltyData[];
}

interface Subscription {
  _id: string;
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  plan: Plan;
}

interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  durationInDays: number;
}

// ✅ NOVA INTERFACE PARA BARBEIROS
interface Barber {
  _id: string;
  name: string;
}

interface Booking {
  _id: string;
  date: string;
  time: string;
  status: "confirmed" | "completed" | "cancelled" | "no-show";
  service: {
    _id: string;
    name: string;
    price: number;
    duration?: number;
  };
  barber: {
    _id: string;
    name: string;
  };
  barbershop: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCustomers: number;
  limit: number;
}

interface CustomersApiResponse {
  customers: Customer[];
  pagination: PaginationData;
}

// --- Componente Principal ---
export function CustomersPage() {
  const { barbershopId, loyaltyProgramEnable, loyaltyProgramCount } = useOutletContext<AdminOutletContext>();

  // Estados existentes...
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]); // ✅ NOVO ESTADO
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "with-plan" | "without-plan">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedBarberId, setSelectedBarberId] = useState<string>(""); // ✅ NOVO ESTADO
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [selectedCustomerForBookings, setSelectedCustomerForBookings] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const ITEMS_PER_PAGE = 15;

  // --- fetchPageData ATUALIZADA para incluir barbeiros ---
  const fetchPageData = useCallback(
    async (page = 1) => {
      if (!barbershopId) return;
      setIsLoading(true);
      try {
        const customerParams = new URLSearchParams({
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        });
        if (searchTerm.trim()) {
          customerParams.append("search", searchTerm.trim());
        }
        if (filterStatus !== "all") {
          customerParams.append("subscriptionStatus", filterStatus);
        }

        const [customersRes, plansRes, barbersRes] = await Promise.all([
          // ✅ Adicionado barbersRes
          apiClient.get<CustomersApiResponse>(`${API_BASE_URL}/api/barbershops/${barbershopId}/admin/customers?${customerParams.toString()}`),
          apiClient.get(`${API_BASE_URL}/api/barbershops/${barbershopId}/plans`),
          apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`), // ✅ Busca barbeiros
        ]);

        setCustomers(customersRes.data.customers);
        setPlans(plansRes.data);
        setAllBarbers(barbersRes.data); // ✅ Salva barbeiros
        setCurrentPage(customersRes.data.pagination.currentPage);
        setTotalPages(customersRes.data.pagination.totalPages);
        setTotalCustomers(customersRes.data.pagination.totalCustomers);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error(error.response?.data?.message || "Erro ao carregar dados da página.");
        setCustomers([]);
        setTotalPages(1);
        setTotalCustomers(0);
      } finally {
        setIsLoading(false);
      }
    },
    [barbershopId, searchTerm, filterStatus]
  );

  useEffect(() => {
    fetchPageData(currentPage);
  }, [fetchPageData, currentPage]);

  // Função para buscar agendamentos do cliente (mantida)
  const fetchCustomerBookings = async (customerId: string) => {
    setIsLoadingBookings(true);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/barbershops/${barbershopId}/admin/customers/${customerId}/bookings`);
      const sortedBookings = response.data.sort((a: Booking, b: Booking) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setCustomerBookings(sortedBookings);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error(error.response?.data?.message || "Erro ao carregar histórico de agendamentos.");
      setCustomerBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Função para abrir modal de agendamentos (mantida)
  const handleOpenBookingsModal = async (customer: Customer) => {
    setSelectedCustomerForBookings(customer);
    setIsBookingsModalOpen(true);
    await fetchCustomerBookings(customer._id);
  };

  // ✅ ATUALIZADO: Funções para modal de planos
  const handleOpenSubscribeModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedPlanId("");
    setSelectedBarberId(""); // ✅ Reseta barbeiro
    setErrorModal("");
    setIsModalOpen(true);
  };

  const handleSubscribeCustomer = async () => {
    // ✅ Validação atualizada
    if (!selectedCustomer || !selectedPlanId || !selectedBarberId) {
      const errorMessage = !selectedPlanId ? "Por favor, selecione um plano." : "Por favor, selecione um barbeiro.";
      toast.error(errorMessage);
      setErrorModal(errorMessage);
      return;
    }
    setIsSubscribing(true);
    setErrorModal("");
    try {
      // ✅ Payload atualizado
      await apiClient.post(`${API_BASE_URL}/api/barbershops/${barbershopId}/admin/customers/${selectedCustomer._id}/subscribe`, {
        planId: selectedPlanId,
        barberId: selectedBarberId,
      });

      toast.success(`${selectedCustomer.name} agora tem um novo plano!`);
      setIsModalOpen(false);
      fetchPageData(currentPage);
    } catch (error: any) {
      console.error("Erro ao atribuir plano:", error);
      const apiError = error.response?.data?.message || "Falha ao atribuir o plano.";
      setErrorModal(apiError);
      toast.error(apiError);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Funções auxiliares (mantidas)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatDateTime = (dateTimeString: string | undefined): string => {
    if (!dateTimeString) return "N/A";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Data/hora inválida";
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data/hora inválida";
    }
  };

  const getDaysRemaining = (endDate: string | undefined): number | null => {
    if (!endDate) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      const localEnd = new Date(end.toLocaleString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
      localEnd.setHours(0, 0, 0, 0);

      const diffTime = localEnd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      booked: { label: "Agendado", variant: "default" as const },
      completed: { label: "Concluído", variant: "secondary" as const },
      canceled: { label: "Cancelado", variant: "destructive" as const },
      "no-show": { label: "Não Compareceu", variant: "outline" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      variant: "outline" as const,
    };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getLastBookingBadge = (lastBookingTime: string | undefined) => {
    if (!lastBookingTime) {
      return <Badge variant="outline">Nunca agendou</Badge>;
    }
    try {
      const lastBookingDate = new Date(lastBookingTime);
      if (isNaN(lastBookingDate.getTime())) {
        return <Badge variant="destructive">Data inválida</Badge>;
      }
      const formattedDateTime = formatDateTime(lastBookingTime);
      return <Badge variant="secondary">{formattedDateTime}</Badge>;
    } catch {
      return <Badge variant="destructive">Erro formatar</Badge>;
    }
  };

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {totalCustomers} cliente{totalCustomers !== 1 ? "s" : ""} encontrado{totalCustomers !== 1 ? "s" : ""}
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select
                value={filterStatus}
                onValueChange={(value: "all" | "with-plan" | "without-plan") => {
                  setFilterStatus(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  <SelectItem value="with-plan">Com plano ativo</SelectItem>
                  <SelectItem value="without-plan">Sem plano ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano Ativo</TableHead>
                  <TableHead>Cliente Desde</TableHead>
                  <TableHead>Último Agendamento</TableHead>
                  {loyaltyProgramEnable && <TableHead className="text-center">Fidelidade</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && customers.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 relative">
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && customers.length > 0 ? (
                  customers.map((customer) => {
                    const activeSubscription = customer.subscriptions?.find((sub) => sub.status === "active");
                    const daysRemaining = getDaysRemaining(activeSubscription?.endDate);

                    return (
                      <TableRow key={customer._id} className="hover:bg-muted/50">
                        <TableCell>
                          <div
                            className="flex items-center space-x-3 cursor-pointer hover:bg-muted/30 p-2 rounded-md transition-colors"
                            onClick={() => handleOpenBookingsModal(customer)}
                            title="Ver histórico de agendamentos"
                          >
                            <div className="flex-shrink-0">
                              {customer.imageUrl ? (
                                <img src={customer.imageUrl} alt={customer.name} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary">
                                <History size={14} /> Ver Histórico
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <a
                              href={`https://wa.me/55${customer.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {PhoneFormat(customer.phone)}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          {activeSubscription ? (
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{activeSubscription.plan.name}</p>
                              <Badge
                                variant={daysRemaining === null ? "outline" : daysRemaining <= 7 ? "destructive" : "default"}
                                className="text-xs"
                              >
                                {daysRemaining !== null
                                  ? daysRemaining > 0
                                    ? `${daysRemaining} dias restantes`
                                    : daysRemaining === 0
                                    ? "Expira hoje"
                                    : "Expirado"
                                  : "Data Inválida"}
                              </Badge>
                              <div className="text-xs text-muted-foreground">Até {formatDate(activeSubscription.endDate)}</div>
                            </div>
                          ) : (
                            <Badge variant="outline">Sem plano</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                            {formatDate(customer.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>{getLastBookingBadge(customer.lastBookingTime)}</TableCell>

                        {loyaltyProgramEnable && (
                          <TableCell className="text-center">
                            {(() => {
                              const customerProgressData = customer.loyaltyData?.find((data) => data.barbershop === barbershopId);
                              const progress = customerProgressData?.progress || 0;
                              const rewards = customerProgressData?.rewards || 0;
                              const target = loyaltyProgramCount || 10;

                              return (
                                <div className="flex flex-col items-center justify-center space-y-1">
                                  <span className="font-bold text-sm text-primary">
                                    {progress}
                                    <span className="text-muted-foreground text-xs"> / {target}</span>
                                  </span>
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    Nº de premios {rewards}
                                  </Badge>
                                </div>
                              );
                            })()}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenSubscribeModal(customer)}>
                                {activeSubscription ? "Alterar Plano" : "Atribuir Plano"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {searchTerm || filterStatus !== "all"
                            ? "Nenhum cliente encontrado com os filtros aplicados."
                            : "Nenhum cliente cadastrado ainda."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      aria-disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="font-medium text-sm mx-4">
                      Página {currentPage} de {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1);
                        }
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      aria-disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Modais --- */}
      {/* Modal de Histórico */}
      <Dialog open={isBookingsModalOpen} onOpenChange={setIsBookingsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Agendamentos - {selectedCustomerForBookings?.name}
            </DialogTitle>
            <DialogDescription>Visualize todos os agendamentos realizados por este cliente ({customerBookings.length} encontrados)</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isLoadingBookings ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-6 w-6 mr-2" />
                <span>Carregando agendamentos...</span>
              </div>
            ) : customerBookings.length > 0 ? (
              <ScrollArea className="h-[400px] w-full pr-4">
                <div className="space-y-4">
                  {customerBookings.map((booking) => (
                    <Card key={booking._id} className="p-4 bg-secondary/30">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{formatDateTime(booking.time)}</span>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">
                              <strong>Serviço:</strong> {booking.service?.name || "N/A"}
                            </span>
                            {booking.service && <p className="text-xs text-green-700 font-semibold">{PriceFormater(booking.service.price)}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">
                              <strong>Profissional:</strong> {booking.barber?.name || "N/A"}
                            </span>
                          </div>
                          {booking.service?.duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">
                                <strong>Duração:</strong> {booking.service.duration} min
                              </span>
                            </div>
                          )}
                          {booking.notes && (
                            <div className="text-sm text-muted-foreground pt-1 italic border-l-2 border-primary pl-2">
                              <strong>Obs:</strong> {booking.notes}
                            </div>
                          )}
                        </div>
                        {booking.createdAt && (
                          <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                            Pedido em
                            <br /> {dateFormatter(booking.createdAt)}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-muted-foreground">Este cliente ainda não realizou nenhum agendamento nesta barbearia.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ ATUALIZADO: Modal de Planos */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.subscriptions?.some((sub) => sub.status === "active") ? "Alterar Plano" : "Atribuir Plano"} para{" "}
              {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione um plano e o barbeiro responsável pela venda para vincular a este cliente.
              {selectedCustomer?.subscriptions?.some((sub) => sub.status === "active") && (
                <span className="block mt-2 text-amber-600">⚠️ O plano atual será substituído pelo novo plano selecionado.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Seletor de Plano (Existente) */}
            <div>
              <Label htmlFor="planSelect">Planos Disponíveis</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="planSelect" className="mt-3 w-full">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.length > 0 ? (
                    plans.map((plan) => (
                      <SelectItem key={plan._id} value={plan._id}>
                        <div className="flex justify-between w-full pr-2">
                          <span className="font-medium">{plan.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {PriceFormater(plan.price)} - {plan.durationInDays} dias
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Nenhum plano cadastrado.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ NOVO SELETOR DE BARBEIRO */}
            <div>
              <Label htmlFor="barberSelect">Barbeiro (Responsável)</Label>
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                <SelectTrigger id="barberSelect" className="mt-3 w-full">
                  <SelectValue placeholder="Selecione um barbeiro..." />
                </SelectTrigger>
                <SelectContent>
                  {allBarbers.length > 0 ? (
                    allBarbers.map((barber) => (
                      <SelectItem key={barber._id} value={barber._id}>
                        <div className="flex items-center gap-2">
                          <Contact className="h-4 w-4 text-muted-foreground" />
                          {barber.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Nenhum barbeiro encontrado.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Resumo do Plano (Existente) */}
            {selectedPlanId && (
              <div className="p-3 bg-muted rounded-lg">
                {(() => {
                  const selectedPlan = plans.find((p) => p._id === selectedPlanId);
                  if (!selectedPlan) return null;

                  return (
                    <div className="space-y-2">
                      <h4 className="font-medium">Resumo do Plano:</h4>
                      <div className="text-sm space-y-1">
                        <div>
                          📋 <strong>Nome:</strong> {selectedPlan.name}
                        </div>
                        <div>
                          💰 <strong>Preço:</strong> {PriceFormater(selectedPlan.price)}
                        </div>
                        <div>
                          ⏰ <strong>Duração:</strong> {selectedPlan.durationInDays} dias
                        </div>
                        {selectedPlan.description && (
                          <div>
                            📝 <strong>Descrição:</strong> {selectedPlan.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {errorModal && <p className="text-red-500 text-sm">{errorModal}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            {/* ✅ Validação do botão atualizada */}
            <Button onClick={handleSubscribeCustomer} disabled={isSubscribing || !selectedPlanId || !selectedBarberId}>
              {isSubscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
