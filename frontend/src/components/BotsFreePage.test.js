import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import BotsFreePage from './BotsFreePage';
import * as grpcClient from '../services/grpcClient';

// Mock the grpcClient
jest.mock('../services/grpcClient');

const mockBots = [
  { botId: '1', name: 'Test Bot 1', symbol: 'BTC/USD', strategy: 'Mean Reversion', isActive: true },
  { botId: '2', name: 'Test Bot 2', symbol: 'ETH/USD', strategy: 'Momentum', isActive: false },
];

describe('BotsFreePage', () => {
  beforeEach(() => {
    grpcClient.listBots.mockResolvedValue({ botsList: mockBots });
    grpcClient.deleteBot.mockResolvedValue({});
    grpcClient.startBot.mockResolvedValue({});
    grpcClient.stopBot.mockResolvedValue({});
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(<BotsFreePage />);
    });
    expect(screen.getByText('Bots')).toBeInTheDocument();
  });

  it('displays bots on successful fetch', async () => {
    await act(async () => {
      render(<BotsFreePage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Test Bot 1')).toBeInTheDocument();
      expect(screen.getByText('Test Bot 2')).toBeInTheDocument();
    });
  });

  it('does not show delete button for regular user', async () => {
    const user = { role: 'user' };
    await act(async () => {
      render(<BotsFreePage user={user} />);
    });
    await waitFor(() => {
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  it('shows delete button for superuser', async () => {
    const user = { role: 'superuser' };
    await act(async () => {
      render(<BotsFreePage user={user} />);
    });
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBe(mockBots.length);
    });
  });

  it('opens confirmation dialog on delete click', async () => {
    const user = { role: 'superuser' };
    await act(async () => {
      render(<BotsFreePage user={user} />);
    });
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
    });
    expect(screen.getByText('Delete Bot?')).toBeInTheDocument();
  });

  it('calls deleteBot on confirmation', async () => {
    const user = { role: 'superuser' };
    await act(async () => {
      render(<BotsFreePage user={user} />);
    });
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
    });

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByText('Delete');
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(grpcClient.deleteBot).toHaveBeenCalledWith('1');
    });
  });

  it('does not call deleteBot on cancel', async () => {
    const user = { role: 'superuser' };
    await act(async () => {
      render(<BotsFreePage user={user} />);
    });
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
    });

    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(grpcClient.deleteBot).not.toHaveBeenCalled();
    });
  });
});
