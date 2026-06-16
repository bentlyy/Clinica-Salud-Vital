import { StitchToolClient } from '@google/stitch-sdk';

const client = new StitchToolClient({ apiKey: process.env.STITCH_API_KEY });

const PROJECT_ID = '16584180723909199819';
const DS = 'assets/255404400465752763';

const screens = [
  {
    title: 'Login Page',
    prompt: `Login page for "Salud Vital" clinic management system.
Design a clean, minimalist login page with:
- Left side: large background image of a modern medical clinic reception (soft blue tones)
- Right side: white card with the clinic logo "Salud Vital" at top, tagline "Tu salud, nuestra prioridad"
- Email and password input fields with icons, blue focus borders
- "Iniciar Sesión" primary button (blue #1565C0)
- Link to "¿Olvidaste tu contraseña?" below
- Link to "Registrarse" for new users
- reCAPTCHA badge at bottom right
- Clean white background, subtle shadows, elegant typography
- Professional medical feel with blue (#1565C0) as primary color`
  },
  {
    title: 'Admin Dashboard',
    prompt: `Admin dashboard for "Salud Vital" clinic management system.
Design a clean analytics dashboard with:
- Top navbar: clinic logo left, search bar center, notification bell + user avatar right
- Left sidebar: collapsed thin nav with icons (Dashboard, Citas, Doctores, Pacientes, Facturación, Laboratorio, Configuración, ML Analytics)
- Main area: top row of 4 stat cards in a grid (Total Pacientes: 1,247, Citas Hoy: 38, Ingresos Mes: $45,200, Predicción No-Show: 12%)
- Second row: bar chart "Citas por Día" (Mon-Sun) and line chart "Ingresos Semanales"
- Third row: table "Próximas Citas" with columns (Paciente, Doctor, Fecha, Hora, Estado)
- Blue (#1565C0) primary, white backgrounds, cards with subtle shadows
- Clean data visualization, elegant and professional medical dashboard feel`
  },
  {
    title: 'Doctor Panel - Agenda',
    prompt: `Doctor agenda/calendar panel for "Salud Vital" clinic management system.
Design a doctor's daily agenda view with:
- Top: doctor name and specialty, today's date prominently displayed
- Left: weekly calendar view (Mon-Fri columns) with time slots 08:00-18:00
- Right: selected day's appointment list with patient cards
- Each appointment card shows: patient name, time, reason, status indicator (confirmed/pending/cancelled)
- Blue (#1565C0) accent color for headers and active elements
- Clean white background, minimalist card design
- "Nueva Cita" floating action button (blue)
- Filter buttons: Todas | Confirmadas | Pendientes | Canceladas
- Professional medical scheduling interface`
  },
  {
    title: 'Patient Booking Page',
    prompt: `Patient appointment booking page for "Salud Vital" clinic management system.
Design a step-by-step booking flow with:
- Step indicator at top: 1.Especialidad → 2.Doctor → 3.Fecha → 4.Confirmar
- Step 2 shown as active: grid of doctor cards with photo, name, specialty, rating stars, available badge
- Right side: summary card showing selected doctor info
- Clean white card layout, blue (#1565C0) accent for selected items
- Minimalist design with plenty of whitespace
- Professional medical booking experience`
  },
  {
    title: 'Patient List - Users Management',
    prompt: `Patient management list for "Salud Vital" clinic management system (admin view).
Design a clean data table page with:
- Top: "Pacientes" title with "Nuevo Paciente" button (blue)
- Search bar with filter dropdown (Todos los roles, Activo/Inactivo)
- Table columns: Nombre, RUT, Email, Teléfono, Última Visita, Estado (Activo/Inactivo badge)
- Pagination at bottom
- Blue (#1565C0) header row, alternating white/light gray rows
- Status badges: green for Activo, gray for Inactivo
- Clean professional admin interface`
  }
];

for (const screen of screens) {
  console.log(`\n=== Generating: ${screen.title} ===`);
  try {
    const result = await client.callTool('generate_screen_from_text', {
      projectId: PROJECT_ID,
      designSystem: DS,
      deviceType: 'DESKTOP',
      modelId: 'GEMINI_3_1_PRO',
      prompt: screen.prompt
    });
    console.log(`Screen generated: ${screen.title}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error generating ${screen.title}:`, err.message);
  }
}
