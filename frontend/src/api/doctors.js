import axios from 'axios';

const API = 'http://localhost:3000/api';

export const getDoctors = async () => {
  const res = await axios.get(`${API}/doctors/public`);
  return res.data;
};