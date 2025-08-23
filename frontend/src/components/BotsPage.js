import React, { useEffect, useState } from 'react';
import { TextField, Container, Box, Typography, Card, CardContent, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress, Alert } from '@mui/material';
import { BotServiceClient } from "../proto/trading_api_grpc_web_pb";
import {
  ListBotsRequest,
  CreateBotRequest,
  BotIdRequest,
  UpdateBotRequest,
  Bot,
} from "../proto/trading_api_pb";

export default function BotsPage({ onNavigate, onSelectBot, selectedBot, userId, authToken }) {

  const client = new BotServiceClient("http://localhost:8080");
  const statusColor = (active) => active ? 'success.main' : 'text.secondary';
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    symbols: "",
    strategyName: "",
    paramKey: "",
    paramValue: "",
    isLive: false,
  });

  // Fetch bots for the user
  // Helper to fetch bots
  const fetchBots = () => {
    if (!userId) return;
    setLoading(true);
    const req = new ListBotsRequest();
    req.setUserId(userId);

    client.listBots(req, authToken, (err, resp) => {
      if (err) {
        console.error("Failed to fetch bots:", err.message);
        setLoading(false);
        return;
      }
      setBots(resp.getBotsList());
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchBots();
    // eslint-disable-next-line
  }, [userId, authToken]);


  // Dialog open/close handlers
  const handleOpenCreate = () => setCreateOpen(true);
  const handleCloseCreate = () => setCreateOpen(false);

  // Form change handler
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  // Example: Create a new bot
  const handleCreateBot = async () => {
    const req = new CreateBotRequest();
    req.setUserId(userId);
    req.setName(form.name);
    req.setDescription(form.description);
    req.setSymbolsList(form.symbols.split(",").map(s => s.trim()));
    req.setStrategyName(form.strategyName);
    const paramsMap = req.getStrategyParametersMap();
    if (form.paramKey && form.paramValue) {
      paramsMap.set(form.paramKey, form.paramValue);
    }
    req.setIsLive(form.isLive);

    client.createBot(req, authToken, (err, resp) => {
      if (err) {
        alert("Failed to create bot: " + err.message);
        return;
      }
      fetchBots();
      handleCloseCreate();
    });
  };

  // Example: Update bot
  const handleUpdateBot = (botId) => {
    const req = new UpdateBotRequest();
    req.setBotId(botId);
    req.setName("Updated Name");
    req.setIsActive(true);

    client.updateBot(req, {}, (err, resp) => {
      if (err) {
        alert("Failed to update bot: " + err.message);
        return;
      }
      // Optionally refresh bot list
    });
  };

  // Example: Delete bot
  const handleDeleteBot = (botId) => {
    const req = new BotIdRequest();
    req.setBotId(botId);

    client.deleteBot(req, {}, (err, resp) => {
      if (err) {
        alert("Failed to delete bot: " + err.message);
        return;
      }
      // Optionally refresh bot list
    });
  };

  return (
    <Container>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h4">Your Bots</Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleOpenCreate}>
          Create Bot
        </Button>
        <Dialog open={createOpen} onClose={handleCloseCreate}>
          <DialogTitle>Create Bot</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label="Name" name="name" value={form.name} onChange={handleFormChange} fullWidth />
              <TextField label="Description" name="description" value={form.description} onChange={handleFormChange} fullWidth />
              <TextField label="Symbols (comma separated)" name="symbols" value={form.symbols} onChange={handleFormChange} fullWidth />
              <TextField label="Strategy Name" name="strategyName" value={form.strategyName} onChange={handleFormChange} fullWidth />
              <TextField label="Strategy Param Key" name="paramKey" value={form.paramKey} onChange={handleFormChange} fullWidth />
              <TextField label="Strategy Param Value" name="paramValue" value={form.paramValue} onChange={handleFormChange} fullWidth />
              <Box>
                <label>
                  <input type="checkbox" name="isLive" checked={form.isLive} onChange={handleFormChange} />
                  Live Bot
                </label>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreate}>Cancel</Button>
            <Button onClick={handleCreateBot} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

          {bots.map((bot) => (
            <li key={bot.getId()}>
              <strong>{bot.getName()}</strong> - {bot.getDescription()}
              <button onClick={() => handleUpdateBot(bot.getId())}>Update</button>
              <button onClick={() => handleDeleteBot(bot.getId())}>Delete</button>
            </li>
          ))}
      </Box>
    </Container>
  );
}