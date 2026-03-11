import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { ClienteNavbarComponent } from '../cliente-navbar/cliente-navbar.component';
import { ClienteFooterComponent } from '../cliente-footer/cliente-footer.component';
import { MobileBottomNavComponent } from '../../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Component({
  selector: 'app-cliente-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ClienteNavbarComponent, ClienteFooterComponent, MobileBottomNavComponent],
  templateUrl: './cliente-layout.component.html',
  styleUrls: ['./cliente-layout.component.scss']
})
export class ClienteLayoutComponent implements OnInit {
  heroTitle = '';
  heroSubtitle = '';
  heroImage = '';

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.router.events
      .pipe(
        startWith(null),
        filter((event) => event === null || event instanceof NavigationEnd),
      )
      .subscribe(() => {
        const data = this.getDeepestChildData();
        this.heroTitle = data['heroTitle'] || '';
        this.heroSubtitle = data['heroSubtitle'] || '';
        this.heroImage = data['heroImage'] || '';
      });
  }

  private getDeepestChildData(): any {
    let current: ActivatedRoute | null = this.route;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return current?.snapshot.data || {};
  }
}
