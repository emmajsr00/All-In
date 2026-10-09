/**
 * Utilidad para consulta oficial de identificaciones costarricenses (Cédula de Identidad)
 * Realiza la búsqueda contra la API pública y desglosa nombres y apellidos.
 */

export interface CrIdLookupResult {
  success: boolean;
  fullName?: string;
  firstName?: string;
  firstLastName?: string;
  secondLastName?: string;
  error?: string;
}

const formatTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export async function queryCostaRicaId(cedula: string): Promise<CrIdLookupResult> {
  const cleanCedula = cedula.replace(/[^0-9]/g, '');
  if (cleanCedula.length < 9) {
    return {
      success: false,
      error: 'La identificación costarricense debe tener al menos 9 dígitos.'
    };
  }

  try {
    const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanCedula}`);
    if (!res.ok) {
      return {
        success: false,
        error: 'No se encontraron datos registrados para esta cédula.'
      };
    }

    const data = await res.json();
    if (data && data.nombre) {
      const rawFullName = String(data.nombre).trim();
      const tokens = rawFullName.split(/\s+/).filter(Boolean);

      let firstName = '';
      let firstLastName = '';
      let secondLastName = '';

      if (tokens.length >= 3) {
        secondLastName = formatTitleCase(tokens.pop()!);
        firstLastName = formatTitleCase(tokens.pop()!);
        firstName = formatTitleCase(tokens.join(' '));
      } else if (tokens.length === 2) {
        firstName = formatTitleCase(tokens[0]);
        firstLastName = formatTitleCase(tokens[1]);
        secondLastName = '';
      } else {
        firstName = formatTitleCase(rawFullName);
      }

      const formattedFullName = secondLastName
        ? `${firstName} ${firstLastName} ${secondLastName}`
        : firstLastName
        ? `${firstName} ${firstLastName}`
        : firstName;

      return {
        success: true,
        fullName: formattedFullName,
        firstName,
        firstLastName,
        secondLastName
      };
    }

    return {
      success: false,
      error: 'Respuesta vacía al consultar la identificación.'
    };
  } catch (err) {
    return {
      success: false,
      error: 'No se pudo conectar con el servicio de consulta (modo sin conexión disponible).'
    };
  }
}
