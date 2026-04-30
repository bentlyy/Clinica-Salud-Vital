// exception.controller.js
import * as exceptionService from './exception.service.js';
import * as doctorService from '../doctor/doctor.service.js';

export const getMyExceptions = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const data = await exceptionService.getExceptionsByDoctor(doctor.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createException = async (req, res) => {
  try {
    const { date, start_time, end_time, is_full_day } = req.body;

    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const data = await exceptionService.createException({
      doctor_id: doctor.id,
      date,
      start_time,
      end_time,
      is_full_day
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteException = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const data = await exceptionService.deleteException(
      parseInt(req.params.id),
      doctor.id
    );
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};