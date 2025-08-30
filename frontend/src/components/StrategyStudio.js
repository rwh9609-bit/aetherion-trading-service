import React, { useState } from 'react';
import { Container, Typography, Card, CardContent, Button, Stack, Divider, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { backtestStrategy, deployStrategy } from '../services/strategyApi';

const blockTypes = [
  { type: 'Indicator', label: 'Indicator', config: { indicator: 'MA', period: 20 } },
  { type: 'Signal', label: 'Signal', config: { condition: 'RSI < 30' } },
  { type: 'Action', label: 'Action', config: { action: 'Buy', amount: '1%' } }
];

const StrategyStudio = ({ onNavigate }) => {
  const [strategyBlocks, setStrategyBlocks] = useState([]);
  const [selectedBlockType, setSelectedBlockType] = useState(blockTypes[0].type);
  const [backtestResult, setBacktestResult] = useState(null);

  const handleAddBlock = () => {
    const block = blockTypes.find(b => b.type === selectedBlockType);
    setStrategyBlocks([...strategyBlocks, { ...block }]);
  };

const handleBacktest = async () => {
  setBacktestResult(null);
  try {
    const result = await backtestStrategy(strategyBlocks);
    setBacktestResult(result);
  } catch (e) {
    setBacktestResult({ error: 'Backtest failed.' });
  }
};
const handleDeploy = async () => {
  try {
    const result = await deployStrategy(strategyBlocks);
    if (result.success) {
      alert('Strategy deployed as live trading bot!');
      if (onNavigate) onNavigate('bots');
    } else {
      alert('Deployment failed: ' + (result.message || 'Unknown error'));
    }
  } catch (e) {
    alert('Deployment failed.');
  }
};

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(strategyBlocks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setStrategyBlocks(items);
  };

  return (
    <Container maxWidth="md" sx={{ mt:4, mb:6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:3 }}>
        <Typography variant="h5" fontWeight={600}>Strategy Studio</Typography>
        <Button size="small" onClick={()=> onNavigate && onNavigate('bots')}>Back to Bots</Button>
      </Stack>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Visual Strategy Builder (Drag & Drop enabled)
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb:2 }}>
            <FormControl>
              <InputLabel>Block Type</InputLabel>
              <Select
                value={selectedBlockType}
                label="Block Type"
                onChange={e => setSelectedBlockType(e.target.value)}
                size="small"
              >
                {blockTypes.map(b => (
                  <MenuItem key={b.type} value={b.type}>{b.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={handleAddBlock}>
              Add Block
            </Button>
          </Stack>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="blocks">
              {(provided) => (
                <Stack
                  spacing={2}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ minHeight: 80 }}
                >
                  {strategyBlocks.map((block, idx) => (
                    <Draggable key={idx} draggableId={`block-${idx}`} index={idx}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{ p:2, cursor:'grab', bgcolor:'#232b3e' }}
                        >
                          <Typography>Block {idx+1}: {block.label}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {JSON.stringify(block.config)}
                          </Typography>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
          <Divider sx={{ my:2 }} />
          <Button variant="contained" onClick={handleBacktest} sx={{ mr:2 }}>
            Backtest Strategy
          </Button>
          <Button variant="contained" color="success" onClick={handleDeploy}>
            Deploy Live Bot
          </Button>
          {backtestResult && (
            <Card sx={{ mt:2, p:2 }}>
              <Typography variant="subtitle2">Backtest Result:</Typography>
              <Typography>Profit: ${backtestResult.profit}</Typography>
              <Typography>Trades: {backtestResult.trades}</Typography>
              <Typography>Win Rate: {backtestResult.winRate}</Typography>
            </Card>
          )}
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt:2 }}>
        Build, test, and deploy your own trading strategies visually. Drag blocks to reorder. More features coming soon!
      </Typography>
    </Container>
  );
};

export default StrategyStudio;