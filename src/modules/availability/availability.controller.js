import * as availabilityService from './availability.service.js';
import * as doctorService from '../doctor/doctor.service.js';

// 🔥 público
export const getAvailabilityByDoctor = async (req, res) => {
  try {
    const data = await availabilityService.getAvailabilityByDoctor(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔥 doctor logeado
export const getMyAvailability = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const data = await availabilityService.getAvailabilityByDoctor(doctor.id);
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔥 crear (seguro)
export const createAvailability = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const availability = await availabilityService.createAvailability({
      doctor_id: doctor.id, // 🔥 clave: NO viene del body
      day_of_week: req.body.day_of_week,
      start_time: req.body.start_time,
      end_time: req.body.end_time
    });

    res.status(201).json(availability);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🔥 eliminar
export const deleteAvailability = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const result = await availabilityService.deleteAvailability(
      req.params.id,
      doctor.id
    );

    res.json(result);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};