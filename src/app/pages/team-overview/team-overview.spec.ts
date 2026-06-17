import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TeamOverview } from './team-overview';

jest.mock('echarts/charts', () => ({ LineChart: {} }));
jest.mock('echarts/components', () => ({
  GridComponent: {},
  MarkAreaComponent: {},
  TooltipComponent: {},
}));
jest.mock('echarts/core', () => ({ use: jest.fn() }));
jest.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));
jest.mock('ngx-echarts', () => {
  const core = jest.requireActual('@angular/core');
  class MockNgxEchartsDirective {}
  core.Directive({ selector: '[echarts]' })(MockNgxEchartsDirective);
  core.Input()(MockNgxEchartsDirective.prototype, 'options');
  core.Input()(MockNgxEchartsDirective.prototype, 'autoResize');

  return {
    NgxEchartsDirective: MockNgxEchartsDirective,
    provideEchartsCore: () => [],
  };
});

describe('TeamOverview', () => {
  let component: TeamOverview;
  let fixture: ComponentFixture<TeamOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamOverview],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ clubId: 'alpha fc' })),
            snapshot: {
              paramMap: convertToParamMap({ clubId: 'alpha fc' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
