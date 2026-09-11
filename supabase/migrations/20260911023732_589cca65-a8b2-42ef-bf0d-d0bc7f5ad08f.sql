INSERT INTO public.tags (name) VALUES
  ('ciencia'),('historia'),('arte'),('tecnologia'),('salud'),('sociedad'),('naturaleza'),('mente')
ON CONFLICT DO NOTHING;

INSERT INTO public.achievements (name, description, icon) VALUES
  ('Primera chispa', 'Completaste tu primera sesión de estudio', 'sparkles'),
  ('Diez temas', 'Investigaste 10 temas distintos', 'book'),
  ('Racha de 7', 'Estudiaste 7 días seguidos', 'fire'),
  ('Maratón', 'Acumulaste 300 minutos de estudio', 'clock'),
  ('Explicador', 'Escribiste una explicación de más de 1000 caracteres', 'pencil')
ON CONFLICT DO NOTHING;

WITH nuevos AS (
  INSERT INTO public.topics (title, description, duration_suggested, source) VALUES
    ('El efecto Dunning-Kruger', 'Por qué quienes menos saben de un tema suelen sentirse más seguros, y cómo detectarlo en uno mismo.', 15, 'curado'),
    ('Cómo funciona internet', 'El viaje de un dato desde tu compu hasta un servidor del otro lado del mundo.', 15, 'curado'),
    ('La biblioteca de Alejandría', 'Qué guardaba, cómo se perdió y qué mitos rodean su destrucción.', 15, 'curado'),
    ('Fotosíntesis', 'Cómo las plantas convierten luz en energía y por qué sostiene casi toda la vida.', 5, 'curado'),
    ('El impresionismo', 'La revolución de pintar la luz y el instante en lugar del detalle.', 15, 'curado'),
    ('Criptografía de clave pública', 'Cómo dos desconocidos pueden acordar un secreto a la vista de todos.', 30, 'curado'),
    ('El sueño y la memoria', 'Qué hace tu cerebro mientras dormís y por qué dormir mal arruina el aprendizaje.', 15, 'curado'),
    ('Inflación', 'Qué la provoca, cómo se mide y por qué afecta distinto a cada persona.', 30, 'curado'),
    ('Los agujeros negros', 'Qué son, cómo se forman y qué pasa en el horizonte de sucesos.', 15, 'curado'),
    ('La Revolución Industrial', 'Cómo la máquina de vapor cambió el trabajo, las ciudades y el tiempo libre.', 30, 'curado'),
    ('El microbioma intestinal', 'Los billones de bacterias que viven en vos y su relación con el ánimo.', 15, 'curado'),
    ('Sesgos cognitivos', 'Atajos mentales que nos hacen equivocar sistemáticamente al decidir.', 15, 'curado'),
    ('Cómo aprenden las máquinas', 'Idea básica del aprendizaje automático sin fórmulas complicadas.', 30, 'curado'),
    ('El ciclo del agua', 'Evaporación, nubes y lluvia: el sistema de reciclaje del planeta.', 5, 'curado'),
    ('La imprenta de Gutenberg', 'Cómo abaratar libros cambió la religión, la ciencia y la política.', 15, 'curado'),
    ('Música y cerebro', 'Por qué una canción puede erizarte la piel y traerte recuerdos.', 15, 'curado'),
    ('Energías renovables', 'Solar, eólica e hidráulica: ventajas, límites y almacenamiento.', 30, 'curado'),
    ('El lenguaje de los árboles', 'Redes de hongos que conectan raíces y transportan nutrientes.', 15, 'curado'),
    ('Teoría de juegos', 'El dilema del prisionero y por qué cooperar a veces conviene.', 30, 'curado'),
    ('Primeros auxilios básicos', 'Qué hacer en los primeros minutos ante una emergencia común.', 5, 'curado')
  RETURNING id, title
)
INSERT INTO public.topic_tags (topic_id, tag_id)
SELECT n.id, t.id
FROM nuevos n
JOIN LATERAL (
  VALUES
    ('El efecto Dunning-Kruger','mente'),('El efecto Dunning-Kruger','sociedad'),
    ('Cómo funciona internet','tecnologia'),
    ('La biblioteca de Alejandría','historia'),
    ('Fotosíntesis','ciencia'),('Fotosíntesis','naturaleza'),
    ('El impresionismo','arte'),('El impresionismo','historia'),
    ('Criptografía de clave pública','tecnologia'),('Criptografía de clave pública','ciencia'),
    ('El sueño y la memoria','salud'),('El sueño y la memoria','mente'),
    ('Inflación','sociedad'),
    ('Los agujeros negros','ciencia'),
    ('La Revolución Industrial','historia'),('La Revolución Industrial','sociedad'),
    ('El microbioma intestinal','salud'),('El microbioma intestinal','ciencia'),
    ('Sesgos cognitivos','mente'),
    ('Cómo aprenden las máquinas','tecnologia'),
    ('El ciclo del agua','naturaleza'),('El ciclo del agua','ciencia'),
    ('La imprenta de Gutenberg','historia'),
    ('Música y cerebro','arte'),('Música y cerebro','mente'),
    ('Energías renovables','tecnologia'),('Energías renovables','naturaleza'),
    ('El lenguaje de los árboles','naturaleza'),
    ('Teoría de juegos','sociedad'),('Teoría de juegos','mente'),
    ('Primeros auxilios básicos','salud')
) AS m(titulo, etiqueta) ON m.titulo = n.title
JOIN public.tags t ON t.name = m.etiqueta
ON CONFLICT DO NOTHING;