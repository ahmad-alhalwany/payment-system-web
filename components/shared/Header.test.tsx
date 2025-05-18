import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { useAuth } from '@/app/hooks/useAuth';
import '@testing-library/jest-dom';

jest.mock('@/app/hooks/useAuth');

const mockedUseAuth = useAuth as jest.Mock;

describe('Header', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show director links only for director', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'director' }, logout: jest.fn() });
    render(<Header />);
    expect(screen.getByText('الفروع')).toBeInTheDocument();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
    expect(screen.getByText('الموظفون')).toBeInTheDocument();
  });

  it('should not show director links for employee', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'employee' }, logout: jest.fn() });
    render(<Header />);
    expect(screen.queryByText('الفروع')).toBeNull();
    expect(screen.queryByText('التقارير')).toBeNull();
    expect(screen.queryByText('الموظفون')).toBeNull();
  });

  it('should call logout and redirect on logout button click', () => {
    const logoutMock = jest.fn();
    mockedUseAuth.mockReturnValue({ user: { role: 'director' }, logout: logoutMock });
    render(<Header />);
    const logoutBtn = screen.getByText('تسجيل الخروج');
    fireEvent.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalled();
  });
}); 