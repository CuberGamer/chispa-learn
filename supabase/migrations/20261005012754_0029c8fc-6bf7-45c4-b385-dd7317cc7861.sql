ALTER TABLE public.topics ADD COLUMN subject text NOT NULL DEFAULT 'General' CHECK (char_length(subject) BETWEEN 1 AND 40);
UPDATE public.topics SET subject = CASE title
 WHEN 'ADN y genética' THEN 'Biología' WHEN 'Célula eucariota' THEN 'Biología' WHEN 'Fotosíntesis' THEN 'Biología'
 WHEN 'Agujeros negros' THEN 'Física' WHEN 'Leyes de Newton' THEN 'Física' WHEN 'El sistema solar' THEN 'Física'
 WHEN 'arduino' THEN 'Tecnología' WHEN 'Inteligencia artificial' THEN 'Tecnología' WHEN 'Variables y funciones en programación' THEN 'Tecnología'
 WHEN 'Calentamiento global' THEN 'Geografía' WHEN 'El origen de los mapas' THEN 'Geografía'
 WHEN 'Derivadas' THEN 'Matemática' WHEN 'Fracciones y proporciones' THEN 'Matemática' WHEN 'Teorema de Pitágoras' THEN 'Matemática'
 WHEN 'Economía de mercado' THEN 'Economía'
 WHEN 'El Renacimiento' THEN 'Historia' WHEN 'La Revolución Francesa' THEN 'Historia' WHEN 'Primera Guerra Mundial' THEN 'Historia' WHEN 'Revolución de Mayo' THEN 'Historia' WHEN 'Segunda Guerra Mundial' THEN 'Historia'
 WHEN 'Martin Fierro' THEN 'Lengua y Literatura'
 WHEN 'Tabla periódica' THEN 'Química'
 ELSE 'General' END;