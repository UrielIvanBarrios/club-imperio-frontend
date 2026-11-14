-- Borra las personas de prueba que crean los tests E2E del front, con todo lo que cuelga de ellas.
-- Criterio: apellido 'TEST-FRONT' Y DNI de 8 dígitos que empieza con 99. Las dos condiciones a la vez,
-- para no tocar nunca una persona real.
--
-- Uso:  psql -h localhost -U postgres -d club_imperio -f scripts/sql/limpiar-personas-test-front.sql
--
-- Todo va en una transacción: si algo falla, no se borra nada.
-- Las FK hacia personas no tienen ON DELETE CASCADE, por eso se borra de las hojas a la raíz.

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE objetivo ON COMMIT DROP AS
  SELECT persona_id FROM personas
  WHERE apellido = 'TEST-FRONT' AND dni ~ '^99[0-9]{6}$';

\echo '== Antes'
SELECT (SELECT count(*) FROM objetivo)                                                   AS personas,
       (SELECT count(*) FROM membresias    WHERE persona_id IN (SELECT persona_id FROM objetivo)) AS membresias,
       (SELECT count(*) FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM objetivo)) AS inscripciones,
       (SELECT count(*) FROM clases_prueba WHERE persona_id IN (SELECT persona_id FROM objetivo)) AS clases_prueba;

DELETE FROM asistencias
  WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM objetivo));
DELETE FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM objetivo);
DELETE FROM clases_prueba WHERE persona_id IN (SELECT persona_id FROM objetivo);
DELETE FROM membresias    WHERE persona_id IN (SELECT persona_id FROM objetivo);
DELETE FROM personas      WHERE persona_id IN (SELECT persona_id FROM objetivo);

\echo '== Después (tiene que dar 0)'
SELECT count(*) AS personas_test_front_restantes FROM personas WHERE apellido = 'TEST-FRONT' AND dni ~ '^99[0-9]{6}$';

COMMIT;
