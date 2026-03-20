import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cliente-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cliente-footer.component.html',
  styleUrls: ['./cliente-footer.component.scss']
})
export class ClienteFooterComponent { year = new Date().getFullYear(); }
