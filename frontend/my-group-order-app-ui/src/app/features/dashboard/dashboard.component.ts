// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { OrderService, IOrder } from '../../core/services/order.service'; // <-- Import service dan interface
import { from, Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CalculationService } from '../../core/services/calculation.service';

// Interface untuk statistik
export interface IUserStatistics {
  totalSpent: number;
  totalOrders: number;
  averagePerOrder: number;
  monthlyTrend: { month: string; amount: number; maxAmount: number }[];
  topItems: { name: string; count: number }[];
  paidCount: number;
  unpaidCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink], // <-- Tambahkan RouterLink
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private orderService = inject(OrderService);
  public authService = inject(AuthService);
  private calculationService = inject(CalculationService);

  // Gunakan Observable untuk menangani data secara asinkron
  activeOrders$!: Observable<IOrder[]>;
  closedOrders$!: Observable<IOrder[]>;
  
  // Signal untuk statistik
  statistics = signal<IUserStatistics | null>(null);

  ngOnInit(): void {
    this.activeOrders$ = from(this.orderService.getActiveOrders());
    this.loadClosedOrdersAndCalculateStats();
  }

  async loadClosedOrdersAndCalculateStats(): Promise<void> {
    const orders = await this.orderService.getClosedOrdersForUser();
    this.closedOrders$ = from(Promise.resolve(orders));
    
    // Calculate statistics
    const stats = this.calculateStatistics(orders);
    this.statistics.set(stats);
  }

  calculateStatistics(orders: IOrder[]): IUserStatistics {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) {
      return {
        totalSpent: 0,
        totalOrders: 0,
        averagePerOrder: 0,
        monthlyTrend: [],
        topItems: [],
        paidCount: 0,
        unpaidCount: 0,
      };
    }

    let totalSpent = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    const itemCounts = new Map<string, number>();
    const monthlySpending = new Map<string, number>();
    const processedOrderIds = new Set<string>();

    // Process each closed order
    orders.forEach(order => {
      const summary = this.calculationService.calculateOrderSummary(order);
      const myOrders = summary.participantOrdersWithFinalPrice.filter(
        p => p.user_id === currentUserId
      );

      if (myOrders.length === 0) return;

      // Track payment status once per order (not per item)
      if (!processedOrderIds.has(order.id)) {
        processedOrderIds.add(order.id);
        
        // Check if all items in this order are paid
        const allPaid = myOrders.every(mo => mo.payment_status === 'PAID');
        
        if (allPaid && order.status === 'CLOSED') {
          paidCount++;
        } else if (!allPaid && order.status === 'CLOSED') {
          unpaidCount++;
        }
      }

      myOrders.forEach(myOrder => {
        totalSpent += myOrder.finalPrice;

        // Track items
        const currentCount = itemCounts.get(myOrder.item_name) || 0;
        itemCounts.set(myOrder.item_name, currentCount + myOrder.quantity);

        // Track monthly spending
        const orderDate = new Date(order.deadline);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthSpending = monthlySpending.get(monthKey) || 0;
        monthlySpending.set(monthKey, currentMonthSpending + myOrder.finalPrice);
      });
    });

    // Get last 6 months trend
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Des'];
    const now = new Date();
    const monthlyTrend = [];
    let maxAmount = 0;

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = monthlySpending.get(monthKey) || 0;
      maxAmount = Math.max(maxAmount, amount);
      
      monthlyTrend.push({
        month: `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`,
        amount,
        maxAmount: 0 // Will be set after finding max
      });
    }

    // Set maxAmount for all months for visualization scaling
    monthlyTrend.forEach(m => m.maxAmount = maxAmount || 1);

    // Get top 5 items
    const topItems = Array.from(itemCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalOrders = orders.length;
    const averagePerOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;

    return {
      totalSpent,
      totalOrders,
      averagePerOrder,
      monthlyTrend,
      topItems,
      paidCount,
      unpaidCount,
    };
  }

  findMyPaymentStatus(order: IOrder): string | undefined {
    const myOrder = order.participant_orders?.find(
      p => p.user_id === this.authService.currentUser()?.id
    );
    return myOrder?.payment_status;
  }
}
