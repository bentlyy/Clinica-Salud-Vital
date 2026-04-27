import * as doctorService from './doctor.service.js';

export const getDoctors = async (req, res) => {
  try {
    const doctors = await doctorService.getAllDoctors();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const doctor = await doctorService.createDoctor(req.body);
    res.status(201).json(doctor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🔥 NUEVO: perfil del doctor logueado
export const getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};