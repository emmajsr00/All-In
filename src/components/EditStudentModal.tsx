import React, { useState } from 'react';
import { Edit3, Search, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import type { Student, AccommodationType } from '../types';
import { db } from '../db';

interface EditStudentModalProps {
  student: Student;
  onClose: () => void;
  onStudentUpdated: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  onClose,
  onStudentUpdated
}) => {
  const [idNumber, setIdNumber] = useState(student.idNumber);
  const [firstName, setFirstName] = useState(student.firstName);
  const [firstLastName, setFirstLastName] = useState(student.firstLastName);
  const [secondLastName, setSecondLastName] = useState(student.secondLastName || '');
  const [accommodation, setAccommodation] = useState<AccommodationType>(student.accommodation || 'NONE');
  const [parentContact, setParentContact] = useState(student.parentContact || '');
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  const formatWord = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const handleQueryHacienda = async () => {
    const cleanCedula = idNumber.replace(/[^0-9]/g, '');
    if (cleanCedula.length < 9) {
      setApiMessage({
        type: 'warning',
        text: 'La cédula debe tener al menos 9 dígitos para consultar en Hacienda.'
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
          }
          setApiMessage({
            type: 'success',
            text: `¡Nombre actualizado desde Hacienda!: ${rawFullName}`
          });
        }
      } else {
        setApiMessage({
          type: 'warning',
          text: 'No se encontraron datos en Hacienda. Puedes editar los campos manualmente.'
        });
      }
    } catch {
      setApiMessage({
        type: 'warning',
        text: 'Modo sin conexión. Puedes modificar los datos manualmente.'
      });
    } finally {
      setIsLoadingApi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idNumber.trim()) {
      alert('Debes ingresar la cédula o identificación.');
      return;
    }
    if (!firstLastName.trim() || !firstName.trim()) {
      alert('Debes ingresar al menos el primer apellido y el nombre.');
      return;
    }

    // Validar que la cédula no esté asignada a otro estudiante
    const clean = idNumber.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
    const allStudents = await db.students.toArray();
    const dup = allStudents.find(
      s => s.id !== student.id && s.idNumber.replace(/[^0-9a-zA-Z]/g, '').toLowerCase() === clean
    );
    if (dup) {
      alert(`No se puede modificar: La cédula ${idNumber} ya le pertenece a otro estudiante (${dup.firstLastName} ${dup.secondLastName || ''} ${dup.firstName}).`);
      return;
    }

    await db.students.update(student.id, {
      idNumber: idNumber.trim(),
      firstLastName: firstLastName.trim(),
      secondLastName: secondLastName.trim(),
      firstName: firstName.trim(),
      accommodation,
      parentContact: parentContact.trim() || undefined
    });

    onStudentUpdated();
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
      zIndex: 160,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1'
            }}>
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Editar Estudiante</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Modifica los datos personales o adecuación curricular
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Cédula y Búsqueda */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
              Cédula / Identificación:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)'
                }}
                required
              />
              <button
                type="button"
                onClick={handleQueryHacienda}
                disabled={isLoadingApi}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                title="Consultar API Hacienda para auto-actualizar nombres"
              >
                <Search size={14} />
                <span>{isLoadingApi ? 'Buscando...' : 'Hacienda'}</span>
              </button>
            </div>
          </div>

          {apiMessage && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: apiMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: apiMessage.type === 'success' ? '#10b981' : '#f59e0b',
              border: `1px solid ${apiMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              {apiMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{apiMessage.text}</span>
            </div>
          )}

          {/* Apellidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Primer Apellido:
              </label>
              <input
                type="text"
                value={firstLastName}
                onChange={(e) => setFirstLastName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Segundo Apellido:
              </label>
              <input
                type="text"
                value={secondLastName}
                onChange={(e) => setSecondLastName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Nombres */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
              Nombre(s):
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
              required
            />
          </div>

          {/* Adecuación Curricular */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
              Adecuación Curricular:
            </label>
            <select
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value as AccommodationType)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
            >
              <option value="NONE">Sin Adecuación Curricular</option>
              <option value="NON_SIGNIFICANT">No Significativa (Acompañamiento / Tiempo)</option>
              <option value="SIGNIFICANT">Significativa (Contenidos Priorizados)</option>
              <option value="ACCESS">De Acceso (Materiales Adaptados / Movilidad)</option>
            </select>
          </div>

          {/* Contacto Encargado */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
              Contacto de Encargado Legal / Teléfono:
            </label>
            <input
              type="text"
              placeholder="Ej: 8888-8888 / Mamá: María Pérez"
              value={parentContact}
              onChange={(e) => setParentContact(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
