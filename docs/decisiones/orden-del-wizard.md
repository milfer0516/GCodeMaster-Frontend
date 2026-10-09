# Orden del wizard

Verificar en `CamWizardPage.tsx` / `camStore.ts` si hay dudas.

cargar → montaje → material → stock → contexto → operaciones → resumen →
simulacion → resultado

- NO existe paso `analisis`: la carga y el análisis están unidos en `cargar`.
- NO existe paso `maquina`: la máquina se registra en el onboarding y el wizard
  carga la primera máquina al entrar. `StepMaquina.tsx` existe pero NO está
  conectado a nada — no lo uses como si fuera un paso.
