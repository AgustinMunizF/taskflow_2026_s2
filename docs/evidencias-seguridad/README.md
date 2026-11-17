# Baseline local de TaskFlow

Corrida del 17/11/2026, ZAP 2.17.0, Java 24.0.1, macOS.
API en http://localhost:3000 y Vite en http://localhost:5173.
Plan ejecutado sobre la rama correcciones-entrega, a partir de acd5562.
Se usaron únicamente recursos públicos, sin cookies ni tokens de sesión.

Desde la raíz del repositorio, levantar la aplicación con `npm run dev`.
El plan usa rutas relativas para los reportes. Para ejecutar una distribución
Java cuyo launcher cambia de directorio, generar una copia temporal con la
ruta absoluta del destino:

```bash
python3 - <<'PY'
from pathlib import Path
source = Path('docs/evidencias-seguridad/zap-baseline.yaml')
target = source.parent.resolve()
plan = source.read_text().replace(
    'reportDir: docs/evidencias-seguridad',
    'reportDir: ' + str(target),
)
Path('/tmp/taskflow-zap-plan.yaml').write_text(plan)
PY

# Ajustar estas rutas a la instalación local de Java y ZAP.
JAVA_HOME=/ruta/al/jdk /ruta/a/ZAP/zap.sh \
  -cmd -dir /tmp/taskflow-zap-home \
  -autorun /tmp/taskflow-zap-plan.yaml
```

La ejecución genera HTML y JSON en esta carpeta. La salida terminó con
`Automation plan succeeded!`, después de procesar la cola pasiva.
El spider descubrió 436 URLs. El HTML incluye las URLs, evidencias, riesgos
y recomendaciones producidas por la herramienta.

La correlación con SEC-01 y SEC-02 está en
[el reporte de seguridad](../clase12-m2-reporte.md#7-baseline-zap).
