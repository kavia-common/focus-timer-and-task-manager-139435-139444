import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header brand title', () => {
  render(<App />);
  const header = screen.getByText(/Pomodoro Focus/i);
  expect(header).toBeInTheDocument();
});
