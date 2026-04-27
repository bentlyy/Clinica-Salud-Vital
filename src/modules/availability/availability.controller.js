import * as availabilityService from './availability.service.js';

export const createAvailability = async (req, res) => {
  try {
    const availability = await availabilityService.createAvailability(req.body);
    res.status(201).json(availability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAvailability = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const data = await availabilityService.getAvailabilityByDoctor(doctorId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};