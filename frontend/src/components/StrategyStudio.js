import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button, Box, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Alert } from '@mui/material';
import * as grpcWeb from 'grpc-web';
import { StrategyStudioServicePromiseClient } from '../proto/trading_api_grpc_web_pb';
import { CreateCustomStrategyRequest, CustomStrategy, StrategyNode, StrategyEdge, NodeType, IndicatorType, OperatorType, ActionType, BacktestCustomStrategyRequest } from '../proto/trading_api_pb';
import axios from 'axios';

import './StrategyStudio.css';

const initialNodes = [
  { id: 'indicator-1', type: 'INDICATOR', content: 'SMA', parameters: { indicator_type: 'SMA', period: '50' } },
  { id: 'indicator-2', type: 'INDICATOR', content: 'RSI', parameters: { indicator_type: 'RSI', period: '14' } },
  { id: 'operator-1', type: 'OPERATOR', content: 'AND', parameters: { operator_type: 'AND' } },
  { id: 'operator-2', type: 'OPERATOR', content: 'GREATER_THAN', parameters: { operator_type: 'GREATER_THAN' } },
  { id: 'action-1', type: 'ACTION', content: 'BUY', parameters: { action_type: 'ACTION_BUY', amount: '1', unit: 'PERCENT' } },
  { id: 'action-2', type: 'ACTION', content: 'SELL', parameters: { action_type: 'ACTION_SELL', amount: '1', unit: 'PERCENT' } },
];

const formatNodeParameters = (node) => {
  switch (node.type) {
    case 'INDICATOR':
      const indicatorType = node.parameters.indicator_type;
      const period = node.parameters.period;
      return `${indicatorType} (Period: ${period})`;
    case 'OPERATOR':
      const operatorType = node.parameters.operator_type;
      return operatorType.replace(/_/g, ' '); // Replace underscores with spaces
    case 'ACTION':
      const actionType = node.parameters.action_type;
      const amount = node.parameters.amount;
      const unit = node.parameters.unit;
      return `${actionType.replace('ACTION_', '')} ${amount}${unit === 'PERCENT' ? '%' : ''} of Asset`;
    default:
      return JSON.stringify(node.parameters);
  }
};

