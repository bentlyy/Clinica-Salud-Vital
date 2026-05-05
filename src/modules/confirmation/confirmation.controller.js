import * as confirmationService from './confirmation.service.js';

export const confirmBooking = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) throw new Error('Token requerido');

    const result = await confirmationService.confirmBooking(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
