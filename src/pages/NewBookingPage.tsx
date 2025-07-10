import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Supondo que você tenha essas tipagens
interface Service {
  _id: string;
  name: string;
}
interface Barber {
  _id: string;
  name: string;
}
interface AdminOutletContext {
  barbershopId: string;
}

export function NewBookingPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const navigate = useNavigate();

  // Estados para os dados do formulário e controle da UI
  const [formData, setFormData] = useState({
    serviceId: "",
    barberId: "",
    date: undefined as Date | undefined,
    time: "",
    customerName: "",
    customerPhone: "",
  });
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingTimes, setIsFetchingTimes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca os serviços e barbeiros ao carregar a página
  useEffect(() => {
    if (!barbershopId) return;
    const fetchInitialData = async () => {
      try {
        const [servicesRes, barbersRes] = await Promise.all([
          apiClient.get(`/barbershops/${barbershopId}/services`),
          apiClient.get(`/barbershops/${barbershopId}/barbers`),
        ]);
        setServices(servicesRes.data);
        setBarbers(barbersRes.data);
      } catch (error) {
        toast.error("Erro ao carregar dados da barbearia.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [barbershopId]);

  // Busca horários disponíveis sempre que serviço, barbeiro ou data mudam
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (formData.serviceId && formData.barberId && formData.date) {
        setIsFetchingTimes(true);
        setAvailableTimes([]); // Limpa horários antigos
        try {
          const dateString = format(formData.date, "yyyy-MM-dd");
          const response = await apiClient.get(`/barbershops/${barbershopId}/barbers/${formData.barberId}/free-slots`, {
            params: { date: dateString, serviceId: formData.serviceId },
          });
          // Supondo que a API retorne um array de strings com os horários
          setAvailableTimes(response.data.slots.map((slot: any) => slot.time));
        } catch (error) {
          toast.error("Erro ao buscar horários disponíveis.");
        } finally {
          setIsFetchingTimes(false);
        }
      }
    };
    fetchAvailableTimes();
  }, [formData.serviceId, formData.barberId, formData.date, barbershopId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { serviceId, barberId, date, time, customerName, customerPhone } = formData;
    if (!serviceId || !barberId || !date || !time || !customerName || !customerPhone) {
      toast.error("Por favor, preencha todos os campos.");
      setIsSubmitting(false);
      return;
    }

    const bookingPayload = {
      service: serviceId,
      barber: barberId,
      time: new Date(`${format(date, "yyyy-MM-dd")}T${time}:00`).toISOString(),
      customer: { name: customerName, phone: customerPhone.replace(/\D/g, "") },
    };

    try {
      await apiClient.post(`/barbershops/${barbershopId}/bookings`, bookingPayload);
      toast.success("Agendamento criado com sucesso!");
      navigate(`/${barbershopId}/agendamentos`); // Redireciona de volta para a lista
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao criar agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo Agendamento</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Agendamento</CardTitle>
            <CardDescription>Preencha os dados abaixo para criar um novo agendamento para um cliente.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seção do Agendamento */}
            <div className="space-y-4">
              <Label>Serviço</Label>
              <Select onValueChange={(value) => handleInputChange("serviceId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Profissional</Label>
              <Select onValueChange={(value) => handleInputChange("barberId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" locale={ptBR} selected={formData.date} onSelect={(date) => handleInputChange("date", date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-4">
              <Label>Horário</Label>
              <Select onValueChange={(value) => handleInputChange("time", value)} disabled={isFetchingTimes || availableTimes.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={isFetchingTimes ? "Buscando..." : "Selecione um horário"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTimes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seção do Cliente */}
            <div className="space-y-4">
              <Label htmlFor="customerName">Nome do Cliente</Label>
              <Input id="customerName" placeholder="João da Silva" onChange={(e) => handleInputChange("customerName", e.target.value)} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="customerPhone">Telefone do Cliente</Label>
              <Input id="customerPhone" placeholder="(48) 99999-9999" onChange={(e) => handleInputChange("customerPhone", e.target.value)} />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
