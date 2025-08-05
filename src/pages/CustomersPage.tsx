import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { PhoneFormat } from "@/helper/phoneFormater";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dateFormatter } from "@/helper/dateFormatter";

// Tipagens
interface Customer {
  _id: string;
  name: string;
  phone: string;
  imageUrl?: string;
  createdAt: string;
  subscriptions?: Subscription[];
  lastBookingDate?: string; // Data do último agendamento
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

// Novos tipos para agendamentos
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

interface AdminOutletContext {
  barbershopId: string;
}

export function CustomersPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  // Estados existentes
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "with-plan" | "without-plan"
  >("all");

  // Estados para modal de planos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Novos estados para modal de agendamentos
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [selectedCustomerForBookings, setSelectedCustomerForBookings] =
    useState<Customer | null>(null);

  // Função existente para buscar dados da página
  const fetchPageData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    try {
      const [customersRes, plansRes] = await Promise.all([
        apiClient.get(`/api/barbershops/${barbershopId}/admin/customers`),
        apiClient.get(`/api/barbershops/${barbershopId}/plans`),
      ]);
      setCustomers(customersRes.data);
      setPlans(plansRes.data);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da página.");
    } finally {
      setIsLoading(false);
    }
  };

  // Nova função para buscar agendamentos do cliente
  const fetchCustomerBookings = async (customerId: string) => {
    setIsLoadingBookings(true);
    try {
      const response = await apiClient.get(
        `/api/barbershops/${barbershopId}/admin/customers/${customerId}/bookings`
      );
      setCustomerBookings(response.data);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar histórico de agendamentos.");
      setCustomerBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Função para abrir modal de agendamentos
  const handleOpenBookingsModal = async (customer: Customer) => {
    setSelectedCustomerForBookings(customer);
    setIsBookingsModalOpen(true);
    await fetchCustomerBookings(customer._id);
  };

  // Efeito para filtrar clientes (existente)
  useEffect(() => {
    let filtered = customers;

    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((customer) => {
        const hasActivePlan = customer.subscriptions?.some(
          (sub) => sub.status === "active"
        );
        return filterStatus === "with-plan" ? hasActivePlan : !hasActivePlan;
      });
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, filterStatus]);

  useEffect(() => {
    fetchPageData();
  }, [barbershopId]);

  // Funções existentes para modal de planos
  const handleOpenSubscribeModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedPlanId("");
    setIsModalOpen(true);
  };

  const handleSubscribeCustomer = async () => {
    if (!selectedCustomer || !selectedPlanId) {
      toast.error("Por favor, selecione um plano.");
      return;
    }
    setIsSubscribing(true);
    try {
      await apiClient.post(
        `/api/barbershops/${barbershopId}/admin/customers/${selectedCustomer._id}/subscribe`,
        {
          planId: selectedPlanId,
        }
      );

      toast.success(`${selectedCustomer.name} agora tem um novo plano!`);
      setIsModalOpen(false);
      await fetchPageData();
    } catch (error: any) {
      console.error("Erro ao atribuir plano:", error);
      toast.error(error.response?.data?.error || "Falha ao atribuir o plano.");
    } finally {
      setIsSubscribing(false);
    }
  };

  // Funções auxiliares
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);

      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return "Data/hora inválida";
      }

      // Formatar data e hora juntas
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch (error) {
      console.error("Erro ao formatar datetime:", error);
      return "Data/hora inválida";
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      booked: { label: "Agendado", variant: "default" as const },
      completed: { label: "Concluído", variant: "secondary" as const },
      canceled: { label: "Cancelado", variant: "destructive" as const },
      "no-show": { label: "Não Compareceu", variant: "outline" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "outline" as const,
    };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e visualize seu histórico de agendamentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select
                value={filterStatus}
                onValueChange={(value: any) => setFilterStatus(value)}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  <SelectItem value="with-plan">Com plano ativo</SelectItem>
                  <SelectItem value="without-plan">Sem plano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredCustomers.length} cliente
            {filteredCustomers.length !== 1 ? "s" : ""} encontrado
            {filteredCustomers.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano Ativo</TableHead>
                  <TableHead>Cliente desde</TableHead>
                  {/* <TableHead>Último Agendamento</TableHead> */}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const activeSubscription = customer.subscriptions?.find(
                      (sub) => sub.status === "active"
                    );
                    const daysRemaining = activeSubscription
                      ? getDaysRemaining(activeSubscription.endDate)
                      : null;

                    return (
                      <TableRow
                        key={customer._id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div
                            className="flex items-center space-x-3 cursor-pointer hover:bg-muted/30 p-2 rounded-md transition-colors"
                            onClick={() => handleOpenBookingsModal(customer)}
                          >
                            <div className="flex-shrink-0">
                              {customer.imageUrl ? (
                                <img
                                  src={customer.imageUrl}
                                  alt={customer.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Cliente
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center">
                            <a
                              href={`https://wa.me/${customer.phone}`}
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
                            <div className="space-y-1 flex flex-col justify-center gap-1">
                              <p className="font-medium text-zinc-800">
                                {activeSubscription.plan.name}
                              </p>
                              <Badge
                                variant={
                                  daysRemaining && daysRemaining > 7
                                    ? "default"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {daysRemaining && daysRemaining > 0
                                  ? `${daysRemaining} dias restantes`
                                  : daysRemaining === 0
                                  ? "Expira hoje"
                                  : "Expirado"}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Até {formatDate(activeSubscription.endDate)}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline">Sem plano</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatDate(customer.createdAt)}
                          </div>
                        </TableCell>

                        {/* <TableCell>
                          <div className="space-y-1">
                            {(() => {
                              const lastBookingInfo = getLastBookingInfo(
                                customer.lastBookingDate
                              );
                              return (
                                <>
                                  <Badge
                                    variant={lastBookingInfo.variant}
                                    className="text-xs"
                                  >
                                    {lastBookingInfo.text}
                                  </Badge>
                                  {customer.lastBookingDate && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(customer.lastBookingDate)}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </TableCell> */}

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOpenBookingsModal(customer)
                                }
                              >
                                {/* <History className="mr-2 h-4 w-4" /> */}
                                Ver Agendamentos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOpenSubscribeModal(customer)
                                }
                              >
                                {activeSubscription
                                  ? "Alterar Plano"
                                  : "Atribuir Plano"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {searchTerm || filterStatus !== "all"
                            ? "Nenhum cliente encontrado com os filtros aplicados."
                            : "Nenhum cliente encontrado."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Histórico de Agendamentos */}
      <Dialog open={isBookingsModalOpen} onOpenChange={setIsBookingsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {/* <History className="h-5 w-5" /> */}
              Histórico de Agendamentos - {selectedCustomerForBookings?.name}
            </DialogTitle>
            <DialogDescription>
              Visualize todos os agendamentos realizados por este cliente
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isLoadingBookings ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-6 w-6 mr-2" />
                <span>Carregando agendamentos...</span>
              </div>
            ) : customerBookings.length > 0 ? (
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-4">
                  {customerBookings.map((booking) => (
                    <Card key={booking._id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatDateTime(booking.time)}
                            </span>
                            {getStatusBadge(booking.status)}
                          </div>

                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <strong>Serviço:</strong> {booking.service.name}
                            </span>
                            <p className="text-xs">
                              R$ {booking.service.price.toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <strong>Profissional:</strong>{" "}
                              {booking.barber.name}
                            </span>
                          </div>

                          {booking.service.duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                <strong>Duração:</strong>{" "}
                                {booking.service.duration} min
                              </span>
                            </div>
                          )}

                          {booking.notes && (
                            <div className="text-sm text-muted-foreground">
                              <strong>Observações:</strong> {booking.notes}
                            </div>
                          )}
                        </div>

                        {booking.createdAt && (
                          <div className="text-xs text-muted-foreground">
                            Agendado em {dateFormatter(booking.createdAt)}
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
                <h3 className="text-lg font-medium mb-2">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-muted-foreground">
                  Este cliente ainda não realizou nenhum agendamento nesta
                  barbearia.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Atribuir/Alterar Plano (existente) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.subscriptions?.some(
                (sub) => sub.status === "active"
              )
                ? "Alterar Plano"
                : "Atribuir Plano"}{" "}
              para {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione um dos planos cadastrados para vincular a este cliente.
              {selectedCustomer?.subscriptions?.some(
                (sub) => sub.status === "active"
              ) && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ O plano atual será substituído pelo novo plano selecionado.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="planSelect">Planos Disponíveis</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="planSelect" className="mt-3 w-full max-w-sm">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.length > 0 ? (
                    plans.map((plan) => (
                      <SelectItem key={plan._id} value={plan._id}>
                        <div className="flex gap-2">
                          <span className="font-medium">{plan.name}</span>
                          <span className="text-sm text-muted-foreground">
                            R$ {plan.price.toFixed(2)} - {plan.durationInDays}{" "}
                            dias
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum plano cadastrado.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPlanId && (
              <div className="p-3 bg-muted rounded-lg">
                {(() => {
                  const selectedPlan = plans.find(
                    (p) => p._id === selectedPlanId
                  );
                  if (!selectedPlan) return null;

                  return (
                    <div className="space-y-2">
                      <h4 className="font-medium">Resumo do Plano:</h4>
                      <div className="text-sm space-y-1">
                        <div>
                          📋 <strong>Nome:</strong> {selectedPlan.name}
                        </div>
                        <div>
                          💰 <strong>Preço:</strong> R${" "}
                          {selectedPlan.price.toFixed(2)}
                        </div>
                        <div>
                          ⏰ <strong>Duração:</strong>{" "}
                          {selectedPlan.durationInDays} dias
                        </div>
                        {selectedPlan.description && (
                          <div>
                            📝 <strong>Descrição:</strong>{" "}
                            {selectedPlan.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubscribeCustomer}
              disabled={isSubscribing || !selectedPlanId}
            >
              {isSubscribing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
