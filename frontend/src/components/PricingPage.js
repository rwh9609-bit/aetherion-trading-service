import React from 'react';
import Button from '@mui/material/Button';
 
const PricingPage = ({ setView }) => {
  const STRIPE_PRICE_ID_MONTHLY = process.env.REACT_APP_STRIPE_PRICE_ID_MONTHLY;
  const STRIPE_PRICE_ID_YEARLY = process.env.REACT_APP_STRIPE_PRICE_ID_YEARLY;
  const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  const handleSubscribe = async (priceId) => {
  console.log('Sending priceId:', priceId);
  try {
    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert('Aetherion is not ready to be used: ' + (data.error || 'Unknown error'));
      return;
    }
    const { sessionId } = data;
    if (!sessionId) {
      alert('No sessionId returned from backend.');
      return;
    }
    const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    await stripe.redirectToCheckout({ sessionId });
  } catch (err) {
    alert('Aetherion is not ready to be used: ' + err.message);
  }
};


  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen">
      <div className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
          Choose Your Plan
        </h2>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12">
          Start for free, or unlock the full power of Aetherion with our Pro plan.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <h3 className="text-3xl font-bold mb-4">Free</h3>
            <p className="text-5xl font-black mb-4">$0</p>
            <p className="text-gray-400 mb-8">Perpetual free plan</p>
            <ul className="text-left space-y-2 text-gray-400">
              <li>✓ Single bot</li>
              <li>✓ Limited functionality</li>
              <li>✓ Community support</li>
            </ul>
            <p>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setView('dashboard')}
                sx={{
                  width: '100%',
                  py: 2,
                  px: 4,
                  borderRadius: 2,
                  fontWeight: 'bold',
                  boxShadow: 2,
                  background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                  color: '#fff',
                  transition: 'transform 0.1s',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)',
                    transform: 'scale(1.04)',
                  },
                }}
              >
                Current Plan
              </Button>
            </p>
          </div>
          {/* Pro Tier */}
          <div className="bg-gray-800 p-8 rounded-xl border border-emerald-500 glow-effect">
            <h3 className="text-3xl font-bold mb-4 text-emerald-400">Pro</h3>
            <p className="text-5xl font-black mb-4">$50<span className="text-lg font-medium">/mo</span></p>
            <p className="text-gray-400 mb-8">For serious traders</p>
            <ul className="text-left space-y-2 text-gray-400">
              <li>✓ Multiple bots</li>
              <li>✓ Access to advanced strategies</li>
              <li>✓ Real-time data feeds</li>
              <li>✓ Priority support</li>
            </ul>
            <button onClick={() => handleSubscribe(STRIPE_PRICE_ID_MONTHLY)} className="mt-8 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105">
              Subscribe Monthly
            </button>
            <button onClick={() => handleSubscribe(STRIPE_PRICE_ID_YEARLY)} className="mt-4 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105">
              Subscribe Yearly ($299/year)
            </button>
          </div>
          {/* Enterprise Tier */}
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <h3 className="text-3xl font-bold mb-4">Enterprise</h3>
            <p className="text-5xl font-black mb-4">Custom</p>
            <p className="text-gray-400 mb-8">For institutional clients</p>
            <ul className="text-left space-y-2 text-gray-400">
              <li>✓ Everything in Pro</li>
              <li>✓ Dedicated account management</li>
              <li>✓ Custom strategy development</li>
              <li>✓ API access</li>
            </ul>
            <a href="mailto:sales@aetherion.cloud" className="mt-8 block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;