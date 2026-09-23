# Plan: Íconos para temas

## Resultado
- Incorporar una biblioteca amplia de íconos pixelados, coherente con el estilo visual de Chispa.
- Convertir el ícono junto al tiempo en un botón que abra un selector accesible y adaptable a celular.
- Guardar el ícono elegido al crear el tema y mostrarlo como imagen principal en la ficha del tema y en listados donde corresponda.

## Implementación
- Crear un catálogo reutilizable con nombres, categorías y dibujos pixel art, más búsqueda o agrupación para recorrer muchos íconos.
- Añadir el campo de ícono a los temas existentes mediante una actualización segura de la base de datos, con un valor predeterminado.
- Conectar el selector al formulario de creación y enviar el valor elegido al guardar.
- Reutilizar un componente único para renderizar los íconos de forma consistente.

## Verificación
- Probar la apertura, selección y cierre del selector en móvil y escritorio.
- Crear un tema de prueba y comprobar que el ícono persiste y aparece al volver a abrirlo.
- Confirmar que los temas anteriores siguen mostrando un ícono predeterminado.
