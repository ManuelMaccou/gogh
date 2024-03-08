import React, { useState } from 'react';
import axios from 'axios';

interface SimulateUserProps {
  onSimulationSuccess: (fid: string) => void;
}

const SimulateUser: React.FC<SimulateUserProps> = ({ onSimulationSuccess }) => {
  const [simulateFid, setSimulateFid] = useState<string>('');

  const handleSimulateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/simulate`, { targetFid: simulateFid }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('currentFid', simulateFid);
      onSimulationSuccess(simulateFid);
    } catch (error) {
      const message = (axios.isAxiosError(error) && error.response?.data?.message) || 'An error occurred during simulation';
      console.error("Error during simulation:", message);
    }
  };

  return (
    <div>
      <form onSubmit={handleSimulateSubmit}>
        <label htmlFor="simulateFid">Simulate User FID:</label>
        <input type="text" value={simulateFid} onChange={(e) => setSimulateFid(e.target.value)} />
        <button type="submit">Simulate</button>
      </form>
    </div>
  );
};

export default SimulateUser;
