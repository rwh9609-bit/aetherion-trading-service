import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Cancel = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.alert('Subscription canceled or checkout aborted.');
    navigate('/pricing');
  }, [navigate]);

  return null;
};

export default Cancel;