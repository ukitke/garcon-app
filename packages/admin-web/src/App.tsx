import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box, Paper } from '@mui/material';

const Dashboard = () => (
  <Paper sx={{ p: 3, mt: 3 }}>
    <Typography variant="h4" gutterBottom>
      Garçon Admin Dashboard
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Welcome to the Garçon restaurant management platform. Here you can manage
      your menu, view orders, track analytics, and configure your restaurant
      settings.
    </Typography>
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Features Coming Soon:</Typography>
      <ul>
        <li>Menu Management</li>
        <li>Order Tracking</li>
        <li>Analytics Dashboard</li>
        <li>Table Management</li>
        <li>Staff Management</li>
        <li>Payment Settings</li>
      </ul>
    </Box>
  </Paper>
);

function App() {
  return (
    <Container maxWidth="lg">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Container>
  );
}

export default App;