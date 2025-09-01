// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { OrderService, IOrder } from '../../core/services/order.service'; // <-- Import service dan interface
import { from, Observable } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink], // <-- Tambahkan RouterLink
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private orderService = inject(OrderService);

  // Gunakan Observable untuk menangani data secara asinkron
  activeOrders$!: Observable<IOrder[]>;
  closedOrders$!: Observable<IOrder[]>;

  ngOnInit(): void {
    this.activeOrders$ = from(this.orderService.getActiveOrders());
    this.closedOrders$ = from(this.orderService.getClosedOrdersForUser());
  }
}
