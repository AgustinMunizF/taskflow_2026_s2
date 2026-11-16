// Mide GET /api/projects, el listado de proyectos.
//
// Existe por separado del listado de tareas porque la especificación, en los
// requerimientos no funcionales, exige que NINGÚN endpoint de listado devuelva
// la colección completa sin límite (Rendimiento, criterio 1). Este endpoint no
// acepta limit ni offset: devuelve todos los proyectos del usuario.
//
//   k6 run -e VUS=1 -e DURATION=20s performance/scenarios/projects-list.k6.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '20s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const login = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: 'ana@test.com', password: 'Password1' }),
    { headers: JSON_HEADERS }
  );
  check(login, { 'login 200': (r) => r.status === 200 });
  return { headers: { Authorization: `Bearer ${login.json().token}` } };
}

export default function (data) {
  const res = http.get(`${BASE}/projects`, { headers: data.headers });
  const list = res.json();
  check(res, {
    'status 200': (r) => r.status === 200,
    // Si la respuesta es un array plano, no hay paginación posible.
    'la respuesta viene paginada': () => !Array.isArray(list),
  });
  sleep(1);
}
