// Em um arquivo como src/lib/utils.ts

import { PopulatedBooking } from "@/types/barberShop";

// Interface para definir o tipo do retorno da função
interface PaymentStatusInfo {
  text: string;
  color: "success" | "warning" | "danger" | "info" | "default";
}

/**
 * Traduz o status de pagamento do Mercado Pago para um texto em português
 * e retorna uma sugestão de cor para a UI.
 * @param {string | null | undefined} status - O status recebido da API (ex: 'approved').
 * @returns {PaymentStatusInfo} - Um objeto com o texto traduzido e uma cor.
 */
export function translatePaymentStatus(
  status?: string | null
): PaymentStatusInfo {
  // O 'toLowerCase()' garante que a função funcione mesmo se o status vier com letras maiúsculas
  const lowerCaseStatus = status?.toLowerCase() || "presencial";

  const statusMap: Record<string, PaymentStatusInfo> = {
    // Status de Sucesso
    approved: { text: "Pago no App", color: "success" },

    // Status Pendentes ou em Análise
    pending: { text: "Pagamento Pendente", color: "warning" },
    in_process: { text: "Em processamento", color: "warning" },
    authorized: { text: "Autorizado", color: "warning" },

    // Status de Falha ou Cancelamento
    rejected: { text: "Rejeitado", color: "danger" },
    cancelled: { text: "Cancelado", color: "danger" },

    // Status Pós-pagamento
    refunded: { text: "Devolvido", color: "info" },
    charged_back: { text: "Contestado (Chargeback)", color: "danger" },

    // Status para pagamentos não feitos online
    presencial: { text: "Pagamento Presencial", color: "default" },
  };

  // Retorna o objeto correspondente ou um padrão caso o status não seja encontrado
  return (
    statusMap[lowerCaseStatus] || {
      text: "Status Desconhecido",
      color: "default",
    }
  );
}

/**
 * Retorna o texto e a classe de estilo para o status do pagamento.
 * @param {PopulatedBooking} booking - O objeto do agendamento.
 * @returns {{text: string, className: string}}
 */
export const getPaymentStatusInfo = (booking: PopulatedBooking) => {
  // Se o paymentStatus não existir, consideramos como "Presencial"
  if (!booking.paymentStatus) {
    return {
      text: "Presencial",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    };
  }

  // Lógica para os outros status de pagamento
  switch (booking.paymentStatus) {
    case "approved":
      return {
        text: "Pago (Online)",
        className: "bg-green-100 text-green-800 border-green-200",
      };
    case "pending":
    case "in_process":
    case "authorized":
      return {
        text: "Pendente",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return {
        text: "Falhou/Cancelado",
        className: "bg-red-100 text-red-800 border-red-200",
      };
    default:
      return {
        text: "Presencial",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      };
  }
};
