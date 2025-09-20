import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  imports: [MatButtonModule, MatCardModule],
})
export class ExampleComponent {}