const StrategyStudio = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'
  const [backtestResults, setBacktestResults] = useState(null);
  const [backtestStatus, setBacktestStatus] = useState(null); // 'loading' | 'success' | 'error'

  const grpcClient = new StrategyStudioServicePromiseClient('http://localhost:8080', null, null); // Envoy proxy address

  const onDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'nodes-list') {
        const reorderedNodes = Array.from(nodes);
        const [removed] = reorderedNodes.splice(source.index, 1);
        reorderedNodes.splice(destination.index, 0, removed);
        setNodes(reorderedNodes);
      } else if (source.droppableId === 'strategy-canvas') {
        const reorderedCanvasNodes = Array.from(canvasNodes);
        const [removed] = reorderedCanvasNodes.splice(source.index, 1);
        reorderedCanvasNodes.splice(destination.index, 0, removed);
        setCanvasNodes(reorderedCanvasNodes);
      }
    } else {
      if (source.droppableId === 'nodes-list' && destination.droppableId === 'strategy-canvas') {
        const newCanvasNodes = Array.from(canvasNodes);
        const newNode = { ...nodes[source.index], id: `${nodes[source.index].type.toLowerCase()}-${Date.now()}` }; // Unique ID for canvas
        newCanvasNodes.splice(destination.index, 0, newNode);
        setCanvasNodes(newCanvasNodes);
      }
    }
  };

  const handleSaveStrategy = async () => {
    setOpenSaveDialog(true);
  };

  const handleSaveDialogClose = () => {
    setOpenSaveDialog(false);
    setSaveStatus(null);
  };

  const handleSaveDialogConfirm = async () => {
    setSaveStatus('loading');
    try {
      const request = new CreateCustomStrategyRequest();
      request.setName(strategyName);
      request.setDescription(strategyDescription);

      canvasNodes.forEach(uiNode => {
        const strategyNode = new StrategyNode();
        strategyNode.setId(uiNode.id);
        strategyNode.setType(NodeType[uiNode.type]); // Convert string to enum
        for (const key in uiNode.parameters) {
          strategyNode.getParametersMap().set(key, uiNode.parameters[key]);
        }
        request.addNodes(strategyNode);
      });

      // For simplicity, let's assume a linear connection for now
      // In a real scenario, you'd need a UI for drawing edges
      for (let i = 0; i < canvasNodes.length - 1; i++) {
        const edge = new StrategyEdge();
        edge.setFromNodeId(canvasNodes[i].id);
        edge.setToNodeId(canvasNodes[i+1].id);
        request.addEdges(edge);
      }

      const response = await grpcClient.createCustomStrategy(request, {});
      console.log('Save Strategy Response:', response.toObject());
      setSaveStatus('success');
    } catch (error) {
      console.error('Error saving strategy:', error);
      setSaveStatus('error');
    }
  };

  const handleRunBacktest = async () => {
    if (canvasNodes.length === 0) {
      alert('Please build a strategy on the canvas first.');
      return;
    }
    setBacktestStatus('loading');
    setBacktestResults(null);

    try {
      const customStrategyProto = new CustomStrategy();
      customStrategyProto.setName(strategyName || 'Unnamed Strategy');
      customStrategyProto.setDescription(strategyDescription || 'No description');
      customStrategyProto.setId('temp-backtest-id'); // Temporary ID for backtest

      canvasNodes.forEach(uiNode => {
        const strategyNode = new StrategyNode();
        strategyNode.setId(uiNode.id);
        strategyNode.setType(NodeType[uiNode.type]);
        for (const key in uiNode.parameters) {
          strategyNode.getParametersMap().set(key, uiNode.parameters[key]);
        }
        customStrategyProto.addNodes(strategyNode);
      });

      for (let i = 0; i < canvasNodes.length - 1; i++) {
        const edge = new StrategyEdge();
        edge.setFromNodeId(canvasNodes[i].id);
        edge.setToNodeId(canvasNodes[i+1].id);
        customStrategyProto.addEdges(edge);
      }

      // Convert protobuf message to plain JavaScript object for Axios
      const strategyData = {
        symbol: 'BTCUSD', // Hardcoded for now
        strategy_definition: customStrategyProto.toObject()
      };

      const response = await axios.post('/backtest/custom', strategyData);
      console.log('Backtest Results:', response.data);
      setBacktestResults(response.data);
      setBacktestStatus('success');
    } catch (error) {
      console.error('Error running backtest:', error);
      setBacktestStatus('error');
    }
  };

  const handleDeployBot = async () => {
    if (canvasNodes.length === 0) {
      alert('Please build a strategy on the canvas first.');
      return;
    }
    if (!strategyName) {
      alert('Please save the strategy first to get an ID for deployment.');
      return;
    }

    try {
      // For deployment, we'd typically use the saved strategy ID
      // For now, let's assume we have a strategy ID after saving.
      // This part needs to be properly linked with the Go backend's bot deployment.
      alert('Deploy Bot functionality to be implemented. Assuming strategy is saved.');
      // Example: const deployRequest = new DeployCustomStrategyRequest();
      // deployRequest.setStrategyId(savedStrategyId);
      // const response = await grpcClient.deployCustomStrategy(deployRequest, {});
      // console.log('Deploy Bot Response:', response.toObject());
    } catch (error) {
      console.error('Error deploying bot:', error);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="strategy-studio-container">
        <div className="nodes-palette">
          <h3>Available Nodes</h3>
          <Droppable droppableId="nodes-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="nodes-list">
                {nodes.map((node, index) => (
                  <Draggable key={node.id} draggableId={node.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="node-item"
                      >
                        {node.content} ({formatNodeParameters(node)})<br/>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className="strategy-canvas">
          <h3>Strategy Canvas</h3>
          <Droppable droppableId="strategy-canvas">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="canvas-area">
                {canvasNodes.length === 0 && <p>Drag nodes here to build your strategy</p>}
                {canvasNodes.map((node, index) => (
                  <Draggable key={node.id} draggableId={node.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`canvas-node ${node.type.toLowerCase()}`}
                      >
                        {node.content} ({formatNodeParameters(node)})<br/>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={handleSaveStrategy}>Save Strategy</Button>
            <Button variant="contained" onClick={handleRunBacktest} disabled={backtestStatus === 'loading'}>
              {backtestStatus === 'loading' ? 'Running Backtest...' : 'Run Backtest'}
            </Button>
            <Button variant="contained" onClick={handleDeployBot}>Deploy Bot</Button>
          </Box>

          {backtestResults && (
            <Box sx={{ mt: 4, p: 2, border: '1px solid #ccc', borderRadius: '8px', width: '100%' }}>
              <h4>Backtest Results:</h4>
              <p>Total Trades: {backtestResults.trades.length}</p>
              <p>Final Equity: {backtestResults.equity_curve[backtestResults.equity_curve.length - 1]?.equity.toFixed(2)}</p>
              {/* You can add more detailed results display here */}
            </Box>
          )}
        </div>
      </div>

      <Dialog open={openSaveDialog} onClose={handleSaveDialogClose}>
        <DialogTitle>Save Strategy</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Strategy Name"
            type="text"
            fullWidth
            variant="standard"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="standard"
            value={strategyDescription}
            onChange={(e) => setStrategyDescription(e.target.value)}
          />
          {saveStatus === 'success' && <Alert severity="success" sx={{ mt: 2 }}>Strategy saved successfully!</Alert>}
          {saveStatus === 'error' && <Alert severity="error" sx={{ mt: 2 }}>Error saving strategy.</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDialogClose}>Cancel</Button>
          <Button onClick={handleSaveDialogConfirm} disabled={!strategyName || saveStatus === 'loading'}>Save</Button>
        </DialogActions>
      </Dialog>
    </DragDropContext>
  );
};

export default StrategyStudio;
