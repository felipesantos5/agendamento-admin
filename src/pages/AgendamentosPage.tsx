import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, parseISO, isPast, differenceInMilliseconds, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importações de componentes ShadCN/UI
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Para o filtro
import { Switch } from "@/components/ui/switch"; // Para o toggle
import { Label } from "@/components/ui/label"; // Para os rótulos dos filtros
import { CheckCircle2, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import apiClient from "@/services/api";
import { PhoneFormat } from "@/helper/phoneFormater";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/BackendUrl";

// Contexto do AdminLayout
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

// Tipo para os dados do agendamento
interface Booking {
  _id: string;
  customer: {
    name: string;
    phone?: string;
    whatsapp?: string;
  };
  barber: {
    _id: string;
    name: string;
  };
  service: {
    _id: string;
    name: string;
    price: number;
  };
  time: string;
  status: string;
}

// Tipo para os dados do barbeiro (para o filtro)
interface Barber {
  _id: string;
  name: string;
}

const daysOfWeekForFilter = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

export function AgendamentosPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>("all");
  const [showPastAppointments, setShowPastAppointments] = useState<boolean>(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isUserAdmin = user?.role === "admin";

  useEffect(() => {
    if (!barbershopId) return;

    const fetchPageData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let bookingsResponse;

        if (isUserAdmin) {
          // Se for admin, busca todos os agendamentos da barbearia E a lista de barbeiros para o filtro
          const [resBookings, resBarbers] = await Promise.all([
            apiClient.get(`/barbershops/${barbershopId}/bookings`),
            apiClient.get(`/barbershops/${barbershopId}/barbers`),
          ]);
          bookingsResponse = resBookings;
          setAllBarbers(resBarbers.data);
        } else {
          // Se for barbeiro, busca apenas os SEUS agendamentos pela nova rota
          bookingsResponse = await apiClient.get(`/barbershops/${barbershopId}/barbers/bookings/barber`);
          // Não precisa buscar todos os barbeiros, pois o filtro não será mostrado
        }

        setBookings(bookingsResponse.data);
      } catch (err: any) {
        console.error("Erro ao buscar dados de agendamentos:", err);
        setError(err.response?.data?.error || "Não foi possível carregar os dados.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [barbershopId]);

  const displayedBookings = useMemo(() => {
    // Primeiro, filtra agendamentos que possam ter dados inválidos para evitar erros
    let filtered = bookings.filter((booking) => booking && typeof booking.time === "string");

    // 1. Filtrar por barbeiro selecionado (se admin)
    if (isUserAdmin && selectedBarberFilter !== "all") {
      filtered = filtered.filter((booking) => booking.barber?._id === selectedBarberFilter);
    }

    // 2. Filtrar por dia da semana
    if (selectedDayFilter !== "all") {
      filtered = filtered.filter((booking) => {
        const dateObj = parseISO(booking.time);
        // Garante que a data é válida antes de tentar obter o dia
        if (!isValid(dateObj)) return false;
        // Usar getDay() em UTC é mais seguro aqui
        const dayOfWeek = dateObj.getUTCDay();
        return String(dayOfWeek) === selectedDayFilter;
      });
    }

    // 3. Filtrar agendamentos passados (se a opção estiver desmarcada)
    if (!showPastAppointments) {
      filtered = filtered.filter((booking) => {
        const dateObj = parseISO(booking.time);
        return isValid(dateObj) && !isPast(dateObj);
      });
    }

    // 4. Ordenar a lista filtrada de forma inteligente e segura
    return filtered.sort((a, b) => {
      const dateA = parseISO(a.time);
      const dateB = parseISO(b.time);

      // Se alguma data for inválida, coloca no final da lista para não quebrar a ordenação
      if (!isValid(dateA)) return 1;
      if (!isValid(dateB)) return -1;

      const aIsPast = isPast(dateA);
      const bIsPast = isPast(dateB);

      // Lógica de ordenação:
      // - Se um é passado e o outro futuro, o futuro vem primeiro.
      if (aIsPast && !bIsPast) return 1; // 'a' é passado, 'b' é futuro -> b vem primeiro
      if (!aIsPast && bIsPast) return -1; // 'a' é futuro, 'b' é passado -> a vem primeiro

      // - Se ambos são futuros, ordena do mais próximo para o mais distante.
      if (!aIsPast && !bIsPast) {
        return differenceInMilliseconds(dateA, dateB);
      }

      // - Se ambos são passados, ordena do mais recente para o mais antigo (ordem decrescente).
      if (aIsPast && bIsPast) {
        return differenceInMilliseconds(dateB, dateA);
      }

      return 0; // Caso padrão
    });
  }, [bookings, selectedBarberFilter, showPastAppointments, selectedDayFilter, isUserAdmin]);

  const formatBookingTime = (isoTime: string) => {
    try {
      const dateObj = parseISO(isoTime);
      return {
        date: format(dateObj, "dd/MM/yyyy", { locale: ptBR }),
        time: format(dateObj, "HH:mm"),
        isPast: isPast(dateObj),
      };
    } catch (e) {
      return { date: "Data inválida", time: "Hora inválida", isPast: false };
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/barbershops/${barbershopId}/bookings/${bookingId}`);
      setBookings(bookings.filter((booking) => booking._id !== bookingId));
      toast.success("Agendamento excluído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao excluir agendamento");
    } finally {
      setIsDeleting(false);
      setBookingToDelete(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const originalBookings = [...bookings];

    // Atualização otimista da UI para uma resposta instantânea
    setBookings(bookings.map((b) => (b._id === bookingId ? { ...b, status: "canceled" } : b)));

    try {
      // Usa a rota de status existente para definir como "canceled"
      await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}/bookings/${bookingId}/status`, {
        status: "canceled",
      });
      toast.success("Agendamento cancelado com sucesso.");
    } catch (error) {
      // Reverte a alteração na UI em caso de erro na API
      setBookings(originalBookings);
      toast.error("Falha ao cancelar o agendamento.");
      console.error(error);
    }
  };

  const handleMarkAsCompleted = async (bookingId: string) => {
    const originalBookings = [...bookings];

    // Otimistic UI update
    setBookings(bookings.map((b) => (b._id === bookingId ? { ...b, status: "completed" } : b)));

    try {
      await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}/bookings/${bookingId}/status`, {
        status: "completed",
      });
      toast.success("Agendamento marcado como concluído! A comissão foi gerada.");
    } catch (error) {
      // Reverte em caso de erro
      setBookings(originalBookings);
      toast.error("Falha ao atualizar o status do agendamento.");
      console.error(error);
    }
  };

  // const getStatusVariant = (status: Booking["status"]) => {
  //   switch (status) {
  //     case "completed":
  //       return "success";
  //     case "canceled":
  //       return "destructive";
  //     case "confirmed":
  //       return "default";
  //     case "booked":
  //     default:
  //       return "secondary";
  //   }
  // };

  if (isLoading && bookings.length === 0 && allBarbers.length === 0)
    return <p className="text-center p-10">Carregando agendamentos e barbeiros...</p>;
  if (error && bookings.length === 0) return <p className="text-center p-10 text-red-500">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {error && !isLoading && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center text-sm font-medium text-gray-700 mr-2 whitespace-nowrap">
            <Filter className="mr-2 h-5 w-5" /> Filtros:
          </div>

          {isUserAdmin && (
            <div className="flex-grow min-w-[200px] w-full sm:w-auto">
              <Label htmlFor="barberFilter" className="text-xs font-medium text-gray-600">
                Profissional:
              </Label>
              <Select value={selectedBarberFilter} onValueChange={setSelectedBarberFilter}>
                <SelectTrigger id="barberFilter" className="w-full mt-1">
                  <SelectValue placeholder="Todos os Profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Profissionais</SelectItem>
                  {allBarbers.map((barber) => (
                    <SelectItem key={barber._id} value={barber._id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-grow min-w-[200px] w-full sm:w-auto">
            <Label htmlFor="dayFilter" className="text-xs font-medium text-gray-600">
              Dia da Semana:
            </Label>
            <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
              <SelectTrigger id="dayFilter" className="w-full mt-1">
                <SelectValue placeholder="Todos os Dias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Dias</SelectItem>
                {daysOfWeekForFilter.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle para exibir passados (comum para ambos os papéis) */}
          <div className="flex items-center space-x-2 pt-2 sm:pt-5 w-full sm:w-auto justify-baseline md:justify-end">
            <Switch id="showPastToggle" checked={showPastAppointments} onCheckedChange={setShowPastAppointments} />
            <Label htmlFor="showPastToggle" className="text-sm font-medium text-gray-600 cursor-pointer whitespace-nowrap">
              Exibir passados
            </Label>
          </div>
        </div>

        <Table>
          <TableCaption>
            {displayedBookings.length === 0
              ? "Nenhum agendamento encontrado para os filtros selecionados."
              : `Exibindo ${displayedBookings.length} agendamento(s).`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data e Hora</TableHead>
              <TableHead className="text-center">Cliente</TableHead>
              <TableHead className="text-center">Telefone</TableHead>
              <TableHead className="text-center">Serviço</TableHead>
              {isUserAdmin && <TableHead className="text-center">Profissional</TableHead>}
              <TableHead className="text-center">Preço (R$)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedBookings.map((booking) => {
              const { date, time, isPast: bookingIsPast } = formatBookingTime(booking.time);
              return (
                <TableRow key={booking._id} className={bookingIsPast && showPastAppointments ? "opacity-70 bg-gray-50" : ""}>
                  <TableCell className="W-[200px] ">
                    <div className="flex items-center">
                      <div>
                        <div>{date}</div>
                        <div className={`text-sm ${bookingIsPast ? "text-gray-500" : "text-muted-foreground"}`}>{time} horas</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* --- CORREÇÕES APLICADAS ABAIXO --- */}

                  <TableCell className="text-center">
                    {/* Verifica se 'customer' existe antes de acessar 'name' */}
                    <div className="flex items-center">{booking.customer?.name || <span className="text-red-500 italic">Cliente excluído</span>}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    {/* Verifica se 'customer' existe antes de acessar 'phone' */}
                    <a href={`https://wa.me/${booking.customer?.phone || ""}`} className="flex items-center underline" target="_blank">
                      {booking.customer?.phone ? PhoneFormat(booking.customer.phone) : "Não informado"}
                    </a>
                  </TableCell>
                  <TableCell className="text-center">
                    {/* Verifica se 'service' existe antes de acessar 'name' */}
                    <div className="flex items-center">{booking.service?.name || <span className="text-red-500 italic">Serviço excluído</span>}</div>
                  </TableCell>
                  {isUserAdmin && (
                    <TableCell className="text-center">
                      {/* Verifica se 'barber' existe antes de acessar 'name' */}
                      {booking.barber?.name || <span className="text-red-500 italic">Barbeiro excluído</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    {/* Verifica se 'service' e 'price' existem */}
                    {typeof booking.service?.price === "number" ? booking.service.price.toFixed(2) : "N/A"}
                  </TableCell>

                  {/* ... O resto das suas colunas (Status, Ações) continua igual ... */}
                  <TableCell className="text-center">
                    <Badge
                      variant={booking.status === "booked" ? "default" : booking.status === "completed" ? "secondary" : "outline"}
                      className={
                        bookingIsPast && booking.status === "booked"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : booking.status === "canceled"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : booking.status === "booked"
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : booking.status === "completed"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : ""
                      }
                    >
                      {bookingIsPast && booking.status === "booked"
                        ? "Ocorrido"
                        : booking.status === "booked"
                        ? "Agendado"
                        : booking.status === "completed"
                        ? "Concluído"
                        : booking.status === "canceled"
                        ? "Cancelado"
                        : booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(booking.status === "booked" || booking.status === "confirmed") && (
                      <Button variant="outline" size="sm" onClick={() => handleMarkAsCompleted(booking._id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Concluir
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={bookingIsPast ? () => setBookingToDelete(booking._id) : () => handleCancelBooking(booking._id)}
                      disabled={isDeleting || booking.status === "canceled"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bookingToDelete && handleDeleteBooking(bookingToDelete)}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
