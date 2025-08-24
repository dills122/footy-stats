import { Component, signal } from "@angular/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { RouterOutlet } from "@angular/router";

@Component({
	selector: "app-root",
	imports: [RouterOutlet, MatSlideToggleModule],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
})
export class App {
	protected readonly title = signal("angular-mat-tailwind-starter");
}
