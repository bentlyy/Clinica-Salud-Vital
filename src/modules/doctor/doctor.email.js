export const doctorCredentialsEmail = ({ name, email, password, loginUrl }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Bienvenido/a, ${name}</h2>
      <p>Tu cuenta de doctor ha sido creada en <strong>Clínica Salud Vital</strong>. A continuación tus credenciales de acceso:</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 8px 0;"><strong>Contraseña temporal:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
      </div>

      <p style="text-align: center;">
        <a href="${loginUrl}" style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Iniciar sesión
        </a>
      </p>

      <p style="color: #e53935; font-size: 13px;">
        ⚠️ Por tu seguridad, te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.
      </p>
    </div>
  `;
};
