import React, { useState } from 'react';
import { UserPlus, Search, CheckCircle2, AlertCircle, X, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import type { Student, AccommodationType } from '../types';
import { db } from '../db';

interface AddStudentModalProps {
  groupId: string;
  existingStudents: Student[];
  onClose: () => void;
  onStudentAdded: (newStudent: Student) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  groupId,
  existingStudents,
  onClose,
  onStudentAdded
}) => {
  const [idNumber, setIdNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [firstLastName, setFirstLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [accommodation, setAccommodation] = useState<AccommodationType>('NONE');
  const [parentContact, setParentContact] = useState('');
  const [isForeigner, setIsForeigner] = useState(false); // DIMEX / Pasaporte

  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Formato tipo título (capitalizar nombres)
  const formatWord = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Comprobar proactivamente si la cédula ya existe en la base de datos
  const checkDuplicateCedula = async (rawCedula: string): Promise<boolean> => {
    const clean = rawCedula.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
    if (!clean || clean.length < 5) {
      setDuplicateWarning(null);
      return false;
    }

    const allStudents = await db.students.toArray();
    const existing = allStudents.find(
      s => s.idNumber.replace(/[^0-9a-zA-Z]/g, '').toLowerCase() === clean
    );

    if (existing) {
      setDuplicateWarning(
        `Esta identificación (${rawCedula}) ya está registrada a nombre de: ${existing.firstLastName} ${existing.secondLastName || ''} ${existing.firstName}. No se pueden registrar cédulas duplicadas.`
      );
      return true;
    } else {
      setDuplicateWarning(null);
      return false;
    }
  };

  // Consultar API de Hacienda de Costa Rica
  const handleQueryHacienda = async (overrideCedula?: string) => {
    const raw = overrideCedula || idNumber;
    const cleanCedula = raw.replace(/[^0-9]/g, '');

    const isDup = await checkDuplicateCedula(cleanCedula);
    if (isDup) return;

    if (cleanCedula.length < 9) {
      setApiMessage({
        type: 'warning',
        text: 'La identificación costarricense debe tener al menos 9 dígitos para consultar en Hacienda.'
      });
      return;
    }

    setIsLoadingApi(true);
    setApiMessage(null);

    try {
      const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanCedula}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.nombre) {
          const rawFullName = String(data.nombre).trim();
          const tokens = rawFullName.split(/\s+/);

          if (tokens.length >= 3) {
            const a2 = tokens.pop()!;
            const a1 = tokens.pop()!;
            const nombres = tokens.join(' ');
            setFirstLastName(formatWord(a1));
            setSecondLastName(formatWord(a2));
            setFirstName(formatWord(nombres));
          } else if (tokens.length === 2) {
            setFirstName(formatWord(tokens[0]));
            setFirstLastName(formatWord(tokens[1]));
            setSecondLastName('');
          } else {
            setFirstName(formatWord(rawFullName));
            setFirstLastName('');
            setSecondLastName('');
          }

          setApiMessage({
            type: 'success',
            text: `¡Datos encontrados en Hacienda!: ${rawFullName}`
          });
        } else {
          setApiMessage({
            type: 'warning',
            text: 'Respuesta vacía de Hacienda. Puedes digitar el nombre manualmente.'
          });
        }
      } else {
        setApiMessage({
          type: 'warning',
          text: 'Identificación no registrada en el padrón/tributario. Puedes completar los datos manualmente.'
        });
      }
    } catch {
      setApiMessage({
        type: 'warning',
        text: 'No se pudo conectar con la API de Hacienda (modo sin internet). Puedes digitar los datos manualmente.'
      });
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Validar y guardar estudiante
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCedula = idNumber.trim();
    if (!cleanCedula) {
      alert('Debes ingresar la cédula o identificación del estudiante.');
      return;
    }

    if (!firstLastName.trim() || !firstName.trim()) {
      alert('Debes ingresar al menos el primer apellido y el nombre del estudiante.');
      return;
    }

    // Validar duplicado en toda la base de datos
    const isDup = await checkDuplicateCedula(cleanCedula);
    if (isDup) {
      alert(`No se puede guardar: Ya existe un estudiante registrado con la cédula ${cleanCedula} en el sistema.`);
      return;
    }

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      groupId,
      idNumber: cleanCedula,
      firstLastName: firstLastName.trim(),
      secondLastName: secondLastName.trim(),
      firstName: firstName.trim(),
      accommodation,
      parentContact: parentContact.trim() || undefined
    };

    // Agregar a la base de datos Dexie
    await db.students.add(newStudent);

    // Inicializar detalles en las sesiones existentes del grupo para que aparezca calificado/presente
    const sessions = await db.classSessions.toArray();
    const groupSessions = sessions.filter(s => {
      // Si la sesión pertenece a alguna asignación de este grupo
      return true;
    });

    if (groupSessions.length > 0) {
      const detailsToAdd = groupSessions.map(sess => ({
        id: `dtl-${sess.id}-${newStudent.id}`,
        sessionId: sess.id,
        studentId: newStudent.id,
        attendance: 'PRESENT' as const,
        cotidianoLevel: 3 as const
      }));
      await db.sessionDetails.bulkAdd(detailsToAdd);
    }

    onStudentAdded(newStudent);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(79, 70, 229, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5'
            }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Agregar Nuevo Estudiante</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Consulta oficial de Hacienda de Costa Rica y registro manual
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Campo Cédula con Botón de Búsqueda de Hacienda */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                Cédula o Identificación {isForeigner ? '(DIMEX / Extranjero)' : '(Nacional 9 dígitos)'}:
              </label>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isForeigner}
                  onChange={(e) => setIsForeigner(e.target.checked)}
                />
                Es extranjero (DIMEX / Pasaporte)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={isForeigner ? "Ej. 155800012345 (DIMEX)" : "Ej. 208120021 o 2-0812-0021"}
                value={idNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdNumber(val);
                  checkDuplicateCedula(val);
                  // Si escribe 9 dígitos puros y no es extranjero, sugerir o auto-buscar
                  const clean = val.replace(/[^0-9]/g, '');
                  if (clean.length === 9 && !isForeigner && !firstName) {
                    handleQueryHacienda(clean);
                  }
                }}
                onBlur={() => checkDuplicateCedula(idNumber)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="button"
                onClick={() => handleQueryHacienda()}
                disabled={isLoadingApi || !idNumber.trim() || !!duplicateWarning}
                className="btn btn-primary"
                style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Consultar nombre y apellidos en la API de Hacienda"
              >
                {isLoadingApi ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Buscar en Hacienda</span>
                  </>
                )}
              </button>
            </div>

            {/* Aviso de Cédula Duplicada */}
            {duplicateWarning && (
              <div style={{
                marginTop: '8px',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600
              }}>
                <AlertTriangle size={17} style={{ flexShrink: 0 }} />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Tip: Al digitar los 9 dígitos se consulta automáticamente a la API oficial de Hacienda.
            </span>
          </div>

          {/* Banner de Mensaje de API */}
          {apiMessage && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: apiMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${apiMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              color: apiMessage.type === 'success' ? '#10b981' : '#f59e0b'
            }}>
              {apiMessage.type === 'success' ? <Sparkles size={16} /> : <AlertTriangle size={16} />}
              <span>{apiMessage.text}</span>
            </div>
          )}

          {/* Campos de Apellidos y Nombre (Habilitados para edición o ingreso manual) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Primer Apellido: *
              </label>
              <input
                type="text"
                placeholder="Ej. Salazar"
                value={firstLastName}
                onChange={(e) => setFirstLastName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Segundo Apellido:
              </label>
              <input
                type="text"
                placeholder="Ej. Richmond"
                value={secondLastName}
                onChange={(e) => setSecondLastName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Nombre(s): *
            </label>
            <input
              type="text"
              placeholder="Ej. Emmanuel Josué"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontWeight: 600
              }}
            />
          </div>

          {/* Información Adicional: Adecuación y Contacto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Adecuación Curricular:
              </label>
              <select
                value={accommodation}
                onChange={(e) => setAccommodation(e.target.value as AccommodationType)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem'
                }}
              >
                <option value="NONE">Ninguna</option>
                <option value="NON_SIGNIFICANT">No Significativa (Apoyo)</option>
                <option value="SIGNIFICANT">Significativa (Adaptación)</option>
                <option value="ACCESS">De Acceso (Física / Sensorial)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Contacto de Encargado (Teléfono/Nombre):
              </label>
              <input
                type="text"
                placeholder="Ej. 8888-9999 / Madre"
                value={parentContact}
                onChange={(e) => setParentContact(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!!duplicateWarning || isLoadingApi}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: duplicateWarning ? 0.6 : 1,
                cursor: duplicateWarning ? 'not-allowed' : 'pointer'
              }}
            >
              <CheckCircle2 size={16} />
              Guardar Estudiante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
