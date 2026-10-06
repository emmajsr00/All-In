import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, X, Check, Users } from 'lucide-react';
import type { Student } from '../types';
import { db } from '../db';

interface ImportStudentsModalProps {
  groupId: string;
  existingStudents: Student[];
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

interface ParsedStudentRow {
  idNumber: string;
  firstLastName: string;
  secondLastName: string;
  firstName: string;
  isValid: boolean;
  isDuplicate: boolean;
  statusNote: string;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  groupId,
  existingStudents,
  onClose,
  onImportComplete
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Procesar archivo Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];

        // Convertir a matriz de datos
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

        if (!rawData || rawData.length === 0) {
          alert('El archivo Excel está vacío.');
          setIsProcessing(false);
          return;
        }

        // Buscar fila de encabezados
        let headerRowIdx = -1;
        let colCedula = -1;
        let colApellido1 = -1;
        let colApellido2 = -1;
        let colNombre = -1;

        for (let r = 0; r < Math.min(rawData.length, 15); r++) {
          const row = rawData[r] || [];
          row.forEach((cell, cIdx) => {
            const str = String(cell || '').trim().toLowerCase();
            if (['cedula', 'cédula', 'identificacion', 'identificación', 'id'].includes(str)) {
              colCedula = cIdx;
              headerRowIdx = r;
            } else if (['primer apellido', 'apellido 1', 'apellido1', '1er apellido'].includes(str)) {
              colApellido1 = cIdx;
            } else if (['segundo apellido', 'apellido 2', 'apellido2', '2do apellido'].includes(str)) {
              colApellido2 = cIdx;
            } else if (['nombre', 'nombres'].includes(str)) {
              colNombre = cIdx;
            }
          });
          if (colCedula !== -1 && (colNombre !== -1 || colApellido1 !== -1)) {
            break;
          }
        }

        // Si no se encontraron encabezados por nombre, asumir formato MEP típico (Col 0=Cédula, 1=Apellido1, 2=Apellido2, 3=Nombre)
        if (headerRowIdx === -1 || colCedula === -1) {
          headerRowIdx = 0;
          colCedula = 0;
          colApellido1 = 1;
          colApellido2 = 2;
          colNombre = 3;
        }

        const allStudentsInDb = await db.students.toArray();
        const existingSet = new Set(allStudentsInDb.map(s => s.idNumber.replace(/[^0-9a-zA-Z]/g, '').toLowerCase()));
        const fileSet = new Set<string>();
        const list: ParsedStudentRow[] = [];

        for (let r = headerRowIdx + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.length === 0) continue;

          const rawId = String(row[colCedula] || '').trim();
          const cleanId = rawId.replace(/[^0-9a-zA-Z]/g, '');

          if (!cleanId || cleanId.length < 5) continue; // Ignorar filas vacías o subtítulos

          let a1 = String(row[colApellido1] || '').trim();
          let a2 = colApellido2 !== -1 ? String(row[colApellido2] || '').trim() : '';
          let nom = colNombre !== -1 ? String(row[colNombre] || '').trim() : '';

          // Si el nombre viene unificado en una sola columna y falta apellido
          if (!a1 && nom) {
            const parts = nom.split(/\s+/);
            if (parts.length >= 3) {
              a2 = parts.pop()!;
              a1 = parts.pop()!;
              nom = parts.join(' ');
            }
          }

          const normalizedId = cleanId.toLowerCase();
          const isDuplicate = existingSet.has(normalizedId) || fileSet.has(normalizedId);
          fileSet.add(normalizedId);

          const isValid = !!(cleanId && (nom || a1));

          list.push({
            idNumber: rawId,
            firstLastName: a1,
            secondLastName: a2,
            firstName: nom,
            isValid,
            isDuplicate,
            statusNote: isDuplicate
              ? 'Cédula ya registrada en el sistema'
              : !isValid
              ? 'Faltan datos requeridos'
              : 'Listo para importar'
          });
        }

        setParsedRows(list);
      } catch (err: any) {
        alert('Error al procesar el archivo Excel: ' + (err?.message || err));
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Guardar estudiantes válidos en la base de datos
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      alert('No hay estudiantes nuevos válidos para importar.');
      return;
    }

    const studentsToInsert: Student[] = validRows.map((r, idx) => ({
      id: `std-${Date.now()}-${idx}`,
      groupId,
      idNumber: r.idNumber.trim(),
      firstLastName: r.firstLastName.trim() || 'Estudiante',
      secondLastName: r.secondLastName.trim() || '',
      firstName: r.firstName.trim() || 'Sin Nombre',
      accommodation: 'NONE'
    }));

    await db.students.bulkAdd(studentsToInsert);

    // Inicializar detalles en sesiones existentes
    const sessions = await db.classSessions.toArray();
    if (sessions.length > 0) {
      const detailsToAdd: any[] = [];
      sessions.forEach(sess => {
        studentsToInsert.forEach(st => {
          detailsToAdd.push({
            id: `dtl-${sess.id}-${st.id}`,
            sessionId: sess.id,
            studentId: st.id,
            attendance: 'PRESENT',
            cotidianoLevel: 3
          });
        });
      });
      await db.sessionDetails.bulkAdd(detailsToAdd);
    }

    onImportComplete(studentsToInsert.length);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;

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
      zIndex: 150,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '680px',
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
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Importar Nómina de Estudiantes desde Excel</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Compatible con listas oficiales descargadas del MEP (.xlsx o .xls)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Zona de subida */}
        <div style={{
          border: '2px dashed var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          background: 'var(--bg-main)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer'
        }}>
          <UploadCloud size={36} color="#10b981" />
          <div>
            <label htmlFor="excel-file-input" style={{ fontWeight: 700, color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}>
              Haz clic para seleccionar el archivo de Excel
            </label>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Formato recomendado: Columnas Cédula, Primer Apellido, Segundo Apellido, Nombre.
            </span>
          </div>
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          {fileName && (
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
              Archivo cargado: {fileName}
            </div>
          )}
        </div>

        {/* Vista previa de estudiantes encontrados */}
        {parsedRows.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Estudiantes detectados ({parsedRows.length}) • <span style={{ color: '#10b981' }}>{validCount} listos para agregar</span>
              </span>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Cédula</th>
                    <th style={{ padding: '8px 10px' }}>Primer Apellido</th>
                    <th style={{ padding: '8px 10px' }}>Segundo Apellido</th>
                    <th style={{ padding: '8px 10px' }}>Nombre</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: r.isDuplicate ? 0.6 : 1 }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{r.idNumber}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.firstLastName}</td>
                      <td style={{ padding: '6px 10px' }}>{r.secondLastName}</td>
                      <td style={{ padding: '6px 10px' }}>{r.firstName}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {r.isDuplicate ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.7rem' }}>
                            Duplicado
                          </span>
                        ) : r.isValid ? (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.7rem' }}>
                            Válido
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.7rem' }}>
                            Incompleto
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={validCount === 0 || isProcessing}
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} />
            Importar {validCount} Estudiantes al Grupo
          </button>
        </div>
      </div>
    </div>
  );
};
