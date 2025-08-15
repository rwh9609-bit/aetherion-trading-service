import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page hero heading', () => {
  render(<App />);
  expect(screen.getByText(/Modern/i)).toBeInTheDocument();
  expect(screen.getByText(/Trading Architecture/i)).toBeInTheDocument();
});
