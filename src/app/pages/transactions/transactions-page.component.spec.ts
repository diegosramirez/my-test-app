import { TestBed } from '@angular/core/testing';
import { TransactionsPageComponent } from './transactions-page.component';
import { TransactionService } from '../../services/transaction.service';

describe('TransactionsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render h1 with "Transactions"', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Transactions');
  });

  it('should render a form with inputs', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[name="description"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[name="amount"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('select[name="type"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[name="category"]')).toBeTruthy();
  });

  it('should render transaction rows from seed data', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });

  it('should have delete buttons for each transaction', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.delete-btn');
    expect(buttons.length).toBe(5);
  });

  it('should delete a transaction when delete button clicked', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.delete-btn').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(4);
  });

  it('should default newType to expense', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    expect(fixture.componentInstance.newType).toBe('expense');
  });

  it('should reset form fields after onAdd', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const comp = fixture.componentInstance;
    comp.newDescription = 'Test';
    comp.newAmount = 50;
    comp.newCategory = 'Misc';
    comp.newType = 'income';
    comp.onAdd();
    expect(comp.newDescription).toBe('');
    expect(comp.newAmount).toBeNull();
    expect(comp.newCategory).toBe('');
  });

  it('should not add transaction if description is empty', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const comp = fixture.componentInstance;
    const service = TestBed.inject(TransactionService);
    comp.newDescription = '';
    comp.newAmount = 50;
    comp.newCategory = 'Misc';
    comp.onAdd();
    expect(service.transactions().length).toBe(5);
  });

  it('should not add transaction if amount is null', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const comp = fixture.componentInstance;
    const service = TestBed.inject(TransactionService);
    comp.newDescription = 'Test';
    comp.newAmount = null;
    comp.newCategory = 'Misc';
    comp.onAdd();
    expect(service.transactions().length).toBe(5);
  });

  it('should not add transaction if category is empty', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const comp = fixture.componentInstance;
    const service = TestBed.inject(TransactionService);
    comp.newDescription = 'Test';
    comp.newAmount = 50;
    comp.newCategory = '';
    comp.onAdd();
    expect(service.transactions().length).toBe(5);
  });

  it('should add transaction with correct data via onAdd', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const comp = fixture.componentInstance;
    const service = TestBed.inject(TransactionService);
    comp.newDescription = 'Lunch';
    comp.newAmount = 15;
    comp.newType = 'expense';
    comp.newCategory = 'Food';
    comp.onAdd();
    expect(service.transactions().length).toBe(6);
    const added = service.transactions().find(t => t.description === 'Lunch');
    expect(added).toBeTruthy();
    expect(added!.amount).toBe(15);
    expect(added!.type).toBe('expense');
    expect(added!.category).toBe('Food');
  });
});
