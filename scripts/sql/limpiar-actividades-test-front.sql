-- Borra las actividades de prueba que crean los tests E2E del front, con todo lo que cuelga de ellas.
-- Criterio: nombre que empieza con 'TEST-FRONT ' (las actividades reales del club no empiezan así).
--
-- Uso:  psql -h localhost -U postgres -d club_imperio -f scripts/sql/limpiar-actividades-test-front.sql
--
-- Todo va en una transacción: si algo falla, no se borra nada.
-- Las FK no tienen ON DELETE CASCADE, por eso se borra de las hojas a la raíz:
--   asistencias → inscripciones → comisiones → actividad (y clases_prueba → actividad).
-- Las personas de prueba se borran con limpiar-personas-test-front.sql.

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE objetivo ON COMMIT DROP AS
  SELECT actividad_id FROM actividades WHERE nombre LIKE 'TEST-FRONT %';
CREATE TEMP TABLE objetivo_comisiones ON COMMIT DROP AS
  SELECT comision_id FROM comisiones WHERE actividad_id IN (SELECT actividad_id FROM objetivo);

\echo '== Antes'
SELECT (SELECT count(*) FROM objetivo)            AS actividades,
       (SELECT count(*) FROM objetivo_comisiones) AS comisiones,
       (SELECT count(*) FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM objetivo_comisiones)) AS inscripciones,
       (SELECT count(*) FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM objetivo)) AS clases_prueba;

DELETE FROM asistencias
  WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM objetivo_comisiones));
DELETE FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM objetivo_comisiones);
DELETE FROM comisiones    WHERE comision_id IN (SELECT comision_id FROM objetivo_comisiones);
DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM objetivo);
DELETE FROM actividades   WHERE actividad_id IN (SELECT actividad_id FROM objetivo);

\echo '== Después (tiene que dar 0)'
SELECT count(*) AS actividades_test_front_restantes FROM actividades WHERE nombre LIKE 'TEST-FRONT %';

COMMIT;
