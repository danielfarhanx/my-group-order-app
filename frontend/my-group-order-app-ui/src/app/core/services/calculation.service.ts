import { Injectable } from '@angular/core';
import { IOrder, IParticipantOrder } from './order.service';

// Interface untuk hasil kalkulasi
export interface IOrderSummary {
  totalPesananKotor: number;
  totalPesananSetelahDiskon: number;
  potonganDiskon: number;
  biayaTambahan: number;
  grandTotal: number;
  participantOrdersWithFinalPrice: (IParticipantOrder & { finalPrice: number })[];
  potonganDiskonLepas: number;
  // Properti baru untuk rekapitulasi
  summaryByMenu: { name: string; quantity: number }[];
  summaryByUser: { userId: string; userName: string; finalPrice: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class CalculationService {

  constructor() { }

  calculateOrderSummary(order: IOrder): IOrderSummary {
    const defaultSummary: IOrderSummary = {
      totalPesananKotor: 0,
      totalPesananSetelahDiskon: 0,
      potonganDiskon: 0,
      biayaTambahan: order.service_and_delivery_fee || 0,
      grandTotal: 0,
      participantOrdersWithFinalPrice: [],
      potonganDiskonLepas: 0,
      summaryByMenu: [],
      summaryByUser: []
    };

    if (!order.participant_orders || order.participant_orders.length === 0) {
      return defaultSummary;
    }

    // 1. Hitung total pesanan kotor (subtotal)
    const totalPesananKotor = order.participant_orders.reduce((sum, p) => sum + (p.item_price * p.quantity), 0);

    // 2. Hitung potongan diskon
    let potonganDiskon = 0;
    let potonganDiskonLepas = 0;
    if (totalPesananKotor >= (order.min_order_for_discount || 0)) {
      const diskonDariPersen = totalPesananKotor * ((order.discount_percentage || 0) / 100);
      potonganDiskon = Math.min(diskonDariPersen, order.max_discount || Infinity);
      potonganDiskonLepas = diskonDariPersen;
    }

    // 3. Hitung total setelah diskon
    const totalPesananSetelahDiskon = totalPesananKotor - potonganDiskon;

    // 4. Hitung grand total
    const biayaTambahan = order.service_and_delivery_fee || 0;
    const grandTotal = totalPesananSetelahDiskon + biayaTambahan;

    // 5. Hitung harga final per orang secara proporsional
    const participantOrdersWithFinalPrice = order.participant_orders.map(pOrder => {
      const subtotalPerOrang = pOrder.item_price * pOrder.quantity;

      // Hitung proporsi/porsi subtotal orang ini dari total kotor
      const proporsi = subtotalPerOrang / totalPesananKotor;

      // Alokasikan diskon dan biaya tambahan berdasarkan proporsi
      const diskonUntukOrangIni = potonganDiskon * proporsi;
      const biayaTambahanUntukOrangIni = biayaTambahan * proporsi;

      const finalPrice = subtotalPerOrang - diskonUntukOrangIni + biayaTambahanUntukOrangIni;

      return { ...pOrder, finalPrice };
    });

    // --- LOGIKA BARU: Summary per Menu ---
    const summaryByMenu = Array.from(
      order.participant_orders.reduce((map, p) => {
        const currentQty = map.get(p.item_name) || 0;
        map.set(p.item_name, currentQty + p.quantity);
        return map;
      }, new Map<string, number>()),
      ([name, quantity]) => ({ name, quantity })
    );

    // --- LOGIKA BARU: Summary per User ---
    const summaryByUser = Array.from(
      participantOrdersWithFinalPrice.reduce((map, p) => {
        const currentPrice = map.get(p.user_id) || { userName: p.profiles?.full_name || 'Tidak diketahui', finalPrice: 0 };
        map.set(p.user_id, {
          ...currentPrice,
          finalPrice: currentPrice.finalPrice + p.finalPrice,
        });
        return map;
      }, new Map<string, { userName: string; finalPrice: number }>()),
      ([userId, { userName, finalPrice }]) => ({ userId, userName, finalPrice })
    );

    return {
      totalPesananKotor,
      totalPesananSetelahDiskon,
      potonganDiskon,
      biayaTambahan,
      grandTotal,
      participantOrdersWithFinalPrice,
      potonganDiskonLepas,
      summaryByMenu,
      summaryByUser,
    };
  }
}
