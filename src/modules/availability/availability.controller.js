import * as availabilityService from './availability.service.js';
import * as doctorService from '../doctor/doctor.service.js';

// 🔥 PUBLICO → ver disponibilidad de un doctor (para pacientes)
export const getAvailabilityByDoctor = async (req, res) => {
  try {
    const doctorId = parseInt(req.params.id);

    if (!doctorId) {
      return res.status(400).json({ error: 'Invalid doctor id' });
    }

    const data = await availabilityService.getAvailabilityByDoctor(doctorId);

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔥 DOCTOR LOGEADO → su propia disponibilidad
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

// 🔥 CREAR DISPONIBILIDAD (seguro, sin doctor_id en body)
export const createAvailability = async (req, res) => {
  try {
    const { day_of_week, start_time, end_time } = req.body;

    if (day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const availability = await availabilityService.createAvailability({
      doctor_id: doctor.id, // 🔥 SIEMPRE desde backend
      day_of_week,
      start_time,
      end_time
    });

    res.status(201).json(availability);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🔥 ELIMINAR DISPONIBILIDAD (seguro)
export const deleteAvailability = async (req, res) => {
  try {
    const availabilityId = parseInt(req.params.id);

    if (!availabilityId) {
      return res.status(400).json({ error: 'Invalid availability id' });
    }

    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const result = await availabilityService.deleteAvailability(
      availabilityId,
      doctor.id
    );

    res.json(result);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};