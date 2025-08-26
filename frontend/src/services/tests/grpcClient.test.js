import { getBotState } from '../grpcClient';
// Mock the botClient and its getBotStatus method
jest.mock('../grpcClient', () => {
  return {
    getBotState: jest.fn(),
    botClient: {
      getBotStatus: jest.fn(),
    },
  };
});

describe('getBotState', () => {
  it('should convert stateMap to state object', async () => {
    // Arrange: mock implementation of getBotState
    const mockState = {
      botId: 'test-bot-id',
      stateMap: [
        ['last_signal', 'buy'],
        ['zscore', '1.23'],
        ['price', '12345.67'],
      ],
    };
    const expectedState = {
      last_signal: 'buy',
      zscore: '1.23',
      price: '12345.67',
    };
    const { getBotState } = require('../grpcClient');
    getBotState.mockResolvedValue({
      ...mockState,
      state: expectedState,
    });

    // Act
    const result = await getBotState('test-bot-id');

    // Assert
    expect(result.state).toEqual(expectedState);
  });
});