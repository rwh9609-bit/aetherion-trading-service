import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Card, CardContent, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress, Alert } from '@mui/material';
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


  // Example: Create a new bot
  const handleCreateBot = async () => {
    const req = new CreateBotRequest();
    req.setUserId(userId);
    req.setName("My Bot");
    req.setDescription("A sample bot");
    req.setSymbolsList(["AAPL", "GOOG"]);
    req.setStrategyName("mean_reversion");
    const paramsMap = req.getStrategyParametersMap();
    paramsMap.set("param1", "value1");
    paramsMap.set("param2", "value2");
    // Set initial_account_value as a DecimalValue
    // You may need to construct DecimalValue using generated code
    // req.setInitialAccountValue(decimalValue);
    req.setIsLive(true); 
    client.createBot(req, authToken, (err, resp) => {
      if (err) {
        alert("Failed to create bot: " + err.message);
        return;
      }
      // Optionally refresh bot list
      fetchBots();
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
    <div>
      <h1>Your Bots</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {bots.map((bot) => (
            <li key={bot.getId()}>
              <strong>{bot.getName()}</strong> - {bot.getDescription()}
              <button onClick={() => handleUpdateBot(bot.getId())}>Update</button>
              <button onClick={() => handleDeleteBot(bot.getId())}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={handleCreateBot}>Create Bot</button>
    </div>
  );
}