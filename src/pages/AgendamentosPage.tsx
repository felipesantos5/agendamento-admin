import { useEffect, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Phone, PlusCircle, Scissors, User } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AgendaView } from "@/components/AgendaView";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    duration: number;
  };
  time: string;
  status: string;
}

// Tipo para os dados do barbeiro (para o filtro)
interface Barber {
  _id: string;
  name: string;
}

interface PopulatedBooking {
  _id: string;
  time: string; // Vem como string no formato ISO da API
  status: "booked" | "confirmed" | "completed" | "canceled";
  review?: string; // ID da avaliação, se houver

  // Campos que foram populados e podem ser nulos se o item original foi deletado
  customer: {
    _id: string;
    name: string;
    phone: string;
  } | null;

  barber: {
    _id: string;
    name: string;
  } | null;

  service: {
    _id: string;
    name: string;
    price: number;
    duration: number;
  } | null;

  barbershop: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}

const BARBER_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#000000", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];

export function AgendamentosPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");

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

  const handleSelectEvent = (event: any) => {
    // O evento da agenda tem o nosso agendamento original no campo 'resource'
    const fullBookingData = event.resource;
    setSelectedBooking(fullBookingData);
    setIsModalOpen(true);
  };

  const barberColorMap = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return new Map<string, string>();
    }

    // Primeiro, encontramos todos os IDs de barbeiros únicos na lista de agendamentos
    const uniqueBarberIds = [...new Set(bookings.map((b) => b.barber?._id).filter(Boolean))];

    const colorMap = new Map<string, string>();
    uniqueBarberIds.forEach((barberId, index) => {
      // Atribui uma cor da paleta baseado na posição do barbeiro na lista de únicos
      const colorIndex = index % BARBER_COLORS.length;
      colorMap.set(barberId, BARBER_COLORS[colorIndex]);
    });

    return colorMap;
  }, [bookings]); // Este cálculo é refeito sempre que os agendamentos mudam

  const filteredBookings = useMemo(() => {
    if (selectedBarberId === "all") {
      return bookings; // Se "Todos" estiver selecionado, retorna a lista completa
    }
    // Senão, filtra os agendamentos pelo ID do barbeiro selecionado
    return bookings.filter((booking) => booking.barber?._id === selectedBarberId);
  }, [bookings, selectedBarberId]);

  // 3. Formata os eventos para a agenda, agora usando o mapa de cores
  const agendaEvents = useMemo(() => {
    return filteredBookings
      .map((booking) => {
        if (!booking.customer || !booking.service) return null;
        const startTime = parseISO(booking.time);
        const serviceDuration = booking.service?.duration || 60;
        const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
        const eventColor = barberColorMap.get(booking.barber?._id) || "#333333";
        return {
          _id: booking._id,
          title: `${booking.customer?.name || ""} - ${booking.service?.name || ""}`,
          start: startTime,
          end: endTime,
          resource: { ...booking, color: eventColor },
        };
      })
      .filter((event): event is NonNullable<typeof event> => event !== null);
  }, [filteredBookings, barberColorMap]);

  const getStatusInfo = (status: PopulatedBooking["status"]) => {
    switch (status) {
      case "completed":
        return {
          text: "Concluído",
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "canceled":
        return {
          text: "Cancelado",
          className: "bg-red-100 text-red-800 border-red-200",
        };
      case "confirmed":
        return {
          text: "Confirmado",
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "booked":
      default:
        return {
          text: "Agendado",
          className: "bg-gray-200 text-gray-800 border-gray-300",
        };
    }
  };

  if (isLoading && bookings.length === 0 && allBarbers.length === 0)
    return <p className="text-center p-10">Carregando agendamentos e barbeiros...</p>;
  if (error && bookings.length === 0) return <p className="text-center p-10 text-red-500">{error}</p>;

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Agendamentos</CardTitle>

        <Link to="novo-agendamento">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {error && !isLoading && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

        <div className="w-full sm:w-64">
          <Label className="text-sm font-medium">Filtrar por Profissional</Label>
          <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Ver todos" />
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

        <AgendaView events={agendaEvents} onSelectEvent={handleSelectEvent} />

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            {selectedBooking && (
              <>
                <DialogHeader>
                  <DialogTitle>Detalhes do Agendamento</DialogTitle>
                  <DialogDescription>{format(new Date(selectedBooking.time), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-semibold">{selectedBooking.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <a href={`https://wa.me/55${selectedBooking.customer?.phone}`} target="_blank" className="font-semibold underline">
                        {selectedBooking.customer?.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Scissors className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Serviço</p>
                      <p className="font-semibold">{selectedBooking.service?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Profissional</p>
                      <p className="font-semibold">{selectedBooking.barber?.name}</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Badge className={getStatusInfo(selectedBooking.status as "booked" | "confirmed" | "completed" | "canceled").className}>
                    {getStatusInfo(selectedBooking.status as "booked" | "confirmed" | "completed" | "canceled").text}
                  </Badge>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

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
