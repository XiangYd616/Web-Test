import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Table from '../Table';

describe('Table Component', () => {
  const mockColumns = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'email', title: 'Email' },
    { key: 'status', title: 'Status' }
  ];

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' }
  ];

  it('renders with basic data', () => {
    render(<Table columns={mockColumns} data={mockData} />);
    
    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('handles sorting', () => {
    const handleSort = vi.fn();
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        onSort={handleSort}
        sortBy="name"
        sortOrder="asc"
      />
    );
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(handleSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('displays sort indicators', () => {
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        sortBy="name"
        sortOrder="asc"
      />
    );
    
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveClass('table-header-sorted');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('handles row selection', () => {
    const handleSelectionChange = vi.fn();
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        selectable
        onSelectionChange={handleSelectionChange}
      />
    );
    
    const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip header checkbox
    fireEvent.click(firstCheckbox);
    
    expect(handleSelectionChange).toHaveBeenCalledWith([mockData[0]]);
  });

  it('handles select all', () => {
    const handleSelectionChange = vi.fn();
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        selectable
        onSelectionChange={handleSelectionChange}
      />
    );
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(handleSelectionChange).toHaveBeenCalledWith(mockData);
  });

  it('handles pagination', () => {
    const handlePageChange = vi.fn();
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        pagination={{
          current: 1,
          pageSize: 2,
          total: 10,
          onChange: handlePageChange
        }}
      />
    );
    
    expect(screen.getByText('1')).toBeInTheDocument(); // Current page
    expect(screen.getByText('Next')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Next'));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('displays loading state', () => {
    render(<Table columns={mockColumns} data={[]} loading />);
    expect(screen.getByTestId('table-loading')).toBeInTheDocument();
  });

  it('displays empty state', () => {
    render(<Table columns={mockColumns} data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles custom empty message', () => {
    render(
      <Table 
        columns={mockColumns} 
        data={[]} 
        emptyMessage="No users found"
      />
    );
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('renders with custom row renderer', () => {
    const customRowRenderer = (row: any, index: number) => (
      <tr key={row.id} data-testid={`custom-row-${index}`}>
        <td>{row.name}</td>
        <td>{row.email}</td>
      </tr>
    );
    
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        renderRow={customRowRenderer}
      />
    );
    
    expect(screen.getByTestId('custom-row-0')).toBeInTheDocument();
  });

  it('handles row click events', () => {
    const handleRowClick = vi.fn();
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        onRowClick={handleRowClick}
      />
    );
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow!);
    
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
  });

  it('applies custom className', () => {
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        className="custom-table"
      />
    );
    
    expect(screen.getByRole('table')).toHaveClass('custom-table');
  });

  it('handles different table sizes', () => {
    const { rerender } = render(
      <Table columns={mockColumns} data={mockData} size="sm" />
    );
    expect(screen.getByRole('table')).toHaveClass('table-sm');
    
    rerender(<Table columns={mockColumns} data={mockData} size="lg" />);
    expect(screen.getByRole('table')).toHaveClass('table-lg');
  });

  it('handles striped rows', () => {
    render(
      <Table columns={mockColumns} data={mockData} striped />
    );
    expect(screen.getByRole('table')).toHaveClass('table-striped');
  });

  it('handles bordered table', () => {
    render(
      <Table columns={mockColumns} data={mockData} bordered />
    );
    expect(screen.getByRole('table')).toHaveClass('table-bordered');
  });

  it('handles hover effect', () => {
    render(
      <Table columns={mockColumns} data={mockData} hover />
    );
    expect(screen.getByRole('table')).toHaveClass('table-hover');
  });
});
