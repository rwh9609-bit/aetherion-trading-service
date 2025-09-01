import React, { useState, useContext, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthContext } from '../components/AuthContext';
import { Stepper, Step, StepLabel, Button, Typography, Box, Alert } from '@mui/material'; 

const steps = ['Plan Selection', 'Review Benefits', 'Payment'];

export default function SubscriptionFlow({ setView, planType = null }) {
  const [activeStep, setActiveStep] = useState(planType ? 1 : 0);
  const [selectedPlan, setSelectedPlan] = useState(planType);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      initiateCheckout();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const selectPlan = (planId) => {
    setSelectedPlan(planId);
    setActiveStep(1);
  };

  const initiateCheckout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Checkout logic
      // On success, Stripe will redirect to success page
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Render different content based on step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <PlanSelection onSelect={selectPlan} />;
      case 1:
        return <PlanBenefits plan={selectedPlan} />;
      case 2:
        return <PaymentSummary plan={selectedPlan} />;
      default:
        return 'Unknown step';
    }
  };

  // Check if user is logged in
  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please log in to subscribe to a plan
        </Alert>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => setView('login')}
        >
          Log In
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {getStepContent(activeStep)}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleNext}
          disabled={loading || !selectedPlan}
        >
          {loading ? 'Processing...' : 
           activeStep === steps.length - 1 ? 'Subscribe' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
}