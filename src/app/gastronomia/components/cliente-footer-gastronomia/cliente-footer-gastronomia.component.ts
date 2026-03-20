import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cliente-footer-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cliente-footer-gastronomia.component.html',
  styleUrls: ['./cliente-footer-gastronomia.component.scss']
})
export class ClienteFooterGastronomiaComponent { 
  year = new Date().getFullYear(); 
}
